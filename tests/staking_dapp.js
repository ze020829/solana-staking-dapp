const anchor = require("@coral-xyz/anchor");
const {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
  getAccount,
} = require("@solana/spl-token");
const { SystemProgram, PublicKey } = anchor.web3;

describe("staking_dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.StakingDapp;

  let authority = provider.wallet.publicKey;
  let poolPda, poolBump;
  let vaultPda, vaultBump;
  let stakeMint, rewardMint;
  let userStakeAccount;
  let userTokenAccount, userRewardTokenAccount;

  async function printBalances(stage) {
    const userStake = await getAccount(provider.connection, userTokenAccount.address);
    const userReward = await getAccount(provider.connection, userRewardTokenAccount.address);
    console.log(`💰 [${stage}] 用户Stake余额: ${Number(userStake.amount) / 1e6}`);
    console.log(`🎁 [${stage}] 用户Reward余额: ${Number(userReward.amount) / 1e6}`);
  }

  it("1️⃣ 初始化 mint 与账户", async () => {
    // 创建 Stake Token
    stakeMint = await createMint(provider.connection, provider.wallet.payer, authority, null, 6);
    console.log("✅ Stake Mint:", stakeMint.toBase58());

    // 创建 Reward Token
    rewardMint = await createMint(provider.connection, provider.wallet.payer, authority, null, 6);
    console.log("✅ Reward Mint:", rewardMint.toBase58());

    // 创建用户 ATA
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      stakeMint,
      authority
    );
    userRewardTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      rewardMint,
      authority
    );

    // 给用户发点 Stake Token
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      stakeMint,
      userTokenAccount.address,
      authority,
      1_000_000_000
    );

    console.log("✅ 用户初始化完成");
    await printBalances("初始化后");
  });

  it("2️⃣ Initialize Pool", async () => {
    [poolPda, poolBump] = PublicKey.findProgramAddressSync([Buffer.from("pool")], program.programId);
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault"), poolPda.toBuffer()], program.programId);

    await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        authority: authority,
        stakeMint: stakeMint,
        rewardMint: rewardMint,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Pool 初始化成功:", poolPda.toBase58());

    // 转移 Reward Mint 权限到 Pool PDA
    await setAuthority(
      provider.connection,
      provider.wallet.payer,
      rewardMint,
      authority,
      AuthorityType.MintTokens,
      poolPda
    );
    console.log("✅ Reward Mint authority 转移至 Pool PDA");
  });

  it("3️⃣ Stake", async () => {
    const [userStakePda] = PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], program.programId);

    await program.methods
      .stake(new anchor.BN(500_000_000))
      .accounts({
        pool: poolPda,
        user: authority,
        userToken: userTokenAccount.address,
        vault: vaultPda,
        userStake: userStakePda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Stake 成功");
    await printBalances("Stake后");
  });

  it("4️⃣ Unstake", async () => {
    const [userStakePda] = PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], program.programId);

    await program.methods
      .unstake(new anchor.BN(200_000_000))
      .accounts({
        pool: poolPda,
        user: authority,
        userToken: userTokenAccount.address,
        vault: vaultPda,
        userStake: userStakePda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Unstake 成功");
    await printBalances("Unstake后");
  });

  it("5️⃣ Claim Rewards", async () => {
    const [userStakePda] = PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], program.programId);

    await program.methods
      .claimRewards()
      .accounts({
        pool: poolPda,
        user: authority,
        userStake: userStakePda,
        rewardMint: rewardMint,
        userRewardToken: userRewardTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Claim Rewards 成功");
    await printBalances("Claim后");
  });
});
