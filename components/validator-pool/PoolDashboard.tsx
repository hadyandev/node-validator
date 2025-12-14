"use client"

import { useState, useEffect } from "react"
import { Text, Button, Tabs, Dialog, ScrollArea } from "@radix-ui/themes"
import { PlusIcon, EnterIcon, ExitIcon, GearIcon } from "@radix-ui/react-icons"
import { ConnectModal, useCurrentAccount } from "@iota/dapp-kit"
import { useValidatorPool } from "@/hooks/useValidatorPool"
import { ValidatorPoolData, ContributorData, PoolDisplayInfo, OperatorCapData } from "@/lib/types/validator-pool"
import { PoolCard } from "./PoolCard"
import { CreatePoolForm } from "./CreatePoolForm"
import { DepositForm } from "./DepositForm"
import { WithdrawalForm } from "./WithdrawalForm"
import { AdminPanel } from "./AdminPanel"

interface PoolDashboardProps {
  initialPoolId?: string
}

export const PoolDashboard = ({ initialPoolId }: PoolDashboardProps) => {
  const currentAccount = useCurrentAccount()
  const { getAllPools, getPoolData, getContributorData, getPoolDisplayInfo, getOperatorCaps, getPoolStatusText } = useValidatorPool()
  
  const [allPools, setAllPools] = useState<ValidatorPoolData[]>([])
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(initialPoolId || null)
  const [poolData, setPoolData] = useState<ValidatorPoolData | null>(null)
  const [contributorData, setContributorData] = useState<ContributorData[]>([])
  const [displayInfo, setDisplayInfo] = useState<PoolDisplayInfo | null>(null)
  const [operatorCap, setOperatorCap] = useState<OperatorCapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [showCreatePool, setShowCreatePool] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [activeTab, setActiveTab] = useState("overview")

  const loadAllPools = async () => {
    try {
      setIsLoading(true)
      console.log("📱 PoolDashboard: Starting loadAllPools...")
      console.log("📱 PoolDashboard: getAllPools function available:", typeof getAllPools)
      const pools = await getAllPools()
      console.log("📱 PoolDashboard: Loaded pools:", pools.length, pools)
      setAllPools(pools)
      
      // If no selected pool but pools exist, select the first one
      if (!selectedPoolId && pools.length > 0) {
        setSelectedPoolId(pools[0].objectId)
      }
    } catch (err) {
      console.error("Error loading pools:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPoolData = async () => {
    if (!selectedPoolId) {
      console.log("⚠️ loadPoolData: Missing selectedPoolId", { selectedPoolId })
      return
    }

    console.log("📱 loadPoolData starting with:", { selectedPoolId, userAddress: currentAccount?.address || "Not connected (public view)" })

    try {
      // Always get pool data (public info)
      const pool = await getPoolData(selectedPoolId)
      setPoolData(pool)
      
      // Only get user-specific data if wallet is connected
      if (currentAccount?.address) {
        console.log("🔍 Starting user-specific data loading...")
        console.log("📝 Parameters:", { selectedPoolId, userAddress: currentAccount.address })
        
        try {
          console.log("🔍 Step 1: Getting contributor data...")
          const contributions = await getContributorData(currentAccount.address, selectedPoolId)
          console.log("✅ Step 1 completed:", contributions.length, "contributions")
          
          console.log("🔍 Step 2: Getting pool display info...")  
          const info = await getPoolDisplayInfo(selectedPoolId, currentAccount.address)
          console.log("✅ Step 2 completed:", info)
          
          console.log("🔍 Step 3: Getting operator caps...")
          const operatorCaps = await getOperatorCaps(currentAccount.address)
          console.log("✅ Step 3 completed:", operatorCaps.length, "caps")
        
          setContributorData(contributions)
          setDisplayInfo(info)
          // Find operator cap for this specific pool
          const poolOperatorCap = operatorCaps.find(cap => cap.poolId === selectedPoolId)
          setOperatorCap(poolOperatorCap || null)
          
          console.log("✅ All user-specific data loaded successfully")
        } catch (userDataError) {
          console.error("💥 Error loading user-specific data:", userDataError)
          console.error("💥 Error type:", userDataError instanceof Error ? userDataError.message : String(userDataError))
          
          // Set default values on error
          setContributorData([])
          setDisplayInfo(null)
          setOperatorCap(null)
        }
      } else {
        // Public view - set basic display info without user-specific data
        if (pool) {
          const publicDisplayInfo: PoolDisplayInfo = {
            poolId: selectedPoolId,
            status: pool.status,
            statusText: getPoolStatusText(pool.status),
            totalStake: pool.totalStake,
            requiredStake: pool.requiredStake,
            progress: pool.requiredStake !== "0" 
              ? Math.min((parseInt(pool.totalStake) / parseInt(pool.requiredStake)) * 100, 100)
              : 0,
            operatorRewardPct: pool.operatorRewardPct,
            accumulatedReward: pool.accumulatedReward,
            userStake: "0",
            userPendingReward: "0",
            isOperator: false,
          }
          setDisplayInfo(publicDisplayInfo)
        }
        
        // Clear user-specific data for public view
        setContributorData([])
        setOperatorCap(null)
      }
    } catch (err) {
      console.error("💥 Error loading pool data:", err)
      console.error("💥 Error details:", JSON.stringify(err, null, 2))
      console.error("💥 Context:", { selectedPoolId, currentAccount: currentAccount?.address })
      
      // Reset states on error to prevent UI inconsistency
      setPoolData(null)
      setContributorData([])
      setDisplayInfo(null)
      setOperatorCap(null)
    }
  }

  const handleRefresh = () => {
    loadAllPools()
    if (selectedPoolId) {
      loadPoolData()
    }
  }

  const handlePoolCreated = () => {
    setShowCreatePool(false)
    handleRefresh()
  }

  const handleOperationSuccess = () => {
    setShowDeposit(false)
    setShowWithdraw(false)
    setShowAdmin(false)
    handleRefresh()
  }

  useEffect(() => {
    // Load pools on component mount for public viewing (no wallet required)
    console.log("📱 PoolDashboard mounted - loading all pools...")
    loadAllPools()
  }, []) // Empty dependency array - only run on mount

  useEffect(() => {
    // Refresh pools when account changes (login/logout)
    if (currentAccount?.address) {
      console.log("👤 Account connected - refreshing pools...")
      loadAllPools()
    }
  }, [currentAccount?.address])

  useEffect(() => {
    if (selectedPoolId) {
      loadPoolData()
    }
  }, [selectedPoolId, currentAccount?.address]) // Still watch currentAccount to refresh user data when wallet connects

  // Show wallet connection prompt only if trying to access specific pool management features
  const needsWalletForManagement = showDeposit || showWithdraw || showAdmin || showCreatePool
  
  // Show connect wallet prompt only for management actions, not for viewing
  if (!currentAccount && needsWalletForManagement) {
    return (
      <div className="text-center p-16 max-w-2xl mx-auto">
        <div className="text-6xl mb-6">🔒</div>
        <Text size="5" weight="bold" className="block mb-3 text-slate-900">
          Connect Your Wallet
        </Text>
        <Text size="3" className="block mb-8 text-slate-600">
          Please connect your IOTA wallet to manage validator pools and start staking.
        </Text>
        <Button 
          size="3"
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 px-8 py-3"
        >
          Connect Wallet
        </Button>
        
        <ConnectModal
          trigger={<div />}
          open={modalOpen}
          onOpenChange={(isOpen) => setModalOpen(isOpen)}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center p-16 max-w-2xl mx-auto">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <Text size="4" weight="medium" className="text-slate-700">
          Loading validator pools...
        </Text>
        <Text size="2" className="text-slate-500 mt-2">
          Discovering available pools on the IOTA network
        </Text>
      </div>
    )
  }

  if (!poolData && initialPoolId) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "4rem 2rem",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
        <Text size="4" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
          Pool Not Found
        </Text>
        <Text size="2" color="gray" style={{ display: "block", marginBottom: "1.5rem" }}>
          The requested pool could not be found or you don't have access to it.
        </Text>
        <Button onClick={() => setShowCreatePool(true)}>
          <PlusIcon />
          Create New Pool
        </Button>
      </div>
    )
  }

  if (allPools.length === 0 && !isLoading) {
    return (
      <div className="text-center p-16 max-w-2xl mx-auto">
        <div className="text-6xl mb-6">🏦</div>
        <Text size="5" weight="bold" className="block mb-3 text-slate-900">
          No Validator Pools Found
        </Text>
        <Text size="3" className="block mb-8 text-slate-600">
          {currentAccount ? 
            "Create a new validator pool to get started with staking." :
            "No validator pools exist yet. Connect your wallet to create the first pool."
          }
        </Text>
        {currentAccount ? (
          <Button onClick={() => setShowCreatePool(true)} size="3" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 px-8 py-3">
            <PlusIcon />
            Create First Pool
          </Button>
        ) : (
          <Button onClick={() => setModalOpen(true)} size="3" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 px-8 py-3">
            Connect Wallet to Create Pool
          </Button>
        )}
        
        {/* Create Pool Dialog */}
        <Dialog.Root open={showCreatePool} onOpenChange={setShowCreatePool}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Create New Pool</Dialog.Title>
            <ScrollArea style={{ maxHeight: "70vh" }}>
              <CreatePoolForm 
                onSuccess={handlePoolCreated}
                onCancel={() => setShowCreatePool(false)}
              />
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    )
  }

  if (!poolData && allPools.length > 0) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Text size="6" weight="bold" style={{ display: "block", marginBottom: "0.5rem" }}>
            Available Validator Pools
          </Text>
          <Text size="2" color="gray">
            Select a pool to view details and start staking
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {allPools.map((pool) => (
            <div
              key={pool.objectId}
              onClick={() => setSelectedPoolId(pool.objectId)} // Allow viewing pool details without wallet
              className={`
                p-6 bg-white rounded-xl border-2 border-slate-200 cursor-pointer transition-all duration-200
                hover:border-blue-500 hover:shadow-lg hover:scale-[1.02]
                ${!currentAccount ? 'opacity-90' : ''}
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <Text size="4" weight="bold" className="block mb-1 text-slate-900">
                    Pool #{pool.objectId.slice(-8)}
                  </Text>
                  <Text size="2" className="text-slate-600">
                    Operator: {pool.operator.slice(0, 8)}...{pool.operator.slice(-4)}
                  </Text>
                  {!currentAccount && (
                    <Text size="1" className="text-blue-600 mt-1 block">
                      Click to view details • Connect wallet to interact
                    </Text>
                  )}
                </div>
                <div className={`
                  px-3 py-1 rounded-full text-xs font-semibold
                  ${pool.status === 2 ? 'bg-green-100 text-green-800 border border-green-200' : 
                    pool.status === 1 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                    'bg-orange-100 text-orange-800 border border-orange-200'}
                `}>
                  {pool.status === 2 ? "🟢 Active" : pool.status === 1 ? "🔵 Ready" : "🟠 Collecting"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Text size="2" className="text-slate-600 font-medium">Total Stake:</Text>
                  <Text size="2" weight="bold" className="text-slate-900">
                    {(parseFloat(pool.totalStake) / 1_000_000_000).toLocaleString()} IOTA
                  </Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="2" className="text-slate-600 font-medium">Required:</Text>
                  <Text size="2" weight="bold" className="text-slate-900">
                    {(parseFloat(pool.requiredStake) / 1_000_000_000).toLocaleString()} IOTA
                  </Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text size="2" className="text-slate-600 font-medium">Operator Fee:</Text>
                  <Text size="2" weight="bold" className="text-slate-900">{pool.operatorRewardPct}%</Text>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <Text size="2" className="text-slate-600 font-medium">Progress:</Text>
                    <Text size="2" weight="bold" className="text-slate-900">
                      {((parseFloat(pool.totalStake) / parseFloat(pool.requiredStake)) * 100).toFixed(1)}%
                    </Text>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border">
                    <div 
                      className={`h-full transition-all duration-500 ease-out rounded-full ${
                        pool.status === 2 ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                        pool.status === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                        'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (parseFloat(pool.totalStake) / parseFloat(pool.requiredStake)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            onClick={() => currentAccount ? setShowCreatePool(true) : setModalOpen(true)} 
            size="3" 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 px-8 py-3"
          >
            <PlusIcon />
            {currentAccount ? "Create New Pool" : "Connect to Create Pool"}
          </Button>
        </div>

        {/* Create Pool Dialog */}
        <Dialog.Root open={showCreatePool} onOpenChange={setShowCreatePool}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Create New Pool</Dialog.Title>
            <ScrollArea style={{ maxHeight: "70vh" }}>
              <CreatePoolForm 
                onSuccess={handlePoolCreated}
                onCancel={() => setShowCreatePool(false)}
              />
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>
        
        {/* Connect Modal for non-wallet users */}
        <ConnectModal
          trigger={<div />}
          open={modalOpen}
          onOpenChange={(isOpen) => setModalOpen(isOpen)}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "2rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Button 
              variant="ghost" 
              size="1"
              onClick={() => {
                setSelectedPoolId(null)
                setPoolData(null)
              }}
            >
              ← Back to Pools
            </Button>
          </div>
          <Text size="6" weight="bold" style={{ display: "block", marginBottom: "0.25rem" }}>
            Pool #{poolData?.objectId?.slice(-8)}
          </Text>
          <Text size="2" color="gray">
            {currentAccount ? "Manage your staking position and pool operations" : "View pool details • Connect wallet to participate"}
          </Text>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {currentAccount ? (
            <>
              {displayInfo?.isOperator && (
                <Button variant="soft" onClick={() => setShowAdmin(true)}>
                  <GearIcon />
                  Admin
                </Button>
              )}
              
              <Button variant="soft" onClick={() => setShowDeposit(true)}>
                <EnterIcon />
                Deposit
              </Button>
              
              {contributorData.length > 0 && (
                <Button variant="soft" color="red" onClick={() => setShowWithdraw(true)}>
                  <ExitIcon />
                  Withdraw
                </Button>
              )}
            </>
          ) : (
            <Button 
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
            >
              Connect Wallet to Participate
            </Button>
          )}
          
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          {currentAccount && <Tabs.Trigger value="positions">My Positions</Tabs.Trigger>}
          {currentAccount && <Tabs.Trigger value="history">History</Tabs.Trigger>}
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Content value="overview" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {poolData && <PoolCard poolData={poolData} displayInfo={displayInfo || undefined} />}
            
            {/* Quick Actions - only show for connected users */}
            {currentAccount && (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "1rem" 
              }}>
                <Button size="3" onClick={() => setShowDeposit(true)}>
                  <EnterIcon />
                  Deposit IOTA
                </Button>
                
                {contributorData.length > 0 && (
                  <Button size="3" variant="soft" color="red" onClick={() => setShowWithdraw(true)}>
                    <ExitIcon />
                    Withdraw Funds
                  </Button>
                )}
              
              {displayInfo?.isOperator && (
                <Button size="3" variant="soft" onClick={() => setShowAdmin(true)}>
                  <GearIcon />
                  Pool Settings
                </Button>
              )}
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Positions Tab */}
        <Tabs.Content value="positions" style={{ marginTop: "1.5rem" }}>
          {contributorData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Text size="3" weight="medium">Your Stake Positions</Text>
              {contributorData.map((contribution, index) => (
                <div 
                  key={contribution.objectId}
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
                    <div>
                      <Text size="2" weight="medium" style={{ display: "block" }}>
                        Stake Position #{index + 1}
                      </Text>
                      <Text size="1" color="gray">
                        {(parseFloat(contribution.stakedAmount) / 1_000_000_000).toLocaleString()} IOTA staked
                      </Text>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Text size="2" weight="medium">
                        {displayInfo ? 
                          (parseFloat(displayInfo.userPendingReward) / 1_000_000_000).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6
                          })
                          : "0"
                        } IOTA rewards
                      </Text>
                      <Text size="1" color="gray">
                        {poolData && poolData.totalStake !== "0" ? 
                          ((parseFloat(contribution.stakedAmount) / parseFloat(poolData.totalStake)) * 100).toFixed(2) + "%" :
                          "0%"
                        }
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <Text size="3" style={{ display: "block", marginBottom: "0.5rem" }}>
                No Positions Yet
              </Text>
              <Text size="2" color="gray" style={{ display: "block", marginBottom: "1rem" }}>
                Make your first deposit to start earning staking rewards.
              </Text>
              <Button onClick={() => setShowDeposit(true)}>
                <EnterIcon />
                Make First Deposit
              </Button>
            </div>
          )}
        </Tabs.Content>

        {/* History Tab */}
        <Tabs.Content value="history" style={{ marginTop: "1.5rem" }}>
          <div style={{ 
            textAlign: "center", 
            padding: "3rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <Text size="3" style={{ display: "block", marginBottom: "0.5rem" }}>
              Transaction History
            </Text>
            <Text size="2" color="gray">
              Transaction history feature coming soon. You can view your transactions on the IOTA explorer for now.
            </Text>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Dialogs */}
      {poolData && (
        <Dialog.Root open={showDeposit} onOpenChange={setShowDeposit}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Deposit to Pool</Dialog.Title>
            <ScrollArea style={{ maxHeight: "70vh" }}>
              <DepositForm 
                poolData={poolData}
                onSuccess={handleOperationSuccess}
                onCancel={() => setShowDeposit(false)}
              />
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {poolData && (
        <Dialog.Root open={showWithdraw} onOpenChange={setShowWithdraw}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Withdraw from Pool</Dialog.Title>
            <ScrollArea style={{ maxHeight: "70vh" }}>
              <WithdrawalForm 
                poolData={poolData}
                contributorData={contributorData}
                onSuccess={handleOperationSuccess}
                onCancel={() => setShowWithdraw(false)}
              />
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>
      )}

      {displayInfo?.isOperator && poolData && (
        <Dialog.Root open={showAdmin} onOpenChange={setShowAdmin}>
          <Dialog.Content maxWidth="600px">
            <Dialog.Title>Pool Administration</Dialog.Title>
            <ScrollArea style={{ maxHeight: "70vh" }}>
              <AdminPanel 
                poolData={poolData}
                operatorCap={operatorCap}
                onSuccess={handleOperationSuccess}
                onCancel={() => setShowAdmin(false)}
              />
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>
      )}
      
      {/* Connect Modal for non-wallet users */}
      <ConnectModal
        trigger={<div />}
        open={modalOpen}
        onOpenChange={(isOpen) => setModalOpen(isOpen)}
      />
    </div>
  )
}