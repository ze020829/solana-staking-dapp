<template>
  <div id="app">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <h1>🚀 Solana 质押平台</h1>
        <p>质押您的代币，赚取丰厚奖励</p>
      </div>

      <!-- 钱包连接 -->
      <div class="card">
        <div class="wallet-section">
          <h2 style="margin-bottom: 20px; color: #333;">钱包连接</h2>
          
          <button 
            v-if="!wallet.connected"
            @click="connectWallet"
            class="wallet-button connect"
          >
            连接钱包
          </button>
          
          <div v-else>
            <button 
              @click="disconnectWallet"
              class="wallet-button disconnect"
            >
              断开连接
            </button>
            <div class="wallet-info">
              <p><strong>已连接:</strong></p>
              <p class="wallet-address">{{ walletAddress }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div v-if="message.text" :class="message.type === 'error' ? 'error' : 'success'">
        {{ message.text }}
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading">
        ⏳ 处理中...
      </div>

      <!-- 统计信息 -->
      <div v-if="wallet.connected && poolInfo" class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总质押量</div>
          <div class="stat-value">{{ formatAmount(poolInfo.totalStaked) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">我的质押</div>
          <div class="stat-value">{{ formatAmount(userStakeAmount) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">奖励比例</div>
          <div class="stat-value">{{ (poolInfo.rewardRate || 10) }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">可领取奖励</div>
          <div class="stat-value">{{ formatAmount(claimableRewards) }}</div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div v-if="wallet.connected" class="card">
        <div class="actions-grid">
          <!-- 质押 -->
          <div class="action-card">
            <h3>💰 质押代币</h3>
            <div class="form-group">
              <label>质押数量</label>
              <input 
                v-model.number="stakeAmount" 
                type="number" 
                placeholder="输入数量"
                :disabled="loading"
              />
            </div>
            <button 
              @click="handleStake"
              class="action-button stake"
              :disabled="loading || !stakeAmount || stakeAmount <= 0"
            >
              质押
            </button>
          </div>

          <!-- 取消质押 -->
          <div class="action-card">
            <h3>🔓 取消质押</h3>
            <div class="form-group">
              <label>取消数量</label>
              <input 
                v-model.number="unstakeAmount" 
                type="number" 
                placeholder="输入数量"
                :disabled="loading"
              />
            </div>
            <button 
              @click="handleUnstake"
              class="action-button unstake"
              :disabled="loading || !unstakeAmount || unstakeAmount <= 0 || unstakeAmount > userStakeAmount"
            >
              取消质押
            </button>
          </div>

          <!-- 领取奖励 -->
          <div class="action-card">
            <h3>🎁 领取奖励</h3>
            <p style="margin-bottom: 15px; color: #666;">
              可领取: {{ formatAmount(claimableRewards) }}
            </p>
            <button 
              @click="handleClaimRewards"
              class="action-button claim"
              :disabled="loading || claimableRewards <= 0"
            >
              领取奖励
            </button>
          </div>
        </div>
      </div>

      <!-- 未连接提示 -->
      <div v-if="!wallet.connected" class="card">
        <p style="text-align: center; color: #666; font-size: 1.1rem;">
          请先连接钱包以开始使用
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { 
  getConnection, 
  getPoolPDA, 
  getVaultPDA, 
  getUserStakePDA,
  getProgram,
  getPoolInfo,
  getUserStakeInfo,
  stakeTokens,
  unstakeTokens,
  claimRewards,
  getTokenBalance,
} from './utils/solana.js'
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { PROGRAM_ID } from './utils/config.js'

export default {
  name: 'App',
  setup() {
    const wallet = ref({ connected: false, publicKey: null, signTransaction: null, signAllTransactions: null })
    const loading = ref(false)
    const poolInfo = ref(null)
    const userStakeInfo = ref(null)
    const stakeAmount = ref('')
    const unstakeAmount = ref('')
    const message = ref({ text: '', type: '' })
    const program = ref(null)
    const userTokenAccount = ref(null)
    const userRewardTokenAccount = ref(null)
    const stakeMint = ref(null)
    const rewardMint = ref(null)

    // 计算属性
    const walletAddress = computed(() => {
      if (wallet.value.publicKey) {
        const addr = wallet.value.publicKey.toBase58()
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`
      }
      return ''
    })

    const userStakeAmount = computed(() => {
      return userStakeInfo.value?.amount ? Number(userStakeInfo.value.amount) : 0
    })

    const claimableRewards = computed(() => {
      if (!userStakeInfo.value || !poolInfo.value) return 0
      const stakeAmount = Number(userStakeInfo.value.amount || 0)
      const rewardRate = poolInfo.value.rewardRate || 10
      return Math.floor(stakeAmount / rewardRate)
    })

    // 格式化金额显示
    const formatAmount = (amount) => {
      if (!amount) return '0'
      // 假设代币精度为6（可以在实际项目中配置）
      const decimals = 6
      const num = typeof amount === 'bigint' ? Number(amount) : amount
      return (num / 10 ** decimals).toFixed(2)
    }

    // 显示消息
    const showMessage = (text, type = 'success') => {
      message.value = { text, type }
      setTimeout(() => {
        message.value = { text: '', type: '' }
      }, 5000)
    }

    // 连接钱包
    const connectWallet = async () => {
      try {
        if (typeof window.solana !== 'undefined') {
          const provider = window.solana
          if (provider.isPhantom) {
            const response = await provider.connect()
            
            wallet.value = {
              connected: true,
              publicKey: response.publicKey,
              signTransaction: provider.signTransaction.bind(provider),
              signAllTransactions: provider.signAllTransactions.bind(provider),
            }

            // 初始化程序
            await initProgram()
            // 加载数据
            await loadData()
            
            showMessage('钱包连接成功！', 'success')
          } else {
            showMessage('请安装Phantom钱包', 'error')
          }
        } else {
          showMessage('未检测到Solana钱包，请安装Phantom', 'error')
        }
      } catch (error) {
        console.error('连接钱包失败:', error)
        showMessage('连接钱包失败: ' + error.message, 'error')
      }
    }

    // 断开钱包
    const disconnectWallet = async () => {
      if (window.solana && window.solana.disconnect) {
        await window.solana.disconnect()
      }
      wallet.value = { connected: false, publicKey: null }
      poolInfo.value = null
      userStakeInfo.value = null
      showMessage('钱包已断开', 'success')
    }

    // 初始化程序
    const initProgram = async () => {
      try {
        program.value = await getProgram({
          publicKey: wallet.value.publicKey,
          signTransaction: wallet.value.signTransaction,
          signAllTransactions: wallet.value.signAllTransactions,
        })
      } catch (error) {
        console.error('初始化程序失败:', error)
        showMessage('初始化程序失败，请检查网络连接', 'error')
      }
    }

    // 加载数据
    const loadData = async () => {
      if (!program.value) return

      try {
        loading.value = true
        const connection = getConnection()

        // 获取池信息
        const [poolPDA] = getPoolPDA(PROGRAM_ID)
        const pool = await getPoolInfo(program.value, poolPDA)
        
        if (pool) {
          poolInfo.value = pool
          stakeMint.value = pool.stakeMint
          rewardMint.value = pool.rewardMint

          // 获取用户质押信息
          const [userStakePDA] = getUserStakePDA(wallet.value.publicKey)
          const userStake = await getUserStakeInfo(program.value, userStakePDA)
          
          if (userStake) {
            userStakeInfo.value = userStake
          }

          // 获取用户的代币账户
          if (pool.stakeMint) {
            const userTokenAcc = await getOrCreateAssociatedTokenAccount(
              connection,
              { publicKey: wallet.value.publicKey, signTransaction: wallet.value.signTransaction },
              pool.stakeMint,
              wallet.value.publicKey
            )
            userTokenAccount.value = userTokenAcc.address
          }

          if (pool.rewardMint) {
            const userRewardAcc = await getOrCreateAssociatedTokenAccount(
              connection,
              { publicKey: wallet.value.publicKey, signTransaction: wallet.value.signTransaction },
              pool.rewardMint,
              wallet.value.publicKey
            )
            userRewardTokenAccount.value = userRewardAcc.address
          }
        }
      } catch (error) {
        console.error('加载数据失败:', error)
        showMessage('加载数据失败: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // 质押处理
    const handleStake = async () => {
      if (!stakeAmount.value || stakeAmount.value <= 0) {
        showMessage('请输入有效的质押数量', 'error')
        return
      }

      try {
        loading.value = true
        
        const connection = getConnection()
        const [poolPDA] = getPoolPDA(PROGRAM_ID)
        const [vaultPDA] = getVaultPDA(poolPDA)
        const [userStakePDA] = getUserStakePDA(wallet.value.publicKey)

        // 将数量转换为代币的最小单位（假设6位小数）
        const amount = BigInt(Math.floor(stakeAmount.value * 10 ** 6))

        const tx = await stakeTokens(
          program.value,
          wallet.value,
          amount.toString(),
          {
            pool: poolPDA,
            userToken: userTokenAccount.value,
            vault: vaultPDA,
            userStake: userStakePDA,
          }
        )

        showMessage('质押成功！交易: ' + tx.slice(0, 8) + '...', 'success')
        stakeAmount.value = ''
        await loadData()
      } catch (error) {
        console.error('质押失败:', error)
        showMessage('质押失败: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // 取消质押处理
    const handleUnstake = async () => {
      if (!unstakeAmount.value || unstakeAmount.value <= 0) {
        showMessage('请输入有效的数量', 'error')
        return
      }

      if (unstakeAmount.value > userStakeAmount.value) {
        showMessage('取消数量不能大于质押数量', 'error')
        return
      }

      try {
        loading.value = true
        
        const connection = getConnection()
        const [poolPDA] = getPoolPDA(PROGRAM_ID)
        const [vaultPDA] = getVaultPDA(poolPDA)
        const [userStakePDA] = getUserStakePDA(wallet.value.publicKey)

        const amount = BigInt(Math.floor(unstakeAmount.value * 10 ** 6))

        const tx = await unstakeTokens(
          program.value,
          wallet.value,
          amount.toString(),
          {
            pool: poolPDA,
            userToken: userTokenAccount.value,
            vault: vaultPDA,
            userStake: userStakePDA,
          }
        )

        showMessage('取消质押成功！交易: ' + tx.slice(0, 8) + '...', 'success')
        unstakeAmount.value = ''
        await loadData()
      } catch (error) {
        console.error('取消质押失败:', error)
        showMessage('取消质押失败: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // 领取奖励处理
    const handleClaimRewards = async () => {
      if (claimableRewards.value <= 0) {
        showMessage('没有可领取的奖励', 'error')
        return
      }

      try {
        loading.value = true
        
        const [poolPDA] = getPoolPDA(PROGRAM_ID)
        const [userStakePDA] = getUserStakePDA(wallet.value.publicKey)

        const tx = await claimRewards(
          program.value,
          wallet.value,
          {
            pool: poolPDA,
            userStake: userStakePDA,
            rewardMint: rewardMint.value,
            userRewardToken: userRewardTokenAccount.value,
          }
        )

        showMessage('领取奖励成功！交易: ' + tx.slice(0, 8) + '...', 'success')
        await loadData()
      } catch (error) {
        console.error('领取奖励失败:', error)
        showMessage('领取奖励失败: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    // 组件挂载时检查钱包连接
    onMounted(() => {
      if (typeof window.solana !== 'undefined') {
        window.solana.on('connect', () => {
          connectWallet()
        })
        window.solana.on('disconnect', () => {
          disconnectWallet()
        })
      }
    })

    return {
      wallet,
      loading,
      poolInfo,
      userStakeInfo,
      stakeAmount,
      unstakeAmount,
      message,
      walletAddress,
      userStakeAmount,
      claimableRewards,
      formatAmount,
      connectWallet,
      disconnectWallet,
      handleStake,
      handleUnstake,
      handleClaimRewards,
    }
  }
}
</script>

