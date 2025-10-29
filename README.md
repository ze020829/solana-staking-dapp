# Solana 质押 DApp

一个基于 Solana 区块链的质押去中心化应用，使用 Anchor 框架开发智能合约，Vue 3 构建前端界面。

## 🚀 功能特性

- ✅ **智能合约**: 完整的质押、取消质押、领取奖励功能
- ✅ **前端界面**: Vue 3 + Vite 构建的现代化 UI
- ✅ **钱包集成**: 支持 Phantom 钱包连接
- ✅ **实时数据**: 显示质押统计和用户余额
- ✅ **中文支持**: 完整的中文界面和文档

## 📁 项目结构

```
staking_dapp/
├── programs/
│   └── staking_dapp/
│       └── src/
│           └── lib.rs          # 智能合约核心代码
├── app/                        # Vue 前端应用
│   ├── src/
│   │   ├── App.vue            # 主应用组件
│   │   ├── main.js            # 入口文件
│   │   ├── style.css          # 样式文件
│   │   └── utils/
│   │       ├── solana.js      # Solana 交互工具
│   │       └── config.js      # 配置文件
│   └── public/
│       └── idl/
│           └── staking_dapp.json  # 合约 IDL 文件
├── tests/
│   └── staking_dapp.js         # 合约测试文件
└── 项目说明.md                 # 详细项目说明
```

## 🛠 技术栈

### 后端（智能合约）
- **Rust** - 系统编程语言
- **Anchor** - Solana 开发框架
- **SPL Token** - Solana 代币标准

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 前端构建工具
- **@solana/web3.js** - Solana JavaScript SDK
- **@coral-xyz/anchor** - Anchor JavaScript SDK

## 🚀 快速开始

### 前置要求

1. **安装 Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **安装 Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   ```

3. **安装 Node.js 和 npm**

4. **安装 Phantom 钱包浏览器扩展**

### 部署和运行

#### 1. 启动本地 Solana 测试节点

```bash
solana-test-validator
```

#### 2. 部署智能合约

```bash
# 构建合约
anchor build

# 部署合约
anchor deploy
```

#### 3. 运行前端应用

```bash
cd app
npm install
npm run dev
```

访问 `http://localhost:3000`

## 📖 使用说明

1. 确保本地 Solana 节点运行：`solana-test-validator`
2. 确保合约已部署和池已初始化
3. 在 Phantom 钱包中连接到本地网络
4. 启动前端应用
5. 连接钱包并开始质押

## 🔧 配置说明

### 网络配置

在 `app/src/utils/config.js` 中可以修改网络：

```javascript
// 本地测试网
export const NETWORK = 'http://127.0.0.1:8899'

// 开发网
// export const NETWORK = 'https://api.devnet.solana.com'

// 主网
// export const NETWORK = 'https://api.mainnet-beta.solana.com'
```

### 合约地址

确保程序 ID 与部署的合约地址一致：
- `programs/staking_dapp/src/lib.rs`（declare_id!）
- `app/src/utils/config.js`（PROGRAM_ID）

## 🎯 核心功能

### 智能合约功能

1. **初始化质押池** - 创建池并设置质押/奖励代币
2. **质押代币** - 将代币存入池中
3. **取消质押** - 从池中提取代币
4. **领取奖励** - 按质押数量的 10% 领取奖励

### 前端功能

1. **钱包连接** - 支持 Phantom 钱包
2. **数据展示** - 总质押量、个人质押量、可领取奖励
3. **交易操作** - 质押、取消质押、领取奖励
4. **用户体验** - 实时状态更新、消息提示、响应式设计

## 📝 开发说明

### 测试合约

```bash
npm test
```

### 构建前端

```bash
cd app
npm run build
```

### 代码检查

```bash
npm run lint
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC

## 📞 联系方式

如有问题，请提交 Issue 或联系开发团队。

---

**注意**: 这是一个学习项目，请在生产环境中谨慎使用。
