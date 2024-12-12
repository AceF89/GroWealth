use crate::{ constant::*, state::*, events::*, error::* };
use anchor_lang::prelude::*;

pub fn grant_access_handler(ctx: Context<GrantAccess>, creator: Pubkey) -> Result<()> {
    let presale_program_data = &mut ctx.accounts.presale_program_data;

    // super admin provide authority to the creator

    let creator_account = &mut ctx.accounts.creator_account;
    creator_account.creator = creator;
    creator_account.bump = ctx.bumps.creator_account;
    msg!("Creator account: {}", creator_account.creator.key());

    emit!(GrantAccessEvent {
        new_authority: creator,
        provider: presale_program_data.super_authority.key(),
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(creator: Pubkey)]
pub struct GrantAccess<'info> {
    #[account(
        mut,
        constraint = authority.key().as_ref() == presale_program_data.super_authority.as_ref()
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
        init_if_needed,
        payer = authority,
        space = 8 + CreatorAccount::INIT_SPACE,
        seeds = [CREATOR_SEED, creator.key().as_ref()],
        bump
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,

    pub system_program: Program<'info, System>,
}
