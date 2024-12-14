use crate::{ constant::*, error::*, state::*, events::* };
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

// For Presale Token (Token-2022)
use anchor_spl::token_interface::{
    Mint as Mint2022,
    TokenAccount as TokenAccount2022,
    Token2022,
    TransferChecked as TransferChecked2022,
};

// For USDC (original SPL Token)
use anchor_spl::token::{
    Mint as MintLegacy,
    Token as TokenLegacy,
    TokenAccount as TokenAccountLegacy,
    TransferChecked as TransferCheckedLegacy,
};

pub fn purchase_token_handler(ctx: Context<PurchaseToken>, token_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;

    // Payment (USDC) decimals
    let payment_decimal_value = (10u64).pow(ctx.accounts.payment_mint.decimals as u32);

    // Presale token (Token-2022) decimals
    let token_decimal_value = (10u64).pow(ctx.accounts.token_mint.decimals as u32);

    require!(
        current_unix_timestamp >= ctx.accounts.presale_account.start_time &&
            current_unix_timestamp <= ctx.accounts.presale_account.end_time,
        PresaleErrorCodes::InvalidTime
    );

    // Check token_amount is within the buyable range
    require!(
        token_amount >= ctx.accounts.presale_account.minimum_buyable_amount &&
            token_amount <= ctx.accounts.presale_account.maximum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );

    // Calculate the USDC payment amount
    let payment_amount =
        ctx.accounts.presale_account.token_price_in_usdc * (token_amount / token_decimal_value);
    msg!("Payment amount: {}", (payment_amount as f64) / (payment_decimal_value as f64));

    // Ensure payment_amount is greater than 0
    require!(payment_amount > 0, PresaleErrorCodes::ZeroPaymentAmount);

    if payment_amount > 0 {
        // Transfer USDC payment from buyer to creator
        anchor_spl::token::transfer_checked(
            ctx.accounts.transfer_usdc_payment_to_creator(),
            payment_amount,
            ctx.accounts.payment_mint.decimals
        )?;
        msg!("Payment Done");

        // Now transfer the presale tokens (Token-2022) from presale to buyer
        let bump = ctx.accounts.presale_account.bump;
        anchor_spl::token_interface::transfer_checked(
            ctx.accounts.transfer_presale_token_to_buyer().with_signer(&[&[PRESALE_SEED, &[bump]]]),
            token_amount,
            ctx.accounts.token_mint.decimals
        )?;
        msg!("Token bought successfully");

        ctx.accounts.presale_account.total_tokens -= token_amount;
    } else {
    }

    emit!(PurchaseTokenEvent {
        buyer: ctx.accounts.buyer.key(),
        bought_token_amount: token_amount,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct PurchaseToken<'info> {
    #[account(mut)]
    pub fee_payer: Signer<'info>,

    /// CHECK: Transaction will be signed by the buyer externally (front-end)
    #[account(mut, signer)]
    pub buyer: AccountInfo<'info>,

    #[account(mut, seeds = [PRESALE_SEED], bump)]
    pub presale_account: Box<Account<'info, PresaleAccount>>,

    // The buyer receives the Token-2022 token in this account
    #[account(
        init_if_needed,
        payer = fee_payer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_ata: Box<InterfaceAccount<'info, TokenAccount2022>>,

    // Buyer's USDC payment account (original token)
    #[account(mut)]
    pub buyer_payment_ata: Account<'info, TokenAccountLegacy>,

    // Presale's token-2022 source account
    #[account(mut)]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount2022>>,

    #[account(
        mut,
        seeds = [PRESALE_SEED, PROGRAM_DATA_SEED],
        bump = presale_program_data.bump
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    // Token-2022 mint for the presale token
    #[account(
        mut,
        constraint = token_mint.key().as_ref() == presale_program_data.token_mint.as_ref() 
            @ PresaleErrorCodes::InvalidMintedToken
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint2022>>,

    // USDC payment mint (original token)
    #[account(mut)]
    pub payment_mint: Account<'info, MintLegacy>,

    #[account(
        mut,
        seeds = [CREATOR_SEED, creator_account.creator.key().as_ref()],
        bump
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,

    // Creator USDC receiving ATA (original token)
    #[account(mut)]
    pub creator_payment_token_ata: Account<'info, TokenAccountLegacy>,

    // Program for Token-2022 transfers (presale token)
    pub token_program: Program<'info, Token2022>,

    // Program for Associated Token Accounts
    pub associated_token_program: Program<'info, AssociatedToken>,

    // Program for system account
    pub system_program: Program<'info, System>,

    // Rent sysvar
    pub rent: Sysvar<'info, Rent>,

    // ADD the original token program for USDC transfers
    #[account(address = anchor_spl::token::ID)]
    pub token_program_usdc: Program<'info, TokenLegacy>,
}

impl<'info> PurchaseToken<'info> {
    pub fn transfer_presale_token_to_buyer(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked2022<'info>> {
        let cpi_account = TransferChecked2022 {
            from: self.presale_token_ata.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.buyer_token_ata.to_account_info(),
            authority: self.presale_account.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_account)
    }

    pub fn transfer_usdc_payment_to_creator(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, TransferCheckedLegacy<'info>> {
        let cpi_account = TransferCheckedLegacy {
            from: self.buyer_payment_ata.to_account_info(),
            mint: self.payment_mint.to_account_info(),
            to: self.creator_payment_token_ata.to_account_info(),
            authority: self.buyer.to_account_info(),
        };
        let cpi_program = self.token_program_usdc.to_account_info();
        CpiContext::new(cpi_program, cpi_account)
    }
}
