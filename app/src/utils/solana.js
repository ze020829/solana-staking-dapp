import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createMint,
} from '@solana/spl-token'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { PROGRAM_ID, NETWORK } from './config.js'

// 连接Solana网络
export function getConnection() {
  return new Connection(NETWORK, 'confirmed')
}

// 获取PDA地址
export function getPoolPDA(programId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool')],
    programId
  )
}

export function getVaultPDA(poolPDA) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), poolPDA.toBuffer()],
    PROGRAM_ID
  )
}

export function getUserStakePDA(userPublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), userPublicKey.toBuffer()],
    PROGRAM_ID
  )
}

// 获取Anchor程序实例
export async function getProgram(wallet) {
  const connection = getConnection()
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  )

  try {
    // 尝试从链上获取IDL
    let idl
    try {
      idl = await Program.fetchIdl(PROGRAM_ID, provider)
    } catch (error) {
      console.warn('无法从链上获取IDL:', error)
    }
    
    if (!idl) {
      // 如果链上获取失败，尝试从本地文件加载
      try {
        const response = await fetch('/idl/staking_dapp.json')
        if (response.ok) {
          idl = await response.json()
        }
      } catch (fetchError) {
        console.warn('无法从本地加载IDL文件:', fetchError)
      }
    }
    
    if (!idl) {
      throw new Error('无法加载程序IDL，请确保合约已部署或IDL文件存在')
    }
    
    return new Program(idl, PROGRAM_ID, provider)
  } catch (error) {
    console.error('无法加载程序IDL:', error)
    throw error
  }
}

// 获取池信息
export async function getPoolInfo(program, poolPDA) {
  try {
    const poolAccount = await program.account.pool.fetch(poolPDA)
    return poolAccount
  } catch (error) {
    console.error('获取池信息失败:', error)
    return null
  }
}

// 获取用户质押信息
export async function getUserStakeInfo(program, userStakePDA) {
  try {
    const userStakeAccount = await program.account.userStake.fetch(userStakePDA)
    return userStakeAccount
  } catch (error) {
    console.error('获取用户质押信息失败:', error)
    return null
  }
}

// 获取代币账户余额
export async function getTokenBalance(connection, tokenAccount) {
  try {
    const account = await getAccount(connection, tokenAccount)
    return account.amount
  } catch (error) {
    return BigInt(0)
  }
}

// 质押代币
export async function stakeTokens(program, wallet, amount, accounts) {
  const { pool, userToken, vault, userStake } = accounts
  
  const tx = await program.methods
    .stake(new BN(amount))
    .accounts({
      pool: pool,
      user: wallet.publicKey,
      userToken: userToken,
      vault: vault,
      userStake: userStake,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc()

  return tx
}

// 取消质押
export async function unstakeTokens(program, wallet, amount, accounts) {
  const { pool, userToken, vault, userStake } = accounts
  
  const tx = await program.methods
    .unstake(new BN(amount))
    .accounts({
      pool: pool,
      user: wallet.publicKey,
      userToken: userToken,
      vault: vault,
      userStake: userStake,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()

  return tx
}

// 领取奖励
export async function claimRewards(program, wallet, accounts) {
  const { pool, userStake, rewardMint, userRewardToken } = accounts
  
  const tx = await program.methods
    .claimRewards()
    .accounts({
      pool: pool,
      user: wallet.publicKey,
      userStake: userStake,
      rewardMint: rewardMint,
      userRewardToken: userRewardToken,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()

  return tx
}

