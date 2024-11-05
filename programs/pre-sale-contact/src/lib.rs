use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod processor;
pub mod state;
pub mod events;
use crate::processor::*;
declare_id!("6QAPxsUkzHeoqDGpQbjWWkz4Jy32qhY2SB9DLpFduugE");

#[program]
pub mod pre_sale_contact {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
        initialize::initialize_handler(ctx, args)
    }

    pub fn grant_access(ctx: Context<GrantAccess>, minter: Pubkey) ->Result<()>{
        grant_access::grant_access_handler(ctx, minter)
    }   

    pub fn create_presale(ctx: Context<CreatePresale>, args: CreatePresaleArgs) -> Result<()> {
        create_presale::create_presale_handler(ctx, args)
    }

    pub fn update_presale(ctx: Context<UpdatedData>, args: UpdatePresaleArgs) -> Result<()> {
        update_presale::update_presale_handler(ctx, args)
    }

    pub fn purchase_token(ctx: Context<PurchaseToken>, token_amount: u64) -> Result<()> {
        purchase_token::purchase_token_handler(ctx, token_amount)
    }

    pub fn withdraw_token(ctx: Context<WithdrawToken>, token_amount: u64) -> Result<()> {
        withdraw_token::withdraw_token_handler(ctx, token_amount)
    }

    pub fn rewoke_access(ctx:Context<RewokeAccess>) -> Result<()>{
        rewoke_access::rewoke_access_handler(ctx)
    }

    
}
