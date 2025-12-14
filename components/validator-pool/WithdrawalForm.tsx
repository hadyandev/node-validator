"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Text, TextField, Button, Callout, Separator, Tabs } from "@radix-ui/themes"
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons"
import { useValidatorPool } from "@/hooks/useValidatorPool"
import { ValidatorPoolData, ContributorData, WithdrawStakeFormData, POOL_STATUS } from "@/lib/types/validator-pool"

interface WithdrawalFormProps {
  poolData: ValidatorPoolData
  contributorData: ContributorData[]
  onSuccess?: () => void
  onCancel?: () => void
}

export const WithdrawalForm = ({ poolData, contributorData, onSuccess, onCancel }: WithdrawalFormProps) => {
  const { withdrawStake, claimReward, calculatePendingReward, state, clearError } = useValidatorPool()
  
  const [formData, setFormData] = useState<WithdrawStakeFormData>({
    amount: "",
    isValidAmount: false,
    maxAmount: "0"
  })

  const [selectedContribution, setSelectedContribution] = useState<ContributorData | null>(null)
  const [activeTab, setActiveTab] = useState("withdraw")

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount) / 1_000_000_000
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  const validateAmount = useCallback((amount: string): boolean => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return false
    
    const maxWithdrawal = selectedContribution ? parseFloat(selectedContribution.stakedAmount) : 0
    return num * 1_000_000_000 <= maxWithdrawal
  }, [selectedContribution])

  const handleAmountChange = (value: string) => {
    const isValid = validateAmount(value)
    setFormData(prev => ({
      ...prev,
      amount: value,
      isValidAmount: isValid
    }))
    
    if (state.error) {
      clearError()
    }
  }

  const handleMaxClick = () => {
    if (selectedContribution) {
      const maxAmount = parseFloat(selectedContribution.stakedAmount) / 1_000_000_000
      handleAmountChange(maxAmount.toString())
    }
  }

  const handleContributionSelect = (contribution: ContributorData) => {
    setSelectedContribution(contribution)
    setFormData(prev => ({
      ...prev,
      amount: "",
      isValidAmount: false,
      maxAmount: contribution.stakedAmount
    }))
  }

  const handleWithdrawStake = async () => {
    if (!selectedContribution || !formData.isValidAmount) return

    try {
      const amountInNano = Math.floor(parseFloat(formData.amount) * 1_000_000_000)
      const result = await withdrawStake({
        poolObjectId: poolData.objectId,
        contributorObjectId: selectedContribution.objectId,
        amount: amountInNano.toString()
      })

      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to withdraw stake:", err)
    }
  }

  const handleClaimReward = async (contribution: ContributorData) => {
    try {
      const result = await claimReward({
        poolObjectId: poolData.objectId,
        contributorObjectId: contribution.objectId
      })

      if (result.success && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error("Failed to claim reward:", err)
    }
  }

  // Set first contribution as default selection
  useEffect(() => {
    if (contributorData.length > 0 && !selectedContribution) {
      handleContributionSelect(contributorData[0])
    }
  }, [contributorData, selectedContribution])

  if (contributorData.length === 0) {
    return (
      <Card size="4" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <InfoCircledIcon style={{ fontSize: "2rem", color: "#64748b", marginBottom: "1rem" }} />
          <Text size="4" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
            No Stakes Found
          </Text>
          <Text size="2" color="gray">
            You don't have any stakes in this pool to withdraw.
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
    <Card size="4" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Text size="5" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
          Withdraw Stakes & Claim Rewards
        </Text>
        <Text size="2" color="gray">
          Manage your stakes and claim accumulated rewards from the validator pool.
        </Text>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="withdraw">Withdraw Stakes</Tabs.Trigger>
          <Tabs.Trigger value="rewards">Claim Rewards</Tabs.Trigger>
        </Tabs.List>

        {/* Withdraw Stakes Tab */}
        <Tabs.Content value="withdraw" style={{ marginTop: "1.5rem" }}>
          {/* Contribution Selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "1rem" }}>
              Select Stake Position
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {contributorData.map((contribution, index) => (
                <div
                  key={contribution.objectId}
                  onClick={() => handleContributionSelect(contribution)}
                  style={{
                    padding: "1rem",
                    backgroundColor: selectedContribution?.objectId === contribution.objectId ? "#e0f2fe" : "#f8f9fa",
                    borderRadius: "8px",
                    border: selectedContribution?.objectId === contribution.objectId ? "2px solid #0ea5e9" : "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text size="2" weight="medium">Position #{index + 1}</Text>
                      <Text size="1" color="gray" style={{ display: "block" }}>
                        Staked: {formatAmount(contribution.stakedAmount)} IOTA
                      </Text>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Text size="1" color="gray">Pending Reward</Text>
                      <Text size="2" weight="medium">
                        {formatAmount(calculatePendingReward(poolData, contribution))} IOTA
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedContribution && (
            <>
              {/* Amount Input */}
              <div style={{ marginBottom: "1rem" }}>
                <label>
                  <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
                    Withdrawal Amount (IOTA) *
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
                
                {/* Amount Validation */}
                {formData.amount && (
                  <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {formData.isValidAmount ? (
                      <>
                        <CheckCircledIcon color="green" />
                        <Text size="1" color="green">Valid withdrawal amount</Text>
                      </>
                    ) : (
                      <>
                        <CrossCircledIcon color="red" />
                        <Text size="1" color="red">
                          {parseFloat(formData.amount) <= 0 ? "Amount must be greater than 0" : "Amount exceeds your stake"}
                        </Text>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Withdrawal Preview */}
              {formData.isValidAmount && (
                <div style={{ 
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  backgroundColor: "#fef7cd",
                  borderRadius: "8px"
                }}>
                  <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.75rem" }}>
                    Withdrawal Preview
                  </Text>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text size="1" color="gray">Withdrawal Amount:</Text>
                      <Text size="1">{parseFloat(formData.amount).toLocaleString()} IOTA</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text size="1" color="gray">Remaining Stake:</Text>
                      <Text size="1">
                        {((parseFloat(selectedContribution.stakedAmount) - parseFloat(formData.amount) * 1_000_000_000) / 1_000_000_000).toLocaleString()} IOTA
                      </Text>
                    </div>
                  </div>
                </div>
              )}

              {/* Withdraw Button */}
              <Button 
                size="3"
                onClick={handleWithdrawStake}
                loading={state.isPending || state.isWithdrawingStake}
                disabled={!formData.isValidAmount || state.isPending}
                style={{ width: "100%", marginBottom: "1rem" }}
              >
                {state.isPending ? "Processing..." : "Withdraw Stake"}
              </Button>
            </>
          )}
        </Tabs.Content>

        {/* Claim Rewards Tab */}
        <Tabs.Content value="rewards" style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "1rem" }}>
              Available Rewards
            </Text>
            
            {contributorData.map((contribution, index) => {
              const pendingReward = calculatePendingReward(poolData, contribution)
              const hasRewards = parseFloat(pendingReward) > 0

              return (
                <div
                  key={contribution.objectId}
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    marginBottom: "1rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text size="2" weight="medium">Position #{index + 1}</Text>
                      <Text size="1" color="gray" style={{ display: "block" }}>
                        {formatAmount(contribution.stakedAmount)} IOTA staked
                      </Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <Text size="1" color="gray">Pending Reward</Text>
                        <Text size="2" weight="bold" color={hasRewards ? "green" : "gray"}>
                          {formatAmount(pendingReward)} IOTA
                        </Text>
                      </div>
                      <Button 
                        size="2"
                        variant={hasRewards ? "solid" : "soft"}
                        color={hasRewards ? "green" : "gray"}
                        onClick={() => handleClaimReward(contribution)}
                        loading={state.isPending || state.isClaimingReward}
                        disabled={!hasRewards || state.isPending}
                      >
                        {hasRewards ? "Claim" : "No Rewards"}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Tabs.Content>
      </Tabs.Root>

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