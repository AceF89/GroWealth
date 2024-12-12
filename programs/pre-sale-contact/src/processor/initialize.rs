use crate::{ constant::*, state::*, events::* };
use anchor_lang::prelude::*;
// use anchor_spl::token::Mint;
use anchor_spl::token_interface::{ Mint, Token2022 };

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeArgs {
    pub token_mint: Pubkey,
}

// #[inline(never)]
pub fn initialize_handler(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
    let presale_program_data: &mut Account<PresaleProgramData> = &mut ctx.accounts.presale_program_data;
    presale_program_data.token_mint = args.token_mint;
    presale_program_data.super_authority = ctx.accounts.authority.key();
    presale_program_data.bump = ctx.bumps.presale_program_data;

    emit!(InitializeEvent {
        initializer: ctx.accounts.authority.key(),
        token_mint: args.token_mint,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [PRESALE_SEED, PROGRAM_DATA_SEED],
        bump,
        payer = authority,
        space = 8 + PresaleProgramData::INIT_SPACE
    )]
    pub presale_program_data: Box<Account<'info, PresaleProgramData>>,
    #[account(
        mut,
        mint::token_program = token_program.key(),
    )]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}
