use crate::{ constant::*, state::*, events::*, error::* };
use anchor_lang::prelude::*;
// use anchor_spl::mint;

pub fn grant_access_handler(ctx: Context<GrantAccess>, creator: Pubkey) -> Result<()> {
    let presale_program_data = &mut ctx.accounts.presale_program_data;

    let creator_account = &mut ctx.accounts.creator_account;
    creator_account.reciever = creator;
    creator_account.bump = ctx.bumps.creator_account;

    emit!(GrantAccessEvent {
        new_authority: creator,
        provider: presale_program_data.authority.key(),
    });
    Ok(())
}

#[derive(Accounts)]
pub struct GrantAccess<'info> {
    #[account(
        mut,
        constraint = authority.key().as_ref() == presale_program_data.authority.as_ref()
        @PresaleErrorCodes::Unauthorized,
    )]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PREFIX, PROGRAM_DATA],
        bump,
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    #[account(
        init,
        payer = authority,
        space = 8 + CreatorAccount::INIT_SPACE,
        seeds = [MINTER_SEED],
        bump
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}


