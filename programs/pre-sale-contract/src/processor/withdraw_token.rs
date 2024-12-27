use crate::{ error::*, state::*, constant::*, events::* };
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{ Mint, TransferChecked, Token2022, TokenAccount };
use anchor_spl::associated_token::AssociatedToken;

pub fn withdraw_token_handler(ctx: Context<WithdrawToken>, token_amount: u64) -> Result<()> {
    if token_amount > ctx.accounts.presale_account.total_tokens {
        return err!(PresaleErrorCodes::InsufficientPresaleTokens);
    }
    let bump = ctx.accounts.presale_account.bump;
    let transfer_ctx = ctx.accounts.transfer_presale_token_to_admin_token_ata();
    anchor_spl::token_interface::transfer_checked(
        transfer_ctx.with_signer(&[&[PRESALE_SEED, &[bump]]]),
        token_amount,
        ctx.accounts.token_mint.decimals
    )?;
    ctx.accounts.presale_account.total_tokens -= token_amount;
    emit!(WithdrawTokenEvent {
        authority: ctx.accounts.authority.key(),
        withdraw_token_amount: token_amount,
        remaining_token_amount: ctx.accounts.presale_account.total_tokens,
    });
    Ok(())
}
#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(
        mut,
    )]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CREATOR_SEED, authority.key().as_ref()],
        bump,
        constraint = creator_account.creator.key() == authority.key()
        @PresaleErrorCodes::InvalidCreator
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    #[account(
        seeds = [PRESALE_SEED],
        bump,
        constraint = presale_account.authority == authority.key()
    )]
    pub presale_account: Box<Account<'info, PresaleAccount>>,
    #[account(
        mut,
    )]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub admin_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        constraint=token_mint.key().as_ref() == presale_program_data.token_mint.as_ref()
        @PresaleErrorCodes::InsufficientMintedToken,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(seeds = [PRESALE_SEED, PROGRAM_DATA_SEED], bump = presale_program_data.bump)]
    pub presale_program_data: Account<'info, PresaleProgramData>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
impl<'info> WithdrawToken<'info> {
    pub fn transfer_presale_token_to_admin_token_ata(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_account = TransferChecked {
            from: self.presale_token_ata.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.admin_token_ata.to_account_info(),
            authority: self.presale_account.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_account)
    }
}
