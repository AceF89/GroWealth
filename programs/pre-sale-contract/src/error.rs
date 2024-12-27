use anchor_lang::prelude::*;

#[error_code]
pub enum PresaleErrorCodes {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Unauthorized  freezing access")]
    UnauthorizedFreezeAuthority,
    #[msg("Already Presale exist")]
    PresaleAlreadyActive,
    #[msg("Invalid mint token address")]
    InvalidMintedToken,
    #[msg("Invalid payment mint token address")]
    InvalidPaymentMint,
    #[msg("Invalid Purchase Amount")]
    InvalidPurchaseAmount,
    #[msg("Failed due to payment_amount being 0 or less than 0.")]
    ZeroPaymentAmount,
    #[msg("Invalid Time")]
    InvalidTime,
    #[msg("Insufficient minted token")]
    InsufficientMintedToken,
    #[msg("Insufficient Presale token")]
    InsufficientPresaleTokens,
    #[msg("invalid creator of presale")]
    InvalidCreator,
    #[msg("invalid calculation of payment amount")]
    InvalidCalculation,
}
