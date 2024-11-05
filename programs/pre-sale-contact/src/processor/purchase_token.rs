use crate::{ constant::*, error::*, state::*, events::* };
use anchor_lang::prelude::*;
// use anchor_spl::token::{ self as spl_token, Mint, Token, TokenAccount, TransferChecked };
use anchor_spl::token_interface::{ Mint, TransferChecked, Token2022, TokenAccount };

use anchor_spl::associated_token::AssociatedToken;

pub fn purchase_token_handler(ctx: Context<PurchaseToken>, token_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;

    require!(
        current_unix_timestamp >= ctx.accounts.presale_account.start_time &&
            current_unix_timestamp <= ctx.accounts.presale_account.end_time,
        PresaleErrorCodes::InvalidTime
    );

    require!(
        ctx.accounts.buyer.key() == ctx.accounts.presale_account.authority.key(),
        PresaleErrorCodes::Unauthorized
    );

    // check token_amount is within the buyable range

    require!(
        token_amount >= ctx.accounts.presale_account.minimum_buyable_amount &&
            token_amount <= ctx.accounts.presale_account.maximum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );

    // now transfer the tokens from presale to buyer account
    let bump = ctx.accounts.presale_account.bump;
    msg!("Hello wolrd!!!");

    anchor_spl::token_interface::transfer_checked(
        ctx.accounts.transfer_presale_token_to_buyer().with_signer(&[&[PREFIX, &[bump]]]),
        token_amount,
        ctx.accounts.token_mint.decimals
    )?;
    // ctx.accounts.presale_account.total_tokens -= token_amount;

    emit!(PurchaseTokenEvent {
        buyer: ctx.accounts.buyer.key(),
        bought_token_amount: token_amount,
        rest_token_amount: ctx.accounts.presale_account.total_tokens,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct PurchaseToken<'info> {
    #[account(
        mut,
        constraint = buyer.key().as_ref() == creator_account.reciever.as_ref()
        @PresaleErrorCodes::Unauthorized,
    )]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [MINTER_SEED],
        bump,
        constraint = creator_account.reciever == buyer.key()
        @PresaleErrorCodes::InvalidCreator
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    #[account(
        mut,
        seeds = [PREFIX], 
        bump
    )]
    pub presale_account: Box<Account<'info, PresaleAccount>>,

    // buyer will receive token in this account
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // buyer will purchase token from this account
    #[account(
        mut,
        // associated_token::mint = presale_program_data.token_mint,
        // associated_token::authority = presale_account
    )]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [PREFIX, PROGRAM_DATA], 
        bump = presale_program_data.bump
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    #[account(
            mut, 
            constraint = token_mint.key().as_ref() == presale_program_data.token_mint.as_ref()
            @PresaleErrorCodes::InvalidMintedToken,
        )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

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
}
