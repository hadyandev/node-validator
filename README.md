# IOTA Validator Pool

A decentralized validator pool application built on IOTA blockchain using Move smart contracts.

## Features

- **Pool Creation**: Create validator pools with custom stake requirements and operator reward percentages
- **Pool Lifecycle**: Manage pools through COLLECTING → READY → ACTIVE states  
- **Stake Management**: Deposit IOTA stakes and withdraw them as needed
- **Reward System**: Operators earn a percentage of rewards, contributors earn proportional rewards
- **Role-Based Interface**: Different UI for pool operators vs contributors
- **Real-time Updates**: Live pool status and reward tracking

## Smart Contract

The validator pool smart contract is deployed at:
`0x95c78f7543edfedaeaa4671444b8c214bc7bdc3429d5bc93bac2b7bff6b7f242`

## Getting Started

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) and connect your IOTA wallet

4. Create a new validator pool or interact with existing pools

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript
- **UI**: Radix UI components
- **Blockchain**: IOTA Move smart contracts
- **Wallet**: IOTA dApp Kit integration


## 📍 Contract Address

**Network**: Testnet
**Package ID**: `0x60cc7119c2418cd870138e9df1acd0f36bafd760a524b532575cdef1911d23cb`
**Explorer**: [View on Explorer](https://iotascan.com/testnet/object/0x60cc7119c2418cd870138e9df1acd0f36bafd760a524b532575cdef1911d23cb/contracts)

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📝 Next Steps

### 1. Deploy Your Move Contract

```bash
cd contract/<your-project-name>
iota move build
iota client publish
```

Then manually copy the package ID and update `lib/config.ts`:

```typescript
export const TESTNET_PACKAGE_ID = "0xYOUR_PACKAGE_ID"
```

### 2. Customize Your dApp
- Adjust `Provider.tsx` for the default environment of your dApp.
- Adjust `useContracts.ts` for methods to interact with your contract. 
- Adjust `components/sample.tsx` to customize how your dApp looks.


## 🔧 Advanced Configuration

### Network Configuration

Edit `lib/config.ts` to configure different networks:

```typescript
export const TESTNET_PACKAGE_ID = "0x..."
export const DEVNET_PACKAGE_ID = "0x..."
export const MAINNET_PACKAGE_ID = "0x..."
```

## 📚 Additional Resources

- [IOTA Documentation](https://wiki.iota.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Move Language Documentation](https://move-language.github.io/move/)

