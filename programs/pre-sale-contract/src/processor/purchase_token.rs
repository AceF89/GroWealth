use crate::{ constant::*, error::*, state::*, events::* };
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::spl_token_2022::state::AccountState;
use anchor_spl::token_interface::{
    Mint as Mint2022,
    TokenAccount as TokenAccount2022,
    Token2022,
    TransferChecked as TransferChecked2022,
    thaw_account,
};
use anchor_spl::token::{
    Mint as MintLegacy,
    Token as TokenLegacy,
    TokenAccount as TokenAccountLegacy,
    TransferChecked as TransferCheckedLegacy,
};
#[inline(never)]
pub fn purchase_token_handler(ctx: Context<PurchaseToken>, token_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;
    require!(
        current_unix_timestamp >= ctx.accounts.presale_account.start_time &&
            current_unix_timestamp <= ctx.accounts.presale_account.end_time,
        PresaleErrorCodes::InvalidTime
    );
    require!(
        token_amount <= ctx.accounts.presale_account.total_tokens,
        PresaleErrorCodes::InsufficientPresaleTokens
    );
    let token_decimal_value = (10u128).pow(ctx.accounts.token_mint.decimals as u32);
    require!(
        token_amount >= ctx.accounts.presale_account.minimum_buyable_amount &&
            token_amount <= ctx.accounts.presale_account.maximum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );
    let price_in_usdc_base = ctx.accounts.presale_account.token_price_in_usdc as u128;
    let token_amount_u128 = token_amount as u128;
    let payment_amount_u128 = price_in_usdc_base
        .checked_mul(token_amount_u128)
        .ok_or(PresaleErrorCodes::InvalidCalculation)?
        .checked_div(token_decimal_value)
        .ok_or(PresaleErrorCodes::InvalidCalculation)?;
    let payment_amount = payment_amount_u128 as u64;
    require!(payment_amount > 0, PresaleErrorCodes::ZeroPaymentAmount);
    let buyer_ata_state = ctx.accounts.buyer_token_ata.state;
    if buyer_ata_state == AccountState::Frozen {
        let cpi_thaw_accounts = anchor_spl::token_interface::ThawAccount {
            account: ctx.accounts.buyer_token_ata.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            authority: ctx.accounts.freeze_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info(); // Token-2022 program
        let cpi_thaw_ctx = CpiContext::new(cpi_program, cpi_thaw_accounts);
        thaw_account(cpi_thaw_ctx)?;
    }
    anchor_spl::token::transfer_checked(
        ctx.accounts.transfer_usdc_payment_to_creator(),
        payment_amount,
        ctx.accounts.payment_mint.decimals
    )?;
    let bump = ctx.accounts.presale_account.bump;
    anchor_spl::token_interface::transfer_checked(
        ctx.accounts.transfer_presale_token_to_buyer().with_signer(&[&[PRESALE_SEED, &[bump]]]),
        token_amount,
        ctx.accounts.token_mint.decimals
    )?;
    let cpi_accounts = anchor_spl::token_interface::FreezeAccount {
        account: ctx.accounts.buyer_token_ata.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        authority: ctx.accounts.freeze_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info(); // Token-2022 program
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token_interface::freeze_account(cpi_ctx)?;
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
    /// CHECK: Transaction will be signed by the buyer externally (front-end)
    #[account(mut, signer)]
    pub buyer: AccountInfo<'info>,
    /// CHECK: Creator used to verify payment ATA authority
    #[account(mut,
        constraint = creator_authority.key().as_ref() == creator_account.creator.key().as_ref() 
        @ PresaleErrorCodes::Unauthorized
    )]
    pub creator_authority: AccountInfo<'info>,
    #[account(mut, seeds = [PRESALE_SEED], bump)]
    pub presale_account: Box<Account<'info, PresaleAccount>>,
    #[account(
        init_if_needed,
        payer = fee_payer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_ata: Box<InterfaceAccount<'info, TokenAccount2022>>,
    #[account(mut,
        constraint = buyer_payment_ata.mint.key().to_string() == USDC_TEST_MINT_PUBKEY_STR 
        @ PresaleErrorCodes::InvalidPaymentMint
    )]
    pub buyer_payment_ata: Account<'info, TokenAccountLegacy>,
    #[account(mut)]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount2022>>,
    #[account(
        mut,
        seeds = [PRESALE_SEED, PROGRAM_DATA_SEED],
        bump = presale_program_data.bump
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,
    #[account(
        mut,
        constraint = token_mint.key().as_ref() == presale_program_data.token_mint.as_ref() 
            @ PresaleErrorCodes::InvalidMintedToken
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint2022>>,
    #[account( 
        mut,
        constraint = payment_mint.key().to_string() == USDC_TEST_MINT_PUBKEY_STR 
        @ PresaleErrorCodes::InvalidPaymentMint
    )]
    pub payment_mint: Account<'info, MintLegacy>,
    #[account(
        mut,
        seeds = [CREATOR_SEED, creator_account.creator.key().as_ref()],
        bump
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    #[account(
        init_if_needed,
        payer = fee_payer,
        associated_token::mint = payment_mint,
        associated_token::authority = creator_authority,
        associated_token::token_program = token_program_usdc
    )]
    pub creator_payment_token_ata: Box<Account<'info, TokenAccountLegacy>>,
    /// CHECK: Freezing token
    #[account(
        mut,
        constraint = freeze_authority.key() == presale_program_data.freeze_authority.key()
            @ PresaleErrorCodes::UnauthorizedFreezeAuthority
    )]
    pub freeze_authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
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
