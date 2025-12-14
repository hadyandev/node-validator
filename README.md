# IOTA Validator Pool

A decentralized validator pool application built on IOTA blockchain using Move smart contracts.

## Problem Statement

Running a validator node provides attractive rewards, but requires a **large minimum stake**.

In the IOTA ecosystem:
- Becoming a validator requires a high amount of IOTA (e.g. 1000 IOTA)
- Many users cannot meet this requirement individually
- Validator rewards are only accessible to a small group

**Node Validator Pool** enables users to **patungan (pool funds)**, collectively meet the requirement, and **share validator rewards fairly**.

## Features

- **Pool Creation**: Create validator pools with custom stake requirements and operator reward percentages
- **Pool Lifecycle**: Manage pools through COLLECTING → READY → ACTIVE states  
- **Stake Management**: Deposit IOTA stakes and withdraw them as needed
- **Reward System**: Operators earn a percentage of rewards, contributors earn proportional rewards
- **Role-Based Interface**: Different UI for pool operators vs contributors
- **Real-time Updates**: Live pool status and reward tracking


## Contract Address

**Network**: Testnet

**Package ID**: `0x95c78f7543edfedaeaa4671444b8c214bc7bdc3429d5bc93bac2b7bff6b7f242`

**Explorer**: [View on Explorer](https://iotascan.com/testnet/object/0x95c78f7543edfedaeaa4671444b8c214bc7bdc3429d5bc93bac2b7bff6b7f242/contracts)

<img width="1904" height="1071" alt="image" src="https://github.com/user-attachments/assets/ab1a0b01-1ebc-4331-9aee-9cf933c85042" />


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



## 📚 Additional Resources

- [IOTA Documentation](https://wiki.iota.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Move Language Documentation](https://move-language.github.io/move/)

