use anchor_lang::prelude::*;

#[error_code]
pub enum PresaleErrorCodes {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Already Presale exist")]
    PresaleAlreadyActive,
    #[msg("Invalid minted token")]
    InvalidMintedToken,
    #[msg("presale has been ended")]
    PresaleEnded,
    #[msg("Invalid Token Price")]
    InvalidTokenPrice,
    #[msg("Invalid Purchase Amount")]
    InvalidPurchaseAmount,
    #[msg("Invalid Time")]
    InvalidTime,
    #[msg("Error during calculating the price ")]
    CalculationError,
    #[msg("Insufficient minted token")]
    InsufficientMintedToken,
    #[msg("overflow while calculating payment")]
    Overflow,
    #[msg("There is not any presale")]
    PresaleDoesnotExist,
    #[msg("invalid creator of presale")]
    InvalidCreator,
    #[msg("Presale has been started")]
    PresaleHasStarted
}
