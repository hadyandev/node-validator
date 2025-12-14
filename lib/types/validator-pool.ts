/**
 * TypeScript interfaces for Updated Validator Pool
 * Defines types for interacting with the realistic validator staking pool smart contract
 */

// ============================================================================
// POOL STATE CONSTANTS
// ============================================================================

export const POOL_STATUS = {
  COLLECTING: 0,
  READY: 1,
  ACTIVE: 2,
} as const

export type PoolStatus = typeof POOL_STATUS[keyof typeof POOL_STATUS]

// ============================================================================
// CORE POOL TYPES
// ============================================================================

export interface ValidatorPoolData {
  id: string
  requiredStake: string // Required stake to activate (IOTA amount)
  totalStake: string // Current total stake
  operator: string // Operator address
  operatorRewardPct: number // Operator reward percentage (0-100)
  status: PoolStatus // COLLECTING/READY/ACTIVE
  accumulatedReward: string // Total rewards pending distribution
  rewardPerStake: string // Reward calculation basis
  balance: string // Pool balance
  objectId: string
}

export interface ContributorData {
  id: string
  poolId: string
  owner: string
  stakedAmount: string // Amount staked by contributor
  rewardDebt: string // Reward debt for double-claim prevention
  objectId: string
}

export interface OperatorCapData {
  id: string
  poolId: string
  objectId: string
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface CreatePoolParams {
  requiredStake: string
  operatorRewardPct: number
}

export interface StakeParams {
  poolObjectId: string
  amount: string // IOTA amount to stake
}

export interface ActivatePoolParams {
  poolObjectId: string
  operatorCapObjectId: string
}

export interface RecordRewardParams {
  poolObjectId: string
  rewardAmount: string
}

export interface ClaimRewardParams {
  poolObjectId: string
  contributorObjectId: string
}

export interface ClaimOperatorRewardParams {
  poolObjectId: string
  operatorCapObjectId: string
}

export interface WithdrawStakeParams {
  poolObjectId: string
  contributorObjectId: string
  amount: string
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ValidatorPoolState {
  // Loading states
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  
  // Transaction data
  hash?: string
  error: Error | null
  
  // UI states
  isCreatingPool: boolean
  isStaking: boolean
  isActivating: boolean
  isClaimingReward: boolean
  isWithdrawingStake: boolean
  isRecordingReward: boolean
}

export interface PoolOperationResult {
  success: boolean
  transactionHash?: string
  error?: Error
  data?: any
}

// ============================================================================
// VIEW/DISPLAY TYPES
// ============================================================================

export interface PoolDisplayInfo {
  poolId: string
  status: PoolStatus
  statusText: string
  totalStake: string
  requiredStake: string
  progress: number // 0-100
  operatorRewardPct: number
  accumulatedReward: string
  userStake: string
  userPendingReward: string
  isOperator: boolean
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface PoolCreatedEvent {
  poolId: string
  validatorAddress: string
  admin: string
  timestamp: number
}

export interface FundsDepositedEvent {
  poolId: string
  contributor: string
  amount: string
  sharesMinted: string
  timestamp: number
}

export interface FundsWithdrawnEvent {
  poolId: string
  contributor: string
  amountWithdrawn: string
  sharesBurned: string
  timestamp: number
}

export interface ValidatorChangedEvent {
  poolId: string
  oldValidator: string
  newValidator: string
  timestamp: number
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CreatePoolFormData {
  requiredStake: string
  operatorRewardPct: number
  isValidRequiredStake: boolean
  isValidRewardPct: boolean
}

export interface StakeFormData {
  amount: string
  isValidAmount: boolean
}

export interface WithdrawStakeFormData {
  amount: string
  isValidAmount: boolean
  maxAmount: string
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseValidatorPoolReturn {
  // State
  state: ValidatorPoolState
  
  // Data fetching
  getAllPools: () => Promise<ValidatorPoolData[]>
  getPoolData: (poolId: string) => Promise<ValidatorPoolData | null>
  getContributorData: (userAddress: string, poolId?: string) => Promise<ContributorData[]>
  getOperatorCaps: (userAddress: string) => Promise<OperatorCapData[]>
  getPoolDisplayInfo: (poolId: string, userAddress: string) => Promise<PoolDisplayInfo>
  
  // Pool operations
  createPool: (params: CreatePoolParams) => Promise<PoolOperationResult>
  stake: (params: StakeParams) => Promise<PoolOperationResult>
  activatePool: (params: ActivatePoolParams) => Promise<PoolOperationResult>
  recordReward: (params: RecordRewardParams) => Promise<PoolOperationResult>
  claimReward: (params: ClaimRewardParams) => Promise<PoolOperationResult>
  claimOperatorReward: (params: ClaimOperatorRewardParams) => Promise<PoolOperationResult>
  withdrawStake: (params: WithdrawStakeParams) => Promise<PoolOperationResult>
  
  // Utility functions
  calculatePendingReward: (poolData: ValidatorPoolData, contributorData: ContributorData) => string
  getPoolStatusText: (status: PoolStatus) => string
  isValidAddress: (address: string) => boolean
  
  // Reset functions
  clearError: () => void
  resetState: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALIDATOR_POOL_CONSTANTS = {
  MODULE_NAME: "node_validator::validator_pool",
  FUNCTIONS: {
    CREATE_POOL: "create_pool",
    STAKE: "stake",
    ACTIVATE_POOL: "activate_pool",
    RECORD_REWARD: "record_reward",
    CLAIM_REWARD: "claim_reward",
    CLAIM_OPERATOR_REWARD: "claim_operator_reward",
    WITHDRAW_STAKE: "withdraw_stake",
  },
  STRUCT_TYPES: {
    VALIDATOR_POOL: "ValidatorPool",
    CONTRIBUTOR: "Contributor", 
    OPERATOR_CAP: "OperatorCap",
  },
  ERROR_CODES: {
    E_UNAUTHORIZED: 1001,
    E_INVALID_STATE: 1002,
    E_INSUFFICIENT_STAKE: 1003,
    E_ZERO_AMOUNT: 1004,
    E_WITHDRAWAL_NOT_ALLOWED: 1007,
  }
} as const

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error'
export type OperationType = 'create' | 'stake' | 'activate' | 'claim' | 'withdraw' | 'record_reward'