use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

declare_id!("7V6ovzHukZ3ow9kKeT3KyYQbLjGbHoLHg58YwfkPaWvE"); //部署后需要更新

// 质押池账户结构
#[account]
pub struct Pool {
    pub authority: Pubkey,      // 池的管理员
    pub stake_mint: Pubkey,     // 质押代币的Mint地址
    pub reward_mint: Pubkey,    // 奖励代币的Mint地址
    pub total_staked: u64,      // 总质押数量
    pub reward_rate: u64,       // 奖励比例（分母）
    pub bump: u8,               // PDA bump
    pub vault_bump: u8,         // 保险库PDA bump
}

// 用户质押记录
#[account]
pub struct UserStake {
    pub user: Pubkey,           // 用户公钥
    pub amount: u64,            // 质押数量
    pub bump: u8,               // PDA bump
}


// 初始化质押池的账户结构
#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,                    // 初始化新账户
        payer = authority,       // 支付者
        seeds = [b"pool"],       // PDA种子
        bump,                    // 自动计算bump
        space = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1  // 账户大小
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub authority: Signer<'info>,  // 管理员签名者

    pub stake_mint: Account<'info, Mint>,      // 质押代币Mint

    #[account(mut)]
    pub reward_mint: Account<'info, Mint>,     // 奖励代币Mint

    #[account(
        init,                    // 初始化代币保险库
        payer = authority,
        seeds = [b"vault", pool.key().as_ref()],  // 使用池地址作为种子
        bump,
        token::mint = stake_mint,    // 指定代币类型
        token::authority = pool      // 池作为代币权限
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// 质押操作的账户结构
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub user: Signer<'info>,              // 用户签名者

    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,  // 用户的代币账户

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump = pool.vault_bump,           // 使用池中存储的bump
    )]
    pub vault: Account<'info, TokenAccount>,  // 质押池保险库

    #[account(
        init,                            // 首次质押时初始化用户记录
        payer = user,
        seeds = [b"user", user.key().as_ref()],
        bump,
        space = 8 + 32 + 8 + 1
    )]
    pub user_stake: Account<'info, UserStake>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// 取消质押的账户结构
#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump = pool.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_stake.bump,
        constraint = user_stake.user == user.key()  // 确保是用户的质押记录
    )]
    pub user_stake: Account<'info, UserStake>,

    pub token_program: Program<'info, Token>,
}

// 领取奖励的账户结构
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_stake.bump,
        constraint = user_stake.user == user.key()
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub reward_mint: Account<'info, Mint>,        // 奖励代币Mint

    #[account(mut)]
    pub user_reward_token: Account<'info, TokenAccount>,  // 用户奖励代币账户

    pub token_program: Program<'info, Token>,
}


#[program]
pub mod staking_dapp {
    use super::*;

    // 初始化质押池
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.stake_mint = ctx.accounts.stake_mint.key();
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.total_staked = 0;
        pool.reward_rate = 10; // 固定奖励比例：质押数量/10
        pool.bump = ctx.bumps.pool;
        pool.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    // 质押代币
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, CustomError::InvalidAmount);

        // 将用户的代币转移到池的保险库
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // 更新用户质押记录
        let user_stake = &mut ctx.accounts.user_stake;
        user_stake.user = ctx.accounts.user.key();
        user_stake.amount = user_stake.amount.checked_add(amount).ok_or(CustomError::MathOverflow)?;
        user_stake.bump = ctx.bumps.user_stake;

        // 更新池的总质押量
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool.total_staked.checked_add(amount).ok_or(CustomError::MathOverflow)?;

        Ok(())
    }

    // 取消质押
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, CustomError::InvalidAmount);
        require!(ctx.accounts.user_stake.amount >= amount, CustomError::InsufficientStake);

        // 准备池的签名种子（PDA需要签名）
        let pool_bump = ctx.accounts.pool.bump;
        let seeds: &[&[u8]] = &[b"pool", &[pool_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        // 从保险库转回代币给用户
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // 更新用户质押记录和池的总质押量
        ctx.accounts.user_stake.amount =
            ctx.accounts.user_stake.amount.checked_sub(amount).ok_or(CustomError::MathOverflow)?;
        ctx.accounts.pool.total_staked =
            ctx.accounts.pool.total_staked.checked_sub(amount).ok_or(CustomError::MathOverflow)?;

        Ok(())
    }

    // 领取奖励
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        // 计算奖励：质押数量 / 10
        let reward_amount = ctx
            .accounts
            .user_stake
            .amount
            .checked_div(10)
            .ok_or(CustomError::MathOverflow)?;

        // 准备池的签名种子
        let pool_bump = ctx.accounts.pool.bump;
        let seeds: &[&[u8]] = &[b"pool", &[pool_bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        // 铸造奖励
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.reward_mint.to_account_info(),
                    to: ctx.accounts.user_reward_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            reward_amount,
        )?;

        Ok(())
    }
}

// 自定义错误类型
#[error_code]
pub enum CustomError {
    #[msg("Invalid amount.")]
    InvalidAmount,          // 无效金额
    #[msg("Insufficient staked balance.")]
    InsufficientStake,      // 质押余额不足
    #[msg("Math overflow.")]
    MathOverflow,           // 数学溢出
}
