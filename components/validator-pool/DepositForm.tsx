"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Text, TextField, Button, Callout, Separator } from "@radix-ui/themes"
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons"
import { useCurrentAccount } from "@iota/dapp-kit"
import { useValidatorPool } from "@/hooks/useValidatorPool"
import { ValidatorPoolData, StakeFormData, POOL_STATUS } from "@/lib/types/validator-pool"

interface DepositFormProps {
  poolData: ValidatorPoolData
  onSuccess?: () => void
  onCancel?: () => void
}

export const DepositForm = ({ poolData, onSuccess, onCancel }: DepositFormProps) => {
  const currentAccount = useCurrentAccount()
  const { stake, state, clearError } = useValidatorPool()
  
  const [formData, setFormData] = useState<StakeFormData>({
    amount: "",
    isValidAmount: false
  })

  const [userBalance, setUserBalance] = useState<string>("0")

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount) / 1_000_000_000 // Convert from nanoIOTA to IOTA
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  const validateAmount = useCallback((amount: string): boolean => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return false
    
    const amountInNano = Math.floor(num * 1_000_000_000)
    const balanceInNano = parseFloat(userBalance)
    
    return amountInNano > 0 && amountInNano <= balanceInNano
  }, [userBalance])

  const handleAmountChange = (value: string) => {
    const isValid = validateAmount(value)
    
    setFormData({
      amount: value,
      isValidAmount: isValid
    })
    
    if (state.error) {
      clearError()
    }
  }

  const handleMaxClick = () => {
    // Reserve some gas for transaction
    const reserveGas = 10_000_000 // 0.01 IOTA for gas
    const maxAmount = Math.max(0, parseFloat(userBalance) - reserveGas) / 1_000_000_000
    handleAmountChange(maxAmount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.isValidAmount || !currentAccount?.address) {
      return
    }

    try {
      const amountInNano = Math.floor(parseFloat(formData.amount) * 1_000_000_000).toString()
      
      const result = await stake({
        poolObjectId: poolData.objectId,
        amount: amountInNano
      })

      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to deposit:", err)
    }
  }

  // Mock balance fetch - replace with actual balance fetching
  useEffect(() => {
    if (currentAccount?.address) {
      // This should fetch actual IOTA balance
      setUserBalance("1000000000000") // 1000 IOTA for demo
    }
  }, [currentAccount])

  const displayBalance = formatAmount(userBalance)
  const amountInNano = formData.isValidAmount ? Math.floor(parseFloat(formData.amount) * 1_000_000_000) : 0

  return (
    <Card size="4" style={{ maxWidth: "500px" }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Text size="4" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
            Stake to Pool
          </Text>
          <Text size="2" color="gray">
            Add IOTA stake to the validator pool. Your contribution will be tracked and earn rewards proportionally.
          </Text>
        </div>

        {/* Pool Info */}
        <div style={{ 
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f0f9ff",
          borderRadius: "8px",
          borderLeft: "3px solid #0ea5e9"
        }}>
          <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
            Pool Information
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Total Stake:</Text>
              <Text size="1">{formatAmount(poolData.totalStake)} IOTA</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Required Stake:</Text>
              <Text size="1">{formatAmount(poolData.requiredStake)} IOTA</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Status:</Text>
              <Text size="1" color={
                poolData.status === POOL_STATUS.ACTIVE ? "green" : 
                poolData.status === POOL_STATUS.READY ? "blue" : 
                "orange"
              }>
                {poolData.status === POOL_STATUS.COLLECTING && "Collecting Stakes"}
                {poolData.status === POOL_STATUS.READY && "Ready for Activation"}
                {poolData.status === POOL_STATUS.ACTIVE && "Active"}
              </Text>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div style={{ 
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Text size="2" color="gray">Available Balance:</Text>
          <Text size="2" weight="medium">{displayBalance} IOTA</Text>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
              Stake Amount (IOTA) *
            </Text>
            <div style={{ position: "relative" }}>
              <TextField.Root
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                type="number"
                step="0.000001"
                min="0"
              />
              <Button
                type="button"
                variant="ghost"
                size="1"
                onClick={handleMaxClick}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.75rem"
                }}
              >
                MAX
              </Button>
            </div>
          </label>
          
          {/* Amount Validation Feedback */}
          {formData.amount && (
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {formData.isValidAmount ? (
                <>
                  <CheckCircledIcon color="green" />
                  <Text size="1" color="green">Valid stake amount</Text>
                </>
              ) : (
                <>
                  <CrossCircledIcon color="red" />
                  <Text size="1" color="red">
                    {parseFloat(formData.amount) <= 0 ? "Amount must be greater than 0" : "Insufficient balance"}
                  </Text>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stake Preview */}
        {formData.isValidAmount && (
          <div style={{ 
            marginBottom: "1.5rem",
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px"
          }}>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.75rem" }}>
              Stake Preview
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text size="1" color="gray">Stake Amount:</Text>
                <Text size="1">{parseFloat(formData.amount).toLocaleString()} IOTA</Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text size="1" color="gray">Pool Progress:</Text>
                <Text size="1" weight="medium">
                  {((parseFloat(poolData.totalStake) + amountInNano) / parseFloat(poolData.requiredStake) * 100).toFixed(1)}%
                </Text>
              </div>
              <Separator size="1" style={{ margin: "0.25rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text size="1" color="gray">Your Pool Share:</Text>
                <Text size="1" weight="medium">
                  {poolData.totalStake === "0" 
                    ? "100%" 
                    : ((amountInNano / (parseFloat(poolData.totalStake) + amountInNano)) * 100).toFixed(2) + "%"
                  }
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Pool Status Warning */}
        {poolData.status !== POOL_STATUS.COLLECTING && poolData.status !== POOL_STATUS.ACTIVE && (
          <Callout.Root color="amber" style={{ marginBottom: "1.5rem" }}>
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <strong>Info:</strong> This pool is ready for activation. Stakes are still accepted but the pool needs operator activation to start earning rewards.
            </Callout.Text>
          </Callout.Root>
        )}

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
              <strong>Success!</strong> Your stake has been added to the pool.
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
              Cancel
            </Button>
          )}
          
          <Button 
            type="submit" 
            disabled={!formData.isValidAmount || state.isPending || state.isConfirmed || (poolData.status !== POOL_STATUS.COLLECTING && poolData.status !== POOL_STATUS.READY && poolData.status !== POOL_STATUS.ACTIVE)}
            loading={state.isPending || state.isStaking}
          >
            {state.isPending ? (
              state.isConfirming ? "Confirming..." : "Staking..."
            ) : state.isConfirmed ? (
              "Stake Confirmed!"
            ) : (
              "Stake IOTA"
            )}
          </Button>
        </div>

        {/* Transaction Status */}
        {(state.isPending || state.isConfirmed) && (
          <div style={{ 
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: state.isConfirmed ? "#f0fdf4" : "#fefce8",
            borderRadius: "6px",
            borderLeft: `3px solid ${state.isConfirmed ? "#22c55e" : "#eab308"}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ 
                width: "8px", 
                height: "8px", 
                borderRadius: "50%", 
                backgroundColor: state.isConfirmed ? "#22c55e" : "#eab308" 
              }} />
              <Text size="1" weight="medium">
                {state.isConfirming ? "Confirming stake..." : 
                 state.isConfirmed ? "Stake confirmed" : 
                 "Processing stake..."}
              </Text>
            </div>
            
            {state.hash && (
              <Text size="1" color="gray" style={{ 
                display: "block", 
                marginTop: "0.5rem",
                fontFamily: "monospace",
                wordBreak: "break-all"
              }}>
                {state.hash}
              </Text>
            )}
          </div>
        )}
      </form>
    </Card>
  )
}