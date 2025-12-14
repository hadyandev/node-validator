"use client"

import { useState, useCallback } from "react"
import {
  useCurrentAccount,
  useIotaClient,
  useSignAndExecuteTransaction,
} from "@iota/dapp-kit"
import { Transaction } from "@iota/iota-sdk/transactions"
import type { IotaObjectData } from "@iota/iota-sdk/client"
import { useNetworkVariable } from "@/lib/config"
import {
  ValidatorPoolData,
  ContributorData,
  OperatorCapData,
  ValidatorPoolState,
  PoolOperationResult,
  CreatePoolParams,
  StakeParams,
  ActivatePoolParams,
  RecordRewardParams,
  ClaimRewardParams,
  ClaimOperatorRewardParams,
  WithdrawStakeParams,
  UseValidatorPoolReturn,
  PoolDisplayInfo,
  VALIDATOR_POOL_CONSTANTS,
  POOL_STATUS,
  PoolStatus
} from "@/lib/types/validator-pool"

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseValidatorPoolData(data: IotaObjectData): ValidatorPoolData | null {
  if (data.content?.dataType !== "moveObject") return null
  
  const fields = data.content.fields as any
  if (!fields) return null

  return {
    id: fields.id?.id || "",
    requiredStake: fields.required_stake?.toString() || "0",
    totalStake: fields.total_stake?.toString() || "0",
    operator: fields.operator || "",
    operatorRewardPct: parseInt(fields.operator_reward_pct) || 0,
    status: (parseInt(fields.status) || 0) as PoolStatus,
    accumulatedReward: fields.accumulated_reward?.toString() || "0",
    rewardPerStake: fields.reward_per_stake?.toString() || "0",
    balance: fields.balance?.toString() || "0",
    objectId: data.objectId,
  }
}

function parseContributorData(data: IotaObjectData): ContributorData | null {
  if (data.content?.dataType !== "moveObject") return null
  
  const fields = data.content.fields as any
  if (!fields) return null

  return {
    id: fields.id?.id || "",
    poolId: fields.pool_id || "",
    owner: fields.owner || "",
    stakedAmount: fields.staked_amount?.toString() || "0",
    rewardDebt: fields.reward_debt?.toString() || "0",
    objectId: data.objectId,
  }
}

function parseOperatorCapData(data: IotaObjectData): OperatorCapData | null {
  if (data.content?.dataType !== "moveObject") return null
  
  const fields = data.content.fields as any
  if (!fields) return null

  return {
    id: fields.id?.id || "",
    poolId: fields.pool_id || "",
    objectId: data.objectId,
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useValidatorPool = (): UseValidatorPoolReturn => {
  const currentAccount = useCurrentAccount()
  const iotaClient = useIotaClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const validatorPoolPackageId = useNetworkVariable("validatorPoolPackageId")

  // State management
  const [state, setState] = useState<ValidatorPoolState>({
    isLoading: false,
    isPending: false,
    isConfirming: false,
    isConfirmed: false,
    error: null,
    isCreatingPool: false,
    isStaking: false,
    isActivating: false,
    isClaimingReward: false,
    isWithdrawingStake: false,
    isRecordingReward: false,
  })

  // ============================================================================
  // STATE MANAGEMENT HELPERS
  // ============================================================================

  const updateState = useCallback((updates: Partial<ValidatorPoolState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
      isCreatingPool: false,
      isStaking: false,
      isActivating: false,
      isClaimingReward: false,
      isWithdrawingStake: false,
      isRecordingReward: false,
    })
  }, [])

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const getAllPools = useCallback(async (): Promise<ValidatorPoolData[]> => {
    if (!validatorPoolPackageId) {
      console.log("❌ No validatorPoolPackageId available")
      return []
    }

    try {
      console.log("\n🔍 ========= FETCHING ALL VALIDATOR POOLS ==========")
      console.log("📦 Package ID:", validatorPoolPackageId)
      console.log("👤 Current account:", currentAccount?.address || "Not connected (public mode)")
      console.log("📡 IOTA Client available:", !!iotaClient)
      
      // Method 1: Skip queryObjects method as it's not available in current IOTA client
      // We'll rely on event-based discovery which is more reliable
      console.log("🔍 Method 1: Skipped - using event-based discovery for better compatibility")

      // Method 2: Try event-based discovery with multiple event type formats
      console.log("🔍 Starting event-based discovery...")
      const eventTypeVariants = [
        `${validatorPoolPackageId}::validator_pool::PoolCreated`, // Most likely correct path
        `${validatorPoolPackageId}::node_validator::validator_pool::PoolCreated`, 
        `${validatorPoolPackageId}::node_validator::PoolCreated`
      ]

      for (const eventType of eventTypeVariants) {
        try {
          console.log(`🔍 Method 2: Trying event type: ${eventType}`)
          
          const events = await iotaClient.queryEvents({
            query: {
              MoveEventType: eventType
            },
            limit: 50,
            order: 'descending'
          })
          
          console.log(`📊 Found ${events.data.length} events for ${eventType}`)

          if (events.data.length > 0) {
            const pools: ValidatorPoolData[] = []
            
            for (const event of events.data) {
              if (event.parsedJson && typeof event.parsedJson === 'object') {
                const eventData = event.parsedJson as any
                console.log("📄 Event data:", eventData)
                
                // Try different field names for pool ID
                let poolId = eventData.pool_id || eventData.poolId || eventData.id
                
                if (poolId) {
                  console.log(`🔍 Fetching pool object: ${poolId}`)
                  try {
                    const poolObject = await iotaClient.getObject({
                      id: poolId,
                      options: {
                        showContent: true,
                        showType: true
                      }
                    })
                    
                    if (poolObject.data) {
                      console.log("📦 Pool object type:", poolObject.data.type)
                      const poolData = parseValidatorPoolData(poolObject.data)
                      if (poolData) {
                        pools.push(poolData)
                        console.log("✅ Successfully parsed pool from event")
                      } else {
                        console.log("❌ Failed to parse pool from event")
                      }
                    }
                  } catch (objError) {
                    console.warn("❌ Could not fetch pool object:", poolId, objError)
                  }
                } else {
                  console.log("❌ No pool ID found in event data")
                }
              }
            }

            if (pools.length > 0) {
              console.log(`🎉 Successfully found ${pools.length} pools via events`)
              console.log("📋 Pools found:", pools.map(p => ({ id: p.objectId, status: p.status })))
              return pools
            }
          }
        } catch (eventError) {
          console.log("❌ Event query failed for", eventType, ":", eventError)
          console.log("❌ Error details:", JSON.stringify(eventError, null, 2))
        }
      }

      // Method 3: If user is connected, try to find pools they own or participated in
      if (currentAccount?.address) {
        console.log(`🔍 Method 3: Finding pools via user objects for ${currentAccount.address}`)
        try {
          const capStructType = `${validatorPoolPackageId}::node_validator::validator_pool::OperatorCap`
          console.log("📝 OperatorCap struct type:", capStructType)
          
          // Find OperatorCaps owned by user (indicates pools they created)
          const operatorCaps = await iotaClient.getOwnedObjects({
            owner: currentAccount.address,
            filter: {
              StructType: capStructType,
            },
            options: { showContent: true, showType: true }
          })

          console.log(`📊 Found ${operatorCaps.data.length} operator caps`)
          
          if (operatorCaps.data.length > 0) {
            const pools: ValidatorPoolData[] = []
            
            for (const capObj of operatorCaps.data) {
              console.log("🔍 Processing operator cap:", capObj.data?.objectId)
              const capData = parseOperatorCapData(capObj.data!)
              if (capData?.poolId) {
                console.log(`🔍 Fetching pool from cap: ${capData.poolId}`)
                try {
                  const poolObject = await iotaClient.getObject({
                    id: capData.poolId,
                    options: { showContent: true, showType: true }
                  })
                  
                  if (poolObject.data) {
                    console.log("📦 Pool object from cap type:", poolObject.data.type)
                    const poolData = parseValidatorPoolData(poolObject.data)
                    if (poolData) {
                      pools.push(poolData)
                      console.log("✅ Successfully parsed pool from operator cap")
                    }
                  }
                } catch (poolError) {
                  console.warn("❌ Could not fetch pool via operator cap:", capData.poolId, poolError)
                }
              }
            }

            if (pools.length > 0) {
              console.log(`🎉 Found ${pools.length} pools via operator caps`)
              return pools
            }
          }
          
          // Also try to find Contributor objects
          console.log("🔍 Method 3b: Looking for Contributor objects...")
          const contributorStructType = `${validatorPoolPackageId}::node_validator::validator_pool::Contributor`
          console.log("📝 Contributor struct type:", contributorStructType)
          
          const contributors = await iotaClient.getOwnedObjects({
            owner: currentAccount.address,
            filter: {
              StructType: contributorStructType,
            },
            options: { showContent: true, showType: true }
          })

          console.log(`📊 Found ${contributors.data.length} contributor objects`)
          
          if (contributors.data.length > 0) {
            const pools: ValidatorPoolData[] = []
            
            for (const contribObj of contributors.data) {
              console.log("🔍 Processing contributor:", contribObj.data?.objectId)
              const contribData = parseContributorData(contribObj.data!)
              if (contribData?.poolId) {
                console.log(`🔍 Fetching pool from contributor: ${contribData.poolId}`)
                try {
                  const poolObject = await iotaClient.getObject({
                    id: contribData.poolId,
                    options: { showContent: true, showType: true }
                  })
                  
                  if (poolObject.data) {
                    console.log("📦 Pool object from contributor type:", poolObject.data.type)
                    const poolData = parseValidatorPoolData(poolObject.data)
                    if (poolData && !pools.some(p => p.objectId === poolData.objectId)) {
                      pools.push(poolData)
                      console.log("✅ Successfully parsed pool from contributor")
                    }
                  }
                } catch (poolError) {
                  console.warn("❌ Could not fetch pool via contributor:", contribData.poolId, poolError)
                }
              }
            }

            if (pools.length > 0) {
              console.log(`🎉 Found ${pools.length} pools via contributors`)
              return pools
            }
          }
        } catch (userError) {
          console.log("❌ User-based query failed:", userError)
        }
      } else {
        console.log("⚠️ No current account connected for user-based search")
      }

      // Method 4: As a fallback, return sample/demo pool if nothing found
      console.log("🔍 Method 4: No pools discovered via blockchain queries")
      console.log("💡 Tip: Try creating a pool first, then it will appear in the list")

      console.log("❌ No pools found via any method")
      console.log("💡 This might mean:")
      console.log("   1. No pools have been created yet")
      console.log("   2. Wrong package ID or module path")
      console.log("   3. Network connectivity issue")
      console.log("   4. Pools exist but are not discoverable via current methods")
      console.log("   5. Pool discovery requires wallet connection on this network")
      return []
    } catch (error) {
      console.error("💥 Error fetching all pools:", error)
      console.error("💥 Error details:", JSON.stringify(error, null, 2))
      return []
    }
  }, [iotaClient, validatorPoolPackageId])

  // ============================================================================
  // POOL OPERATIONS
  // ============================================================================

  const createPool = useCallback(async (params: CreatePoolParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isCreatingPool: true, isPending: true, error: null })

      const tx = new Transaction()
      
      // create_pool returns (ValidatorPool, OperatorCap) and transfers them automatically
      tx.moveCall({
        arguments: [
          tx.pure.u64(params.requiredStake),
          tx.pure.u8(params.operatorRewardPct)
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::create_pool`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                const { effects } = await iotaClient.waitForTransaction({
                  digest,
                  options: { showEffects: true },
                })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isCreatingPool: false,
                  isConfirming: false 
                })

                resolve({ 
                  success: true, 
                  transactionHash: digest,
                  data: effects?.created 
                })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isCreatingPool: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isCreatingPool: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isCreatingPool: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const stake = useCallback(async (params: StakeParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isStaking: true, isPending: true, error: null })

      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.gas, [params.amount])
      
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          coin
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::stake`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isStaking: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isStaking: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isStaking: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isStaking: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const activatePool = useCallback(async (params: ActivatePoolParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isActivating: true, isPending: true, error: null })

      const tx = new Transaction()
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          tx.object(params.operatorCapObjectId)
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::activate_pool`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isActivating: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isActivating: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isActivating: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isActivating: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const recordReward = useCallback(async (params: RecordRewardParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isRecordingReward: true, isPending: true, error: null })

      const tx = new Transaction()
      const [coin] = tx.splitCoins(tx.gas, [params.rewardAmount])
      
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          coin
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::record_reward`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isRecordingReward: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isRecordingReward: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isRecordingReward: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isRecordingReward: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const claimReward = useCallback(async (params: ClaimRewardParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isClaimingReward: true, isPending: true, error: null })

      const tx = new Transaction()
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          tx.object(params.contributorObjectId)
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::claim_reward`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isClaimingReward: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isClaimingReward: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isClaimingReward: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isClaimingReward: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const claimOperatorReward = useCallback(async (params: ClaimOperatorRewardParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isClaimingReward: true, isPending: true, error: null })

      const tx = new Transaction()
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          tx.object(params.operatorCapObjectId)
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::claim_operator_reward`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isClaimingReward: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isClaimingReward: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isClaimingReward: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isClaimingReward: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  const withdrawStake = useCallback(async (params: WithdrawStakeParams): Promise<PoolOperationResult> => {
    if (!currentAccount?.address || !validatorPoolPackageId) {
      return { success: false, error: new Error("Account or package ID not available") }
    }

    try {
      updateState({ isWithdrawingStake: true, isPending: true, error: null })

      const tx = new Transaction()
      tx.moveCall({
        arguments: [
          tx.object(params.poolObjectId),
          tx.object(params.contributorObjectId),
          tx.pure.u64(params.amount)
        ],
        target: `${validatorPoolPackageId}::node_validator::validator_pool::withdraw_stake`,
      })

      return new Promise((resolve) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                updateState({ hash: digest, isConfirming: true })
                
                await iotaClient.waitForTransaction({ digest })

                updateState({ 
                  isConfirmed: true, 
                  isPending: false, 
                  isWithdrawingStake: false,
                  isConfirming: false 
                })

                resolve({ success: true, transactionHash: digest })
              } catch (waitError) {
                const error = waitError instanceof Error ? waitError : new Error(String(waitError))
                updateState({ 
                  error, 
                  isPending: false, 
                  isWithdrawingStake: false,
                  isConfirming: false 
                })
                resolve({ success: false, error })
              }
            },
            onError: (err) => {
              const error = err instanceof Error ? err : new Error(String(err))
              updateState({ 
                error, 
                isPending: false, 
                isWithdrawingStake: false,
                isConfirming: false 
              })
              resolve({ success: false, error })
            },
          }
        )
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      updateState({ 
        error, 
        isPending: false, 
        isWithdrawingStake: false,
        isConfirming: false 
      })
      return { success: false, error }
    }
  }, [currentAccount, validatorPoolPackageId, signAndExecute, iotaClient, updateState])

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const getPoolData = useCallback(async (poolId: string): Promise<ValidatorPoolData | null> => {
    console.log("🏊 getPoolData called with poolId:", poolId)
    
    if (!poolId) {
      console.error("❌ getPoolData: poolId is empty or undefined")
      return null
    }
    
    if (!isValidAddress(poolId)) {
      console.error("❌ getPoolData: invalid poolId format:", poolId)
      return null
    }
    
    try {
      console.log("🏊 getObject parameters:", {
        id: poolId,
        options: { showContent: true }
      })
      
      // Validate that poolId looks like a valid object ID
      if (!poolId.startsWith('0x') || poolId.length !== 66) {
        console.error("❌ Invalid poolId format - should be 0x + 64 hex chars:", poolId, "length:", poolId.length)
        return null
      }
      
      const response = await iotaClient.getObject({
        id: poolId,
        options: { showContent: true }
      })
      
      console.log("🏊 getPoolData response:", response)

      if (!response.data) return null
      return parseValidatorPoolData(response.data)
    } catch (error) {
      console.error("💥 Error fetching pool data:", error)
      console.error("💥 Error details:", JSON.stringify(error, null, 2)) 
      console.error("💥 Context:", { poolId })
      return null
    }
  }, [iotaClient])

  const getContributorData = useCallback(async (userAddress: string, poolId?: string): Promise<ContributorData[]> => {
    console.log("👥 getContributorData called with:", { userAddress, poolId })
    
    if (!userAddress) {
      console.error("❌ getContributorData: userAddress is empty or undefined")
      return []
    }
    
    if (!isValidAddress(userAddress)) {
      console.error("❌ getContributorData: invalid userAddress format:", userAddress)
      return []
    }
    
    if (!validatorPoolPackageId) {
      console.error("❌ getContributorData: validatorPoolPackageId is not available")
      return []
    }
    
    try {
      // Try different struct type variants
      const structTypeVariants = [
        `${validatorPoolPackageId}::node_validator::validator_pool::Contributor`,
        `${validatorPoolPackageId}::validator_pool::Contributor`,
        `${validatorPoolPackageId}::node_validator::Contributor`
      ]
      
      console.log("📝 Trying Contributor struct type variants:", structTypeVariants)
      
      let response: Awaited<ReturnType<typeof iotaClient.getOwnedObjects>> | null = null
      let usedStructType = ""
      
      for (const structType of structTypeVariants) {
        try {
          console.log("📝 Attempting struct type:", structType)
          console.log("📝 getOwnedObjects parameters:", {
            owner: userAddress,
            filter: { StructType: structType },
            options: { showContent: true }
          })
          
          response = await iotaClient.getOwnedObjects({
            owner: userAddress,
            filter: {
              StructType: structType,
            },
            options: { showContent: true }
          })
          
          usedStructType = structType
          console.log("✅ Success with struct type:", structType)
          break
        } catch (structError) {
          console.log("❌ Failed with struct type:", structType, structError)
        }
      }
      
      if (!response) {
        console.error("❌ All struct type variants failed for Contributor")
        return []
      }

      console.log("📊 getContributorData raw response:", response.data.length, "objects")
      
      const contributors = response.data
        .map(item => parseContributorData(item.data!))
        .filter((contributor): contributor is ContributorData => contributor !== null)

      console.log("📊 getContributorData parsed:", contributors.length, "contributors")

      if (poolId) {
        const filtered = contributors.filter(contributor => contributor.poolId === poolId)
        console.log("📊 getContributorData filtered for poolId:", filtered.length, "contributors")
        return filtered
      }

      return contributors
    } catch (error) {
      console.error("💥 Error fetching contributor data:", error)
      console.error("💥 Error details:", JSON.stringify(error, null, 2))
      console.error("💥 Context:", { userAddress, poolId, validatorPoolPackageId })
      return []
    }
  }, [iotaClient, validatorPoolPackageId])

  const getOperatorCaps = useCallback(async (userAddress: string): Promise<OperatorCapData[]> => {
    console.log("👑 getOperatorCaps called with userAddress:", userAddress)
    
    if (!userAddress) {
      console.error("❌ getOperatorCaps: userAddress is empty or undefined")
      return []
    }
    
    if (!isValidAddress(userAddress)) {
      console.error("❌ getOperatorCaps: invalid userAddress format:", userAddress)
      return []
    }
    
    if (!validatorPoolPackageId) {
      console.error("❌ getOperatorCaps: validatorPoolPackageId is not available")
      return []
    }
    
    try {
      // Try different struct type variants  
      const structTypeVariants = [
        `${validatorPoolPackageId}::node_validator::validator_pool::OperatorCap`,
        `${validatorPoolPackageId}::validator_pool::OperatorCap`,
        `${validatorPoolPackageId}::node_validator::OperatorCap`
      ]
      
      console.log("👑 Trying OperatorCap struct type variants:", structTypeVariants)
      
      let response: Awaited<ReturnType<typeof iotaClient.getOwnedObjects>> | null = null
      let usedStructType = ""
      
      for (const structType of structTypeVariants) {
        try {
          console.log("👑 Attempting struct type:", structType)
          console.log("👑 getOwnedObjects parameters:", {
            owner: userAddress,
            filter: { StructType: structType },
            options: { showContent: true }
          })
          
          response = await iotaClient.getOwnedObjects({
            owner: userAddress,
            filter: {
              StructType: structType,
            },
            options: { showContent: true }
          })
          
          usedStructType = structType
          console.log("✅ Success with struct type:", structType)
          break
        } catch (structError) {
          console.log("❌ Failed with struct type:", structType, structError)
        }
      }
      
      if (!response) {
        console.error("❌ All struct type variants failed for OperatorCap")
        return []
      }

      console.log("📊 getOperatorCaps raw response:", response.data.length, "objects")
      
      const caps = response.data
        .map(item => parseOperatorCapData(item.data!))
        .filter((cap): cap is OperatorCapData => cap !== null)
      
      console.log("📊 getOperatorCaps parsed:", caps.length, "caps")
      return caps
    } catch (error) {
      console.error("💥 Error fetching operator caps:", error)
      console.error("💥 Error details:", JSON.stringify(error, null, 2))
      console.error("💥 Context:", { userAddress, validatorPoolPackageId })
      return []
    }
  }, [iotaClient, validatorPoolPackageId])

  const getPoolDisplayInfo = useCallback(async (poolId: string, userAddress?: string): Promise<PoolDisplayInfo> => {
    console.log("📊 getPoolDisplayInfo called with:", { poolId, userAddress: userAddress || "Not provided (public view)" })
    
    // Validate pool ID
    if (!poolId) {
      throw new Error(`Invalid poolId: ${poolId}`)
    }
    
    if (!isValidAddress(poolId)) {
      throw new Error(`Invalid poolId format: ${poolId}`)
    }
    
    // Validate userAddress only if provided
    if (userAddress && !isValidAddress(userAddress)) {
      throw new Error(`Invalid userAddress format: ${userAddress}`)
    }
    
    let poolData: ValidatorPoolData | null = null
    let contributorData: ContributorData[] = []
    let operatorCaps: OperatorCapData[] = []
    
    try {
      // Always get pool data
      poolData = await getPoolData(poolId)
      
      // Only get user-specific data if userAddress is provided
      if (userAddress) {
        const [contributions, caps] = await Promise.all([
          getContributorData(userAddress, poolId),
          getOperatorCaps(userAddress)
        ])
        contributorData = contributions
        operatorCaps = caps
      }
      
      console.log("📊 getPoolDisplayInfo results:", { 
        poolData: !!poolData, 
        contributorData: contributorData.length, 
        operatorCaps: operatorCaps.length,
        isPublicView: !userAddress 
      })
    } catch (paramError) {
      console.error("💥 Error in Promise.all for getPoolDisplayInfo:", paramError)
      throw paramError
    }

    if (!poolData) {
      throw new Error("Pool not found")
    }

    const userContributor = contributorData[0] || null
    const isOperator = operatorCaps.some(cap => cap.poolId === poolId)

    const progress = poolData.requiredStake !== "0" 
      ? Math.min((parseInt(poolData.totalStake) / parseInt(poolData.requiredStake)) * 100, 100)
      : 0

    const userPendingReward = userContributor 
      ? calculatePendingReward(poolData, userContributor)
      : "0"

    return {
      poolId,
      status: poolData.status,
      statusText: getPoolStatusText(poolData.status),
      totalStake: poolData.totalStake,
      requiredStake: poolData.requiredStake,
      progress,
      operatorRewardPct: poolData.operatorRewardPct,
      accumulatedReward: poolData.accumulatedReward,
      userStake: userContributor?.stakedAmount || "0",
      userPendingReward,
      isOperator,
    }
  }, [getPoolData, getContributorData, getOperatorCaps, iotaClient, validatorPoolPackageId])

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const calculatePendingReward = useCallback((poolData: ValidatorPoolData, contributorData: ContributorData): string => {
    if (poolData.status !== POOL_STATUS.ACTIVE || contributorData.stakedAmount === "0") {
      return "0"
    }

    const stakedAmount = parseInt(contributorData.stakedAmount)
    const rewardPerStake = parseInt(poolData.rewardPerStake)
    const rewardDebt = parseInt(contributorData.rewardDebt)

    const totalReward = (stakedAmount * rewardPerStake / 1000000) - rewardDebt
    const userReward = totalReward * (100 - poolData.operatorRewardPct) / 100

    return Math.max(userReward, 0).toString()
  }, [])

  const getPoolStatusText = useCallback((status: PoolStatus): string => {
    switch (status) {
      case POOL_STATUS.COLLECTING:
        return "Collecting Stakes"
      case POOL_STATUS.READY:
        return "Ready for Activation"
      case POOL_STATUS.ACTIVE:
        return "Active"
      default:
        return "Unknown"
    }
  }, [])

  const isValidAddress = useCallback((address: string): boolean => {
    return /^0x[a-fA-F0-9]{64}$/.test(address.trim())
  }, [])

  // ============================================================================
  // RETURN HOOK INTERFACE
  // ============================================================================

  return {
    state,
    getAllPools,
    getPoolData,
    getContributorData,
    getOperatorCaps,
    getPoolDisplayInfo,
    createPool,
    stake,
    activatePool,
    recordReward,
    claimReward,
    claimOperatorReward,
    withdrawStake,
    calculatePendingReward,
    getPoolStatusText,
    isValidAddress,
    clearError,
    resetState,
  }
}