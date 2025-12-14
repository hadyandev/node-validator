# Agent Instruction – Update Node Validator Pool (IOTA / Move)

You are an AI agent responsible for **updating an existing Move smart contract** for a
**Node Validator Pool** built on the **IOTA Move-based ecosystem**.

The update must align the contract logic with a **realistic validator lifecycle and reward distribution model**.

---

## Objective

Update the smart contract so that:
- Users can pool IOTA tokens to reach a validator stake threshold
- A validator becomes active only after the required stake is met
- Validator rewards are distributed with a configurable operator cut
- Remaining rewards are distributed proportionally to contributors

---

## Directory

All updated smart contract code must be placed in:
/contract/node-validator


Do not introduce unrelated modules or move files outside this directory.

---

## Core Assumptions

- One pool = one validator
- Required stake default: **1000 IOTA** (configurable)
- Operator reward default: **10%** (configurable)
- User reward: **90%**
- Validator setup and operation are handled **off-chain**
- Smart contract only handles:
  - staking
  - accounting
  - reward distribution

---

## Pool Lifecycle (State Machine)

The pool must implement the following states:

| State | Description |
|------|------------|
| `COLLECTING` | Pool is accepting stakes |
| `READY` | Required stake reached |
| `ACTIVE` | Validator node is running |

State transitions:
- `COLLECTING → READY` when `total_stake >= required_stake`
- `READY → ACTIVE` only by operator action

---

## Required Resources

### Pool Resource
Must include:
- `required_stake: u64`
- `total_stake: u64`
- `operator: address`
- `operator_reward_pct: u8`
- `status: u8`
- `accumulated_reward: u64`

### Contributor Resource
Must include:
- `staked_amount: u64`
- `reward_debt: u64`

---

## Functional Requirements

### 1. Pool Creation
- Implement or update `create_pool`
- Set required stake & operator reward percentage
- Initialize pool in `COLLECTING` state

---

### 2. Staking (Patungan)
- Implement or update `stake`
- Allow any user to stake IOTA into pool
- Update contributor balance and pool total stake
- Automatically transition pool to `READY` when threshold reached

---

### 3. Pool Activation
- Implement `activate_pool`
- Only callable by operator
- Allowed only when pool state is `READY`
- Transition pool to `ACTIVE`

---

### 4. Reward Intake
- Implement `record_reward`
- Accept reward transfers sent to pool address
- Accumulate rewards only when pool is `ACTIVE`

---

### 5. Reward Distribution Logic
When rewards are distributed:
1. Calculate operator reward:
2. Remaining reward goes to contributors:
3. User reward must be proportional to staking contribution

---

### 6. Claim Reward
- Implement `claim_reward`
- Users can claim only their pending reward
- Operator can claim operator reward separately
- Prevent double-claim using `reward_debt`

---

### 7. Withdraw Stake
- Allow users to withdraw stake only when:
- Pool is `COLLECTING`, or
- Pool is `READY`
- Withdraw must be **disabled when pool is ACTIVE**
- Update stake, shares, and reward accounting correctly

---

## Access Control

- Only operator can:
- Activate pool
- Claim operator reward
- Users can only:
- Stake for themselves
- Claim their own rewards
- Withdraw their own stake

---

## Error Handling

Define explicit abort codes for:
- Unauthorized access
- Invalid pool state
- Insufficient stake
- Zero amount
- Duplicate activation
- Reward claim overflow

---

## Design Constraints

- Follow Move resource ownership rules strictly
- Avoid floating point math
- Use integer math with safe ordering
- Prioritize correctness over gas optimization

---

## Expected Output

- Updated Move module(s) reflecting all logic above
- Clear inline documentation
- No breaking changes outside defined scope

---

## Non-Goals

- Slashing or penalty handling
- Governance or voting
- Multi-validator pools
- Tokenized shares (NFT / FT)

---

## Success Criteria

- Pool reaches threshold correctly
- Operator reward is enforced
- User rewards are proportional and safe
- Pool lifecycle is enforced on-chain
- Contract logic matches real validator operations
