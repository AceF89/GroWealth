use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace, Debug)]
pub struct PresaleAccount {
    pub authority: Pubkey,
    pub start_time: u64,
    pub end_time: u64,
    pub minimum_buyable_amount: u64,
    pub maximum_buyable_amount: u64,
    pub token_price_in_usdc: u64,
    pub total_tokens: u64,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct PresaleProgramData {
    pub super_authority: Pubkey,
    pub token_mint: Pubkey,
    pub freeze_authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct CreatorAccount {
    pub creator: Pubkey,
    pub bump: u8,
}
