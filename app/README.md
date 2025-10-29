# Solana 质押 DApp 前端

这是一个基于 Vue 3 和 Vite 构建的 Solana 质押 DApp 前端应用。

## 项目功能

- ✅ 连接 Solana 钱包（支持 Phantom）
- ✅ 查看质押池统计信息
- ✅ 质押代币
- ✅ 取消质押
- ✅ 领取奖励

## 安装依赖

```bash
cd app
npm install
```

## 开发

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动

## 构建

```bash
npm run build
```

## 配置说明

### 网络配置

在 `src/utils/config.js` 中可以修改网络配置：

- `localnet`: `http://127.0.0.1:8899` (本地测试网)
- `devnet`: `https://api.devnet.solana.com` (开发网)
- `mainnet`: `https://api.mainnet-beta.solana.com` (主网)

### 合约地址

确保 `PROGRAM_ID` 与部署的合约地址一致。

### IDL 文件

前端需要加载合约的 IDL 文件。确保：

1. 合约已构建并生成 IDL 文件
2. IDL 文件位于 `target/idl/staking_dapp.json`
3. 或者手动将 IDL 复制到项目中

如果 IDL 文件不在标准位置，可以修改 `src/utils/solana.js` 中的 `getProgram` 函数来手动加载 IDL。

## 使用说明

1. 确保本地 Solana 测试节点运行（localnet 模式）
2. 确保合约已部署
3. 安装 Phantom 钱包浏览器扩展
4. 在 Phantom 中连接到本地网络
5. 启动前端应用
6. 连接钱包并开始质押

## 注意事项

- 代币精度默认为 6 位小数，可在 `src/utils/config.js` 中调整
- 需要确保用户钱包中有足够的代币余额
- 质押池需要先初始化才能使用

