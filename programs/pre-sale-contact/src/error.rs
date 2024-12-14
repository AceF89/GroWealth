use anchor_lang::prelude::*;

#[error_code]
pub enum PresaleErrorCodes {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Already Presale exist")]
    PresaleAlreadyActive,
    #[msg("Invalid minted token")]
    InvalidMintedToken,
    #[msg("Invalid Purchase Amount")]
    InvalidPurchaseAmount,
    #[msg("Failed due to payment_amount being 0 or less than 0.")]
    ZeroPaymentAmount,
    #[msg("Invalid Time")]
    InvalidTime,
    #[msg("Error during calculating the price ")]
    CalculationError,
    #[msg("Insufficient minted token")]
    InsufficientMintedToken,
    #[msg("There is not any presale")]
    PresaleDoesnotExist,
    #[msg("invalid creator of presale")]
    InvalidCreator,
}
