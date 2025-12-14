"use client"

import { Card, Text, Button, Badge, Progress } from "@radix-ui/themes"
import { ValidatorPoolData, PoolDisplayInfo, POOL_STATUS } from "@/lib/types/validator-pool"

interface PoolCardProps {
  poolData: ValidatorPoolData
  displayInfo?: PoolDisplayInfo
  onSelect?: () => void
  compact?: boolean
}

export const PoolCard = ({ poolData, displayInfo, onSelect, compact = false }: PoolCardProps) => {
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount) / 1_000_000_000 // Convert from nanoIOTA to IOTA
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getStatusColor = (status: number) => {
    switch (status) {
      case POOL_STATUS.COLLECTING:
        return "orange"
      case POOL_STATUS.READY:
        return "blue" 
      case POOL_STATUS.ACTIVE:
        return "green"
      default:
        return "gray"
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case POOL_STATUS.COLLECTING:
        return "Collecting"
      case POOL_STATUS.READY:
        return "Ready"
      case POOL_STATUS.ACTIVE:
        return "Active"
      default:
        return "Unknown"
    }
  }

  const progress = poolData.requiredStake !== "0" 
    ? Math.min((parseInt(poolData.totalStake) / parseInt(poolData.requiredStake)) * 100, 100)
    : 0

  if (compact) {
    return (
      <Card 
        size="2" 
        className={`
          ${onSelect ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'cursor-default'}
          transition-all duration-200 border-l-4
          ${poolData.status === POOL_STATUS.ACTIVE ? 'border-l-green-500 bg-gradient-to-r from-green-50/30' : 
            poolData.status === POOL_STATUS.READY ? 'border-l-blue-500 bg-gradient-to-r from-blue-50/30' : 
            'border-l-orange-500 bg-gradient-to-r from-orange-50/30'}
        `}
        onClick={onSelect}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Text size="3" weight="bold" className="text-slate-900">Pool #{poolData.id.slice(-4)}</Text>
              <Badge 
                color={getStatusColor(poolData.status)} 
                variant="solid" 
                size="1"
                className="px-2 py-1 rounded-full"
              >
                {getStatusText(poolData.status)}
              </Badge>
            </div>
            <Text size="1" className="text-slate-500">
              Operator: {formatAddress(poolData.operator)}
            </Text>
          </div>
          <div className="text-right">
            <Text size="2" weight="bold" className="text-slate-900 block">
              {formatAmount(poolData.totalStake)} IOTA
            </Text>
            {displayInfo && (
              <Text size="1" className="text-slate-500">
                Your stake: {formatAmount(displayInfo.userStake)}
              </Text>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      size="3" 
      className={`
        ${onSelect ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01]' : 'cursor-default'}
        transition-all duration-200 bg-white border border-slate-200
        hover:border-slate-300 overflow-hidden
      `}
      onClick={onSelect}
    >
      {/* Status indicator bar */}
      <div className={`h-1 -mx-4 -mt-4 mb-4 ${
        poolData.status === POOL_STATUS.ACTIVE ? 'bg-gradient-to-r from-green-500 to-green-600' : 
        poolData.status === POOL_STATUS.READY ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
        'bg-gradient-to-r from-orange-500 to-orange-600'
      }`} />

      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Text size="4" weight="bold" className="text-slate-900">
                Validator Pool #{poolData.id.slice(-6)}
              </Text>
              <Badge 
                color={getStatusColor(poolData.status)} 
                variant="solid"
                className="px-3 py-1 rounded-full"
              >
                {getStatusText(poolData.status)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {displayInfo?.isOperator && (
                <Badge color="blue" variant="outline" size="1" className="px-2 py-1 rounded">
                  👑 Operator
                </Badge>
              )}
              <Text size="2" className="text-slate-500">
                Reward: {poolData.operatorRewardPct}% operator fee
              </Text>
            </div>
          </div>
          
          {onSelect && (
            <Button 
              variant="soft" 
              size="2"
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-0"
            >
              Manage Pool
            </Button>
          )}
        </div>

        {/* Pool Progress */}
        {poolData.status !== POOL_STATUS.ACTIVE && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <Text size="2" weight="medium">Staking Progress</Text>
              <Text size="2" color="gray">
                {formatAmount(poolData.totalStake)} / {formatAmount(poolData.requiredStake)} IOTA
              </Text>
            </div>
            <Progress value={progress} size="2" />
            <Text size="1" color="gray" style={{ marginTop: "0.25rem" }}>
              {progress.toFixed(1)}% to activation threshold
            </Text>
          </div>
        )}

        {/* Pool Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: poolData.status === POOL_STATUS.ACTIVE ? "1fr 1fr 1fr" : "1fr 1fr", 
          gap: "1rem",
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <div>
            <Text size="1" color="gray" style={{ display: "block", marginBottom: "0.25rem" }}>
              Total Stake
            </Text>
            <Text size="3" weight="bold">
              {formatAmount(poolData.totalStake)} IOTA
            </Text>
          </div>
          
          <div>
            <Text size="1" color="gray" style={{ display: "block", marginBottom: "0.25rem" }}>
              Operator Reward
            </Text>
            <Text size="3" weight="bold">
              {poolData.operatorRewardPct}%
            </Text>
          </div>

          {poolData.status === POOL_STATUS.ACTIVE && (
            <div>
              <Text size="1" color="gray" style={{ display: "block", marginBottom: "0.25rem" }}>
                Accumulated Rewards
              </Text>
              <Text size="3" weight="bold">
                {formatAmount(poolData.accumulatedReward)} IOTA
              </Text>
            </div>
          )}
        </div>

        {/* Operator Info */}
        <div style={{ marginBottom: "1rem" }}>
          <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
            Pool Operator
          </Text>
          <div style={{ 
            padding: "0.75rem",
            backgroundColor: "#f0f9ff",
            borderRadius: "6px",
            borderLeft: "3px solid #0ea5e9"
          }}>
            <Text size="1" color="gray" style={{ display: "block", marginBottom: "0.25rem" }}>
              Address
            </Text>
            <Text size="2" style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {poolData.operator}
            </Text>
          </div>
        </div>

        {/* User's Position (if available) */}
        {displayInfo && displayInfo.userStake !== "0" && (
          <div style={{ marginBottom: "1rem" }}>
            <Text size="2" weight="medium" style={{ display: "block", marginBottom: "0.5rem" }}>
              Your Position
            </Text>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: poolData.status === POOL_STATUS.ACTIVE ? "1fr 1fr" : "1fr", 
              gap: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#f0fdf4",
              borderRadius: "6px"
            }}>
              <div>
                <Text size="1" color="gray" style={{ display: "block" }}>Your Stake</Text>
                <Text size="2" weight="medium">
                  {formatAmount(displayInfo.userStake)} IOTA
                </Text>
              </div>
              {poolData.status === POOL_STATUS.ACTIVE && (
                <div>
                  <Text size="1" color="gray" style={{ display: "block" }}>Pending Rewards</Text>
                  <Text size="2" weight="medium">
                    {formatAmount(displayInfo.userPendingReward)} IOTA
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pool Status Info */}
        <div style={{ 
          padding: "0.75rem",
          backgroundColor: poolData.status === POOL_STATUS.ACTIVE ? "#f0fdf4" : poolData.status === POOL_STATUS.READY ? "#eff6ff" : "#fff7ed",
          borderRadius: "6px",
          borderLeft: `3px solid ${poolData.status === POOL_STATUS.ACTIVE ? "#22c55e" : poolData.status === POOL_STATUS.READY ? "#3b82f6" : "#f97316"}`
        }}>
          <Text size="1" weight="medium" color="gray" style={{ display: "block", marginBottom: "0.25rem" }}>
            Status
          </Text>
          <Text size="2">
            {poolData.status === POOL_STATUS.COLLECTING && "Accepting stakes to reach threshold"}
            {poolData.status === POOL_STATUS.READY && "Ready for operator to activate validator"}
            {poolData.status === POOL_STATUS.ACTIVE && "Validator is active and earning rewards"}
          </Text>
        </div>
      </div>
    </Card>
  )
}