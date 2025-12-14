"use client"

import { useState } from "react"
import { Card, Text, TextField, Button, Callout } from "@radix-ui/themes"
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons"
import { useValidatorPool } from "@/hooks/useValidatorPool"
import { CreatePoolFormData } from "@/lib/types/validator-pool"

interface CreatePoolFormProps {
  onSuccess?: (poolId: string) => void
  onCancel?: () => void
}

export const CreatePoolForm = ({ onSuccess, onCancel }: CreatePoolFormProps) => {
  const { createPool, state, clearError } = useValidatorPool()
  
  const [formData, setFormData] = useState<CreatePoolFormData>({
    requiredStake: "",
    operatorRewardPct: 5,
    isValidRequiredStake: false,
    isValidRewardPct: true
  })

  const validateRequiredStake = (stake: string): boolean => {
    const num = parseFloat(stake)
    return !isNaN(num) && num >= 1000 // Minimum 1000 IOTA
  }

  const validateRewardPct = (pct: number): boolean => {
    return pct >= 0 && pct <= 50 // 0-50% operator reward
  }

  const handleRequiredStakeChange = (value: string) => {
    const isValid = validateRequiredStake(value)
    setFormData(prev => ({
      ...prev,
      requiredStake: value,
      isValidRequiredStake: isValid
    }))
    
    if (state.error) {
      clearError()
    }
  }

  const handleRewardPctChange = (value: string) => {
    const pct = parseFloat(value)
    const isValid = validateRewardPct(pct)
    setFormData(prev => ({
      ...prev,
      operatorRewardPct: isNaN(pct) ? 0 : pct,
      isValidRewardPct: isValid
    }))
    
    if (state.error) {
      clearError()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.isValidRequiredStake || !formData.isValidRewardPct) {
      return
    }

    try {
      const stakeInNano = Math.floor(parseFloat(formData.requiredStake) * 1_000_000_000)
      const result = await createPool({
        requiredStake: stakeInNano.toString(),
        operatorRewardPct: formData.operatorRewardPct
      })

      if (result.success && onSuccess) {
        // Extract pool ID from transaction effects if available
        onSuccess(result.transactionHash || "")
      }
    } catch (err) {
      console.error("Failed to create pool:", err)
    }
  }

  return (
    <Card size="4" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "2rem" }}>
          <Text size="5" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
            Create Validator Pool
          </Text>
          <Text size="2" color="gray">
            Create a new validator pool and become the pool operator. You'll set the staking threshold and reward structure.
          </Text>
        </div>

        {/* Required Stake Input */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
              Required Stake Amount (IOTA) *
            </Text>
            <TextField.Root
              placeholder="10000"
              value={formData.requiredStake}
              onChange={(e) => handleRequiredStakeChange(e.target.value)}
              type="number"
              min="1000"
              step="100"
            />
          </label>
          
          {/* Stake Validation Feedback */}
          {formData.requiredStake && (
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {formData.isValidRequiredStake ? (
                <>
                  <CheckCircledIcon color="green" />
                  <Text size="1" color="green">Valid stake amount</Text>
                </>
              ) : (
                <>
                  <CrossCircledIcon color="red" />
                  <Text size="1" color="red">Minimum stake amount is 1,000 IOTA</Text>
                </>
              )}
            </div>
          )}
        </div>

        {/* Operator Reward Percentage */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
              Operator Reward Percentage (%) *
            </Text>
            <TextField.Root
              placeholder="5"
              value={formData.operatorRewardPct.toString()}
              onChange={(e) => handleRewardPctChange(e.target.value)}
              type="number"
              min="0"
              max="50"
              step="0.1"
            />
          </label>
          
          {/* Reward Validation Feedback */}
          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {formData.isValidRewardPct ? (
              <>
                <CheckCircledIcon color="green" />
                <Text size="1" color="green">Valid reward percentage (0-50%)</Text>
              </>
            ) : (
              <>
                <CrossCircledIcon color="red" />
                <Text size="1" color="red">Reward percentage must be between 0% and 50%</Text>
              </>
            )}
          </div>
        </div>

        {/* Info Callout */}
        <Callout.Root size="2" style={{ marginBottom: "1.5rem" }}>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Pool Lifecycle:</strong> Your pool will start in COLLECTING state. Once it reaches the required stake amount, 
            you can activate it to start earning rewards. As the operator, you'll receive a percentage of all rewards.
          </Callout.Text>
        </Callout.Root>

        {/* Pool Creation Details */}
        <div style={{ 
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.75rem" }}>
            Pool Configuration Preview
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Your Role:</Text>
              <Text size="1">Pool Operator (Validator)</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Required Stake:</Text>
              <Text size="1">{formData.requiredStake || "0"} IOTA</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Your Reward Cut:</Text>
              <Text size="1">{formData.operatorRewardPct}%</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text size="1" color="gray">Initial Status:</Text>
              <Text size="1">Collecting Stakes</Text>
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
              <strong>Success!</strong> Pool created successfully.
              {state.hash && (
                <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.8 }}>
                  Transaction: {state.hash}
                </span>
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
            disabled={!formData.isValidRequiredStake || !formData.isValidRewardPct || state.isPending || state.isConfirmed}
            loading={state.isPending || state.isCreatingPool}
          >
            {state.isPending ? (
              state.isConfirming ? "Confirming..." : "Creating Pool..."
            ) : state.isConfirmed ? (
              "Pool Created!"
            ) : (
              "Create Pool"
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
                {state.isConfirming ? "Confirming transaction..." : 
                 state.isConfirmed ? "Pool creation confirmed" : 
                 "Processing transaction..."}
              </Text>
            </div>
            
            {state.hash && (
              <div style={{ 
                marginTop: "0.5rem",
                fontFamily: "monospace",
                wordBreak: "break-all",
                fontSize: "0.85rem",
                color: "#64748b"
              }}>
                {state.hash}
              </div>
            )}
          </div>
        )}
      </form>
    </Card>
  )
}