use crate::{ constant::*, state::*, events::*, error::* };
use anchor_lang::prelude::*;

pub fn revoke_access_handler(ctx: Context<RevokeAccess>) -> Result<()> {
    let creator_account = &mut ctx.accounts.creator_account;

    let old_authority = creator_account.creator;

    // now reset the authority to again super authority

    creator_account.creator = ctx.accounts.presale_program_data.super_authority;

    emit!(RevokeAccessEvent {
        old_authority: old_authority,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(
        mut,
        constraint = authority.key().as_ref() == presale_program_data.super_authority.key().as_ref()
        @PresaleErrorCodes::Unauthorized,
    )]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PRESALE_SEED, PROGRAM_DATA_SEED],
        bump,
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    #[account(
        mut,
        seeds = [CREATOR_SEED, creator_account.creator.key().as_ref()],
        bump
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    pub system_program: Program<'info, System>,
}
