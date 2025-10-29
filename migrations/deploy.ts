const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);
  const program = anchor.workspace.StakingDapp;
  console.log("Deploying staking_dapp with program ID:", program.programId.toString());
};
