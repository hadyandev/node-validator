"use client"

import { useState } from "react"
import { Card, Text, Button, Callout, Badge } from "@radix-ui/themes"
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { useCurrentAccount } from "@iota/dapp-kit"
import { useValidatorPool } from "@/hooks/useValidatorPool"
import { ValidatorPoolData, OperatorCapData, POOL_STATUS } from "@/lib/types/validator-pool"

interface AdminPanelProps {
  poolData: ValidatorPoolData
  operatorCap: OperatorCapData | null
  onSuccess?: () => void
  onCancel?: () => void
}

export const AdminPanel = ({ poolData, operatorCap, onSuccess, onCancel }: AdminPanelProps) => {
  const currentAccount = useCurrentAccount()
  const { activatePool, claimOperatorReward, state, clearError } = useValidatorPool()
  
  const [isActivating, setIsActivating] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)

  const handleActivatePool = async () => {
    if (!operatorCap) return

    try {
      setIsActivating(true)
      const result = await activatePool({
        poolObjectId: poolData.objectId,
        operatorCapObjectId: operatorCap.objectId
      })

      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to activate pool:", err)
    } finally {
      setIsActivating(false)
    }
  }

  const handleClaimOperatorReward = async () => {
    if (!operatorCap) return

    try {
      setIsClaiming(true)
      const result = await claimOperatorReward({
        poolObjectId: poolData.objectId,
        operatorCapObjectId: operatorCap.objectId
      })

      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to claim operator reward:", err)
    } finally {
      setIsClaiming(false)
    }
  }

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount) / 1_000_000_000
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  const isOperator = currentAccount?.address === poolData.operator
  
  if (!isOperator) {
    return (
      <Card size="4" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <ExclamationTriangleIcon style={{ fontSize: "2rem", color: "#f59e0b", marginBottom: "1rem" }} />
          <Text size="4" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
            Access Denied
          </Text>
          <Text size="2" color="gray">
            Only the pool operator can access the admin panel.
          </Text>
          
          {onCancel && (
            <Button 
              variant="soft" 
              style={{ marginTop: "1rem" }}
              onClick={onCancel}
            >
              Close
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card size="4" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Text size="5" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
          Pool Operator Panel
        </Text>
        <Text size="2" color="gray">
          Manage your validator pool operations and claim rewards.
        </Text>
      </div>

      {/* Pool Status */}
      <div style={{ marginBottom: "2rem" }}>
        <Text size="3" weight="bold" style={{ display: "block", marginBottom: "1rem" }}>
          Pool Status
        </Text>
        <div style={{ 
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <Text size="2" weight="medium" style={{ display: "block" }}>Current Status</Text>
            <Badge 
              color={poolData.status === POOL_STATUS.ACTIVE ? "green" : poolData.status === POOL_STATUS.READY ? "blue" : "orange"}
              variant="solid"
              style={{ marginTop: "0.25rem" }}
            >
              {poolData.status === POOL_STATUS.COLLECTING && "Collecting Stakes"}
              {poolData.status === POOL_STATUS.READY && "Ready for Activation"}  
              {poolData.status === POOL_STATUS.ACTIVE && "Active"}
            </Badge>
          </div>
          <div style={{ textAlign: "right" }}>
            <Text size="1" color="gray" style={{ display: "block" }}>Total Stake</Text>
            <Text size="3" weight="bold">
              {formatAmount(poolData.totalStake)} IOTA
            </Text>
          </div>
        </div>
      </div>

      {/* Activation Controls */}
      {poolData.status === POOL_STATUS.READY && (
        <div style={{ marginBottom: "2rem" }}>
          <Text size="3" weight="bold" style={{ display: "block", marginBottom: "1rem" }}>
            Pool Activation
          </Text>
          
          <Callout.Root size="2" style={{ marginBottom: "1rem" }}>
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Your pool has reached the required stake threshold of {formatAmount(poolData.requiredStake)} IOTA. 
              You can now activate the validator to start earning rewards.
            </Callout.Text>
          </Callout.Root>

          <Button 
            size="3"
            onClick={handleActivatePool}
            loading={isActivating || state.isActivating}
            disabled={state.isPending}
          >
            {isActivating || state.isActivating ? "Activating..." : "Activate Pool"}
          </Button>
        </div>
      )}

      {/* Operator Rewards */}
      {poolData.status === POOL_STATUS.ACTIVE && (
        <div style={{ marginBottom: "2rem" }}>
          <Text size="3" weight="bold" style={{ display: "block", marginBottom: "1rem" }}>
            Operator Rewards
          </Text>
          
          <div style={{ 
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            marginBottom: "1rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <Text size="2" weight="medium">Available Rewards</Text>
              <Text size="3" weight="bold">
                {formatAmount(poolData.accumulatedReward)} IOTA
              </Text>
            </div>
            <Text size="1" color="gray">
              Operator cut: {poolData.operatorRewardPct}% of total rewards
            </Text>
          </div>

          <Button 
            size="3"
            variant="solid"
            onClick={handleClaimOperatorReward}
            loading={isClaiming || state.isClaimingReward}
            disabled={state.isPending || poolData.accumulatedReward === "0"}
          >
            {isClaiming || state.isClaimingReward ? "Claiming..." : "Claim Operator Rewards"}
          </Button>
        </div>
      )}

      {/* Pool Information */}
      <div style={{ marginBottom: "2rem" }}>
        <Text size="3" weight="bold" style={{ display: "block", marginBottom: "1rem" }}>
          Pool Configuration
        </Text>
        <div style={{ 
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <div>
            <Text size="1" color="gray" style={{ display: "block" }}>Required Stake</Text>
            <Text size="2" weight="medium">{formatAmount(poolData.requiredStake)} IOTA</Text>
          </div>
          <div>
            <Text size="1" color="gray" style={{ display: "block" }}>Operator Reward</Text>
            <Text size="2" weight="medium">{poolData.operatorRewardPct}%</Text>
          </div>
          <div>
            <Text size="1" color="gray" style={{ display: "block" }}>Pool Balance</Text>
            <Text size="2" weight="medium">{formatAmount(poolData.balance)} IOTA</Text>
          </div>
          <div>
            <Text size="1" color="gray" style={{ display: "block" }}>Reward per Stake</Text>
            <Text size="2" weight="medium">{poolData.rewardPerStake}</Text>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <Callout.Root color="red" style={{ marginBottom: "1.5rem" }}>
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Error:</strong> {state.error.message}
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Success Display */}
      {state.isConfirmed && (
        <Callout.Root color="green" style={{ marginBottom: "1.5rem" }}>
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Success!</strong> Operation completed successfully.
            {state.hash && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.8 }}>
                Transaction: {state.hash}
              </div>
            )}
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: "flex", 
        gap: "0.75rem", 
        justifyContent: "flex-end",
        paddingTop: "1rem",
        borderTop: "1px solid #e5e7eb"
      }}>
        {onCancel && (
          <Button 
            type="button" 
            variant="soft" 
            color="gray"
            onClick={onCancel}
            disabled={state.isPending}
          >
            Close
          </Button>
        )}
      </div>
    </Card>
  )
}