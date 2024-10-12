use crate::{ constant::*, state::*, events::*, error::* };
use anchor_lang::prelude::*;


pub fn rewoke_access_handler(ctx: Context<RewokeAccess>) -> Result<()>{
    
    if ctx.accounts.presale_program_data.authority == Pubkey::default(){
        return  err!(PresaleErrorCodes::PresaleDoesnotExist);
    }
    
    // msg!("Number: {}", num);
    
    let creator_account = &mut ctx.accounts.creator_account;
    let key = creator_account.reciever.key();
    creator_account.reciever = Pubkey::default();

    emit!(RewokeAccessEvent { 
        old_authority: key,
    });
    Ok(())

}

#[derive(Accounts)]
pub struct RewokeAccess<'info> {
    #[account(
        mut,
        constraint = authority.key().as_ref() == presale_program_data.authority.as_ref()
        @PresaleErrorCodes::Unauthorized,
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [MINTER_SEED],
        bump,
    )]
    pub creator_account: Box<Account<'info, CreatorAccount>>,

    #[account(
        mut,
        seeds = [PREFIX, PROGRAM_DATA],
        bump,
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,

    pub system_program: Program<'info, System>,
}
