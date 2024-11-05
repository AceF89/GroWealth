use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace, Debug)]
pub struct PresaleAccount {
    pub authority: Pubkey,
    pub start_time: u64,
    pub end_time: u64,
    pub minimum_buyable_amount: u64,
    pub maximum_buyable_amount: u64,
    pub token_price_in_lamports: u64,
    pub total_tokens: u64,
    pub is_presale_ended: bool,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct PresaleProgramData {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub bump: u8,
}


#[account]
#[derive(Default, InitSpace)]
pub struct CreatorAccount {
    pub reciever: Pubkey,
    pub bump: u8,
}
