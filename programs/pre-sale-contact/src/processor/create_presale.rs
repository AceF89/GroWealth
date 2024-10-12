use crate::{ constant::*, state::*, error::*,events::*};
use anchor_lang::prelude::*;
// use anchor_spl::token::{ self as spl_token,   TransferChecked };
use anchor_spl::token_interface::{Mint,  Token2022, TokenAccount,};

use anchor_spl::associated_token::AssociatedToken;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreatePresaleArgs {
    pub authority: Pubkey,
    pub start_time: u64,
    pub end_time: u64,
    pub minimum_buyable_amount: u64,
    pub maximum_buyable_amount: u64,
    pub is_presale_ended: bool,
    pub presale_token_amount: u64,
}

#[inline(never)]
pub fn create_presale_handler(ctx: Context<CreatePresale>, args: CreatePresaleArgs) -> Result<()> {
    
    let presale_account = &mut ctx.accounts.presale_account;

    if presale_account.start_time != 0{
        require!(
            presale_account.end_time <= args.start_time,
            PresaleErrorCodes::PresaleAlreadyActive
        );
    }


    // uncomment at deployment
    let clock = Clock::get()?;
    let current_unix_timestamp = clock.unix_timestamp as u64;
    msg!("currentTime :{} & start Time: {} end Time: {}", current_unix_timestamp, args.start_time, args.end_time);
    msg!("Admin Token ATA Address: {}", ctx.accounts.admin_token_ata.key());
    msg!("Presale Token ATA Address: {}", ctx.accounts.presale_token_ata.key());
    require!(
        current_unix_timestamp < args.start_time,
        PresaleErrorCodes::InvalidTime
    );

    require!(
        args.end_time > args.start_time, 
        PresaleErrorCodes::InvalidTime
    );
    require!(
        args.maximum_buyable_amount > args.minimum_buyable_amount,
        PresaleErrorCodes::InvalidPurchaseAmount
    );
    presale_account.authority = args.authority.key();
    presale_account.start_time = args.start_time;
    presale_account.end_time = args.end_time;
    presale_account.minimum_buyable_amount = args.minimum_buyable_amount;
    presale_account.maximum_buyable_amount = args.maximum_buyable_amount;
    presale_account.is_presale_ended = false;
    presale_account.total_tokens = args.presale_token_amount;
    presale_account.bump = ctx.bumps.presale_account;

    anchor_spl::token_interface::transfer_checked(
        ctx.accounts.transfer_token_to_presale_ata(),
        args.presale_token_amount,
        ctx.accounts.token_mint.decimals
    )?;

    emit!(CreatePresaleEvent{
        authority: ctx.accounts.authority.key(),
        token_amount: args.presale_token_amount,
        start_time: args.start_time,
        end_time: args.end_time,
        minimum_buyable_amount: args.minimum_buyable_amount,
        maximum_buyable_amount: args.maximum_buyable_amount,
    });
    Ok(())
}


#[derive(Accounts)]
pub struct CreatePresale<'info> {
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
        payer = authority,
        seeds = [PREFIX],
        bump,
        space = 8 + PresaleAccount::INIT_SPACE + 1000
    )]
    pub presale_account: Box<Account<'info, PresaleAccount>>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = presale_account
    )]
    pub presale_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
            mut,
            // associated_token::mint = presale_program_data.token_mint,
            // associated_token::authority = authority
        )]
    pub admin_token_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        seeds = [PREFIX, PROGRAM_DATA], 
        bump = presale_program_data.bump
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,
    #[account(
            mut,
            constraint=token_mint.key().as_ref() == presale_program_data.token_mint.as_ref()
            @PresaleErrorCodes::InvalidMintedToken,
        )]
        pub token_mint: Box<InterfaceAccount<'info, Mint>>,

        pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> CreatePresale<'info> {
    pub fn transfer_token_to_presale_ata(
        &self
    ) -> CpiContext<'_, '_, '_, 'info, anchor_spl::token_interface::TransferChecked<'info>> {
        let cpi_account = anchor_spl::token_interface::TransferChecked {
            from: self.admin_token_ata.to_account_info(),
            mint: self.token_mint.to_account_info(),
            to: self.presale_token_ata.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_account)
    }
}

