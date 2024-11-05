use crate::{ error::*, state::*, constant::* };
use anchor_lang::prelude::*;
// use anchor_spl::token::{ self as spl_token, Token, TokenAccount, Mint, TransferChecked };
use anchor_spl::token_interface::{ Mint, TransferChecked, Token2022, TokenAccount };

use anchor_spl::associated_token::AssociatedToken;
use spl_token::solana_program::native_token::LAMPORTS_PER_SOL;

pub fn withdraw_token_handler(ctx: Context<WithdrawToken>, token_amount: u64) -> Result<()> {
    // check token amount is available in presale or not
    msg!("presale program data  auth {}", ctx.accounts.presale_program_data.authority);
    msg!("auth {}", ctx.accounts.authority.key());
    msg!(
        "Presale token amount: {}, asked amount: {}",
        ctx.accounts.presale_account.total_tokens / LAMPORTS_PER_SOL,
        token_amount / LAMPORTS_PER_SOL
    );

    // now transfer the token from presale to admin

    let bump = ctx.accounts.presale_account.bump;
    let transfer_ctx = ctx.accounts.transfer_presale_token_to_admin_token_ata();

    anchor_spl::token_interface::transfer_checked(
        transfer_ctx.with_signer(&[&[PREFIX, &[bump]]]),
        token_amount,
        ctx.accounts.token_mint.decimals
    )?;

    // // Update the presale account's total tokens after the transfer
    // ctx.accounts.presale_account.total_tokens -= token_amount;

    msg!(
        "After withdraw , presale token amount {}",
        ctx.accounts.presale_account.total_tokens / LAMPORTS_PER_SOL
    );

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(
        mut,
        constraint = authority.key().as_ref() == creator_account.reciever.as_ref()
        @PresaleErrorCodes::Unauthorized,
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [MINTER_SEED],
        bump,
        constraint = creator_account.reciever == authority.key()
        @PresaleErrorCodes::InvalidCreator
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    #[account(seeds = [PREFIX], bump, constraint = presale_account.authority == authority.key())]
    pub presale_account: Box<Account<'info, PresaleAccount>>,

    #[account(
        mut,
        // associated_token::mint = token_mint,
        // associated_token::authority = presale_account
    )]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account( mut )]
    pub admin_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint=token_mint.key().as_ref() == presale_program_data.token_mint.as_ref()
        @PresaleErrorCodes::InsufficientMintedToken,
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(seeds = [PREFIX, PROGRAM_DATA], bump = presale_program_data.bump)]
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
