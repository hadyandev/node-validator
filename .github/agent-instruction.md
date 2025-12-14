# Agent Instruction – Node Validator Pool (Move / Aptos)

You are an AI agent responsible for implementing a **simple pooled staking (node validator) smart contract** using **Move (Aptos)**.

## Objective
Build an MVP smart contract that allows multiple users to:
- Pool their funds
- Delegate stake to a single validator
- Track ownership via shares
- Withdraw stake proportionally

## Scope
- Single staking pool
- Fixed validator address (set at pool creation)
- No governance
- No slashing handling
- No reward compounding logic (native staking rewards only)

## Constraints
- Use **Move (Aptos framework)**
- Follow resource-oriented design
- Prioritize safety and clarity over optimization
- Avoid unnecessary abstractions

## Directory
All smart contract code must be placed in:

/contract/node-validator

## Design Principles
- Each pooled asset must be a resource
- No copying or implicit sharing of assets
- Explicit ownership and access control
- Clear error handling with abort codes

## Expected Capabilities
- Create a staking pool
- Accept deposits from contributors
- Mint proportional shares
- Allow contributors to withdraw based on shares
- Delegate pooled funds to validator

## Non-goals
- NFT or tokenized shares
- Multi-validator support
- Governance or voting
- Frontend integration

## Output
- One or more Move modules implementing the above
- Clean, readable, and documented code
