// 确保 polyfills 已加载
import '../polyfills.js'

import { PublicKey } from '@solana/web3.js'

// 合约程序ID
export const PROGRAM_ID = new PublicKey('7V6ovzHukZ3ow9kKeT3KyYQbLjGbHoLHg58YwfkPaWvE')

// 网络配置
export const NETWORK = 'http://127.0.0.1:8899' // localnet
// export const NETWORK = 'https://api.devnet.solana.com' // devnet
// export const NETWORK = 'https://api.mainnet-beta.solana.com' // mainnet

// 代币精度（根据您的代币配置调整）
export const TOKEN_DECIMALS = 6

