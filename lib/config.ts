/**
 * Network Configuration
 * 
 * Configure your IOTA networks and package IDs here
 */

import { getFullnodeUrl } from "@iota/iota-sdk/client"
import { createNetworkConfig } from "@iota/dapp-kit"

// Package IDs
export const DEVNET_PACKAGE_ID = ""
export const TESTNET_PACKAGE_ID = "0x3fb9efdeb48cca80a0eaf80d4d366e238a050a40197fefe095814a52cb9ced33"
export const MAINNET_PACKAGE_ID = ""

// Validator Pool Package IDs
export const VALIDATOR_POOL_DEVNET_PACKAGE_ID = ""
export const VALIDATOR_POOL_TESTNET_PACKAGE_ID = "0x95c78f7543edfedaeaa4671444b8c214bc7bdc3429d5bc93bac2b7bff6b7f242"
export const VALIDATOR_POOL_MAINNET_PACKAGE_ID = ""

// Network configuration
const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  devnet: {
    url: getFullnodeUrl("devnet"),
    variables: {
      packageId: DEVNET_PACKAGE_ID,
      validatorPoolPackageId: VALIDATOR_POOL_DEVNET_PACKAGE_ID,
    },
  },
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      packageId: TESTNET_PACKAGE_ID,
      validatorPoolPackageId: VALIDATOR_POOL_TESTNET_PACKAGE_ID,
    },
  },
  mainnet: {
    url: getFullnodeUrl("mainnet"),
    variables: {
      packageId: MAINNET_PACKAGE_ID,
      validatorPoolPackageId: VALIDATOR_POOL_MAINNET_PACKAGE_ID,
    },
  },
})

export { useNetworkVariable, useNetworkVariables, networkConfig }
