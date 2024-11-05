use crate::{ constant::*, state::*, error::*, events::* };
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePresaleArgs {
    pub start_time: u64,
    pub end_time: u64,
    pub minimum_buyable_amount: u64,
    pub maximum_buyable_amount: u64,
    pub is_presale_ended: bool,
}

pub fn update_presale_handler(ctx: Context<UpdatedData>, args: UpdatePresaleArgs) -> Result<()> {
    
    require!(
        ctx.accounts.authority.key() == ctx.accounts.presale_account.authority,
        PresaleErrorCodes::Unauthorized
    );
    // let clock = Clock::get()?;
    // let current_unix_timestamp = clock.unix_timestamp as u64;

    // to make presale editable at every time (make comment below lines)
    // require!(
    //     current_unix_timestamp < ctx.accounts.presale_account.start_time,
    //     PresaleErrorCodes::PresaleHasStarted
    // );

    require!(
        args.end_time > args.start_time, 
        PresaleErrorCodes::InvalidTime
    );

    require!(
        args.maximum_buyable_amount > args.minimum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );

    let presale_account = &mut ctx.accounts.presale_account;

    //update the presale data
    // presale_account.start_time = args.start_time;
    presale_account.end_time = args.end_time;
    presale_account.maximum_buyable_amount = args.maximum_buyable_amount;
    presale_account.minimum_buyable_amount = args.minimum_buyable_amount;
    presale_account.is_presale_ended = args.is_presale_ended;

    emit!(UpdatePresaleEvent {
        start_time: args.start_time,
        end_time: args.end_time,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatedData<'info> {
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
    #[account(
        init_if_needed,
        seeds = [PREFIX, PROGRAM_DATA],
        bump,
        payer = authority,
        space = 8 + PresaleProgramData::INIT_SPACE
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,
    #[account(
        mut, 
        seeds = [PREFIX], 
        bump
    )]
    pub presale_account: Box<Account<'info, PresaleAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
