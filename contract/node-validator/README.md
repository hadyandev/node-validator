# Node Validator Pool

A simple pooled staking smart contract for IOTA built with Move.

## Overview

This smart contract allows multiple users to pool their IOTA tokens together and delegate them to a single validator node. Users receive proportional shares representing their ownership in the pool and can withdraw their stake at any time.

## Features

- **Pool Creation**: Create staking pools with fixed validator addresses
- **Proportional Deposits**: Deposit IOTA and receive shares proportional to pool ownership
- **Flexible Withdrawals**: Withdraw any amount by burning corresponding shares
- **Admin Controls**: Pool creator can change validator or pause/unpause pool
- **Share Management**: Combine shares from the same pool
- **Event Tracking**: All major actions emit events for transparency

## Quick Start

### Build the Contract

```bash
cd contract/node-validator
iota move build
```

### Run Tests

```bash
iota move test
```

### Deploy

```bash
iota client publish
```

## Usage Examples

### Create a Pool

```move
// Entry function call
node_validator::validator_pool::create_staking_pool(
    @0x123..., // validator address
    ctx
);
```

### Deposit Funds

```move
// Entry function call  
node_validator::validator_pool::deposit_to_pool(
    pool,           // &mut StakingPool
    deposit_coin,   // Coin<IOTA>
    ctx
);
```

### Withdraw Funds

```move
// Entry function call
node_validator::validator_pool::withdraw_from_pool(
    pool,              // &mut StakingPool  
    share,             // &mut StakeShare
    shares_to_burn,    // u64
    ctx
);
```

## Core Types

### StakingPool
The main pool resource containing:
- `validator_address`: Fixed validator for delegation
- `total_funds`: Pooled IOTA balance 
- `total_shares`: Total shares issued
- `admin`: Pool creator address
- `is_active`: Pool status

### StakeShare  
Individual ownership token containing:
- `pool_id`: Reference to the pool
- `owner`: Share holder address
- `shares`: Number of shares owned

### PoolAdminCap
Administrative capability for:
- Changing validator address
- Activating/deactivating pool

## Safety Features

- **Resource-oriented design**: All assets are proper Move resources
- **Explicit ownership**: Clear transfer and access patterns
- **Input validation**: Comprehensive error checking
- **No fund loss**: Proportional math ensures fair withdrawals
- **Admin controls**: Pool management without user fund access

## Error Codes

- `E_INSUFFICIENT_SHARES (1001)`: Not enough shares for withdrawal
- `E_NO_FUNDS_TO_WITHDRAW (1002)`: Pool is empty
- `E_POOL_NOT_ACTIVE (1003)`: Pool is paused
- `E_INVALID_VALIDATOR (1004)`: Invalid validator address
- `E_ZERO_SHARES (1005)`: Cannot withdraw zero shares
- `E_ZERO_DEPOSIT (1006)`: Cannot deposit zero amount

## Architecture Notes

This is an MVP implementation focused on:
- Single validator per pool (no multi-validator support)
- Simple proportional share model (no complex reward calculations)
- Basic admin controls (no governance mechanisms)
- Safety and clarity over optimization

For production use, consider adding:
- Multi-validator support
- Slashing protection
- Reward compounding
- Governance mechanisms
- Time-locked withdrawals