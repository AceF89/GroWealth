use crate::{ constant::*, state::*, error::*, events::* };
use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePresaleArgs {
    pub end_time: u64,
}
pub fn update_presale_handler(ctx: Context<UpdatedData>, args: UpdatePresaleArgs) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.presale_account.authority,
        PresaleErrorCodes::Unauthorized
    );
    let presale_account = &mut ctx.accounts.presale_account;
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;
    require!(current_unix_timestamp < presale_account.end_time, PresaleErrorCodes::InvalidTime);
    require!(args.end_time > presale_account.start_time, PresaleErrorCodes::InvalidTime);
    let end_time = presale_account.end_time;
    presale_account.end_time = args.end_time;
    emit!(UpdatePresaleEvent {
        previous_end_time: end_time,
        end_time: presale_account.end_time,
    });
    Ok(())
}
#[derive(Accounts)]
pub struct UpdatedData<'info> {
    #[account(
        mut,
    )]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CREATOR_SEED,authority.key().as_ref()],
        bump,
        constraint = creator_account.creator.key().as_ref() == authority.key().as_ref()
        @PresaleErrorCodes::InvalidCreator
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,
    #[account(
        mut, 
        seeds = [PRESALE_SEED], 
        bump
    )]
    pub presale_account: Box<Account<'info, PresaleAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
