# Node Validator Pool Contract Update Summary

## Overview
The validator pool contract has been completely updated to implement a realistic validator lifecycle and reward distribution model as specified in agent-instruction2.md.

## Key Changes

### 1. Pool Lifecycle States
- **COLLECTING (0)**: Pool accepting stakes from users
- **READY (1)**: Required stake threshold met, ready for operator activation
- **ACTIVE (2)**: Validator running and earning rewards

### 2. Updated Resource Structures

#### ValidatorPool
- `required_stake`: Minimum stake needed for activation (default: 1000 IOTA)
- `total_stake`: Current total staked amount
- `operator`: Address of validator operator
- `operator_reward_pct`: Operator's percentage cut (default: 10%)
- `status`: Current pool state (COLLECTING/READY/ACTIVE)
- `accumulated_reward`: Total rewards pending distribution
- `reward_per_stake`: Reward calculation basis for proportional distribution

#### Contributor
- `staked_amount`: Individual user's staked IOTA
- `reward_debt`: Prevents double claiming of rewards

### 3. Core Functions

#### Pool Management
- `create_pool()`: Creates pool with configurable threshold and operator cut
- `activate_pool()`: Operator-only function to activate when READY

#### Staking Operations
- `stake()`: Users stake IOTA, auto-transitions to READY when threshold met
- `withdraw_stake()`: Withdraw stake (only when COLLECTING or READY)

#### Reward System
- `record_reward()`: Accept validator rewards into pool
- `claim_reward()`: Users claim proportional rewards (minus operator cut)
- `claim_operator_reward()`: Operator claims their percentage

### 4. Access Controls
- **Operator only**: Pool activation, operator reward claims
- **Users only**: Stake for themselves, claim own rewards, withdraw own stake
- **State restrictions**: Withdrawals blocked when ACTIVE, rewards only when ACTIVE

### 5. Entry Functions for Frontend
- `create_validator_pool()`: Default pool creation (1000 IOTA, 10%)
- `create_custom_validator_pool()`: Custom parameters
- `stake_to_pool()`: User staking interface
- `activate_validator_pool()`: Operator activation
- `record_validator_reward()`: Reward intake
- `claim_user_reward()`: User reward claiming
- `claim_operator_rewards()`: Operator reward claiming
- `withdraw_user_stake()`: User stake withdrawal

## Reward Distribution Model

1. **Operator Cut**: Configurable percentage (default 10%)
2. **User Rewards**: Remaining 90% distributed proportionally to stake
3. **Proportional System**: Rewards based on `staked_amount / total_stake` ratio
4. **Anti-Double-Claim**: `reward_debt` mechanism prevents multiple claims

## State Transition Rules

```
COLLECTING → READY: When total_stake >= required_stake
READY → ACTIVE: Only by operator action
READY → COLLECTING: When stake falls below threshold due to withdrawals
```

## Error Handling
- `E_UNAUTHORIZED`: Access control violations
- `E_INVALID_STATE`: Operations in wrong pool state
- `E_INSUFFICIENT_STAKE`: Insufficient funds for operations
- `E_ZERO_AMOUNT`: Zero amount operations blocked
- `E_WITHDRAWAL_NOT_ALLOWED`: Withdrawals blocked in ACTIVE state

## Testing
All core functionality verified with comprehensive unit tests:
- Pool creation and lifecycle
- Staking and state transitions
- Reward recording and distribution