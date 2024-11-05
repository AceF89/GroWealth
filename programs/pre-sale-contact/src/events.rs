use anchor_lang::prelude::*;


#[event]
pub struct InitializeEvent {
    pub initializer: Pubkey,
    pub token_mint: Pubkey,
}

#[event]
pub struct CreatePresaleEvent {
    pub authority: Pubkey, 
    pub start_time: u64,
    pub end_time: u64,
    pub minimum_buyable_amount: u64,
    pub maximum_buyable_amount: u64,
}

#[event]
pub struct PurchaseTokenEvent {
    pub buyer: Pubkey,
    pub bought_token_amount: u64,
    pub rest_token_amount: u64,
}

#[event]
pub struct  UpdatePresaleEvent{
    pub start_time: u64,
    pub end_time: u64,
}

#[event]
pub struct WithdrawPaymentEvent {
    pub authority: Pubkey,
    pub withdraw_payment_amount: u64,
    pub remaining_payment_amount: u64,

}
#[event]
pub struct WithdrawTokenEvent {
    pub authority: Pubkey,
    pub withdraw_token_amount: u64,
    pub remaining_token_amount: u64,
}

#[event]
pub struct  GrantAccessEvent{
    pub new_authority: Pubkey,
    pub provider: Pubkey,
}

#[event]
pub struct  RewokeAccessEvent{
    pub old_authority: Pubkey,
}