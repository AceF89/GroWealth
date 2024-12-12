use crate::{ constant::*, error::*, state::*, events::* };
use anchor_lang::prelude::*;
// use anchor_spl::token::{ self as spl_token, Mint, Token, TokenAccount, TransferChecked };
use anchor_spl::token_interface::{ Mint, TransferChecked, Token2022, TokenAccount };
use anchor_spl::associated_token::AssociatedToken;

pub fn purchase_token_handler(ctx: Context<PurchaseToken>, token_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;

    let payment_decimal_value = (10u64).pow(ctx.accounts.payment_mint.decimals as u32);

    let token_decimal_value = (10u64).pow(ctx.accounts.token_mint.decimals as u32);
    let decimal = token_decimal_value / payment_decimal_value;

    require!(
        current_unix_timestamp >= ctx.accounts.presale_account.start_time &&
            current_unix_timestamp <= ctx.accounts.presale_account.end_time,
        PresaleErrorCodes::InvalidTime
    );

    // check token_amount is within the buyable range
    require!(
        token_amount * decimal >= ctx.accounts.presale_account.minimum_buyable_amount &&
            token_amount <= ctx.accounts.presale_account.maximum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );

    // collect the payment of token

    let payment_amount =
        ctx.accounts.presale_account.token_price_in_usdc * (token_amount / token_decimal_value);
    msg!("Payment amount: {}", (payment_amount as f64) / (payment_decimal_value as f64));

    anchor_spl::token_interface::transfer_checked(
        ctx.accounts.transfer_usdc_payment_to_creator(),
        payment_amount,
        ctx.accounts.payment_mint.decimals
    )?;

    msg!("Payment Done");

    // now transfer the tokens from presale to buyer account
    let bump = ctx.accounts.presale_account.bump;

    anchor_spl::token_interface::transfer_checked(
        ctx.accounts.transfer_presale_token_to_buyer().with_signer(&[&[PRESALE_SEED, &[bump]]]),
        token_amount,
        ctx.accounts.token_mint.decimals
    )?;
    msg!("Token baught successfully");
    ctx.accounts.presale_account.total_tokens -= token_amount;

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

    /// CHECK: Transaction will be signed by saved signers
    #[account(mut,signer)]
    pub buyer: AccountInfo<'info>,

    #[account(mut,seeds = [PRESALE_SEED], bump)]
    pub presale_account: Box<Account<'info, PresaleAccount>>,

    // buyer will receive token in this account
    #[account(
        init_if_needed,
        payer = fee_payer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub buyer_payment_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // buyer will purchase token from this account
    #[account(  
        mut,
    )]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [PRESALE_SEED, PROGRAM_DATA_SEED], 
        bump = presale_program_data.bump
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    #[account(
            mut, 
            constraint = token_mint.key().as_ref() == presale_program_data.token_mint.as_ref()
            @PresaleErrorCodes::InvalidMintedToken,
        )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [CREATOR_SEED, creator_account.creator.key().as_ref()],
        bump,
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,

    #[account(
        mut,
    )]
    pub creator_payment_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> PurchaseToken<'info> {
    pub fn transfer_presale_token_to_buyer(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_account = TransferChecked {
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
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_account = TransferChecked {
            from: self.buyer_payment_ata.to_account_info(),
            mint: self.payment_mint.to_account_info(),
            to: self.creator_payment_token_ata.to_account_info(),
            authority: self.buyer.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_account)
    }
}
