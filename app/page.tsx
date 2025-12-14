"use client"

import { useState } from "react"
import { Button, Text } from "@radix-ui/themes"
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@iota/dapp-kit"
import { PoolDashboard } from "@/components/validator-pool"

export default function Home() {
  const currentAccount = useCurrentAccount()
  const { mutate: disconnectWallet } = useDisconnectWallet()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Text size="2" weight="bold" className="text-white">I</Text>
                </div>
                <Text size="4" weight="bold" className="text-slate-900">
                  IOTA Validator Pool
                </Text>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-3">
              {currentAccount ? (
                <div className="flex items-center space-x-3">
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <Text size="2" className="text-slate-700">Connected</Text>
                      <Text size="2" className="text-slate-500 font-mono">
                        {`${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`}
                      </Text>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="2"
                    onClick={() => disconnectWallet()}
                    className="hover:bg-slate-50"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  size="3"
                  onClick={() => setModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Text size="6" weight="bold" className="text-slate-900 block mb-2">
            Validator Staking Pools
          </Text>
          <Text size="3" className="text-slate-600">
            Participate in IOTA network validation and earn rewards through our secure staking pools
          </Text>
        </div>
        
        <PoolDashboard />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <Text size="2" className="text-slate-500">
              IOTA Validator Pool Platform • Powered by IOTA Move & Next.js
            </Text>
          </div>
        </div>
      </footer>

      {/* Connect Modal */}
      <ConnectModal
        trigger={<div />}
        open={modalOpen}
        onOpenChange={(isOpen) => setModalOpen(isOpen)}
      />
    </div>
  )
}
