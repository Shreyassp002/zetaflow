/**
 * @fileoverview Configuration file for ZetaFlow application
 * Contains network configurations, API endpoints, and application settings
 */

/**
 * Network configuration object
 * @typedef {Object} NetworkConfig
 * @property {ZetaNetworkConfig} mainnet - Mainnet configuration
 * @property {ZetaNetworkConfig} testnet - Testnet configuration
 */

/**
 * ZetaChain network configuration
 * @typedef {Object} ZetaNetworkConfig
 * @property {string} rpcUrl - RPC endpoint URL
 * @property {string} explorerUrl - Block explorer URL
 * @property {string} explorerApiUrl - Explorer API URL (Blockscout API)
 * @property {string} tendermintRpc - Tendermint RPC endpoint
 * @property {string} cosmosApi - Cosmos SDK REST API endpoint
 * @property {number} chainId - Chain ID
 * @property {string} name - Network name
 * @property {string} symbol - Native token symbol
 * @property {Object[]} connectedChains - Connected external chains
 */

/**
 * ZetaChain network configurations for mainnet and testnet
 * @type {NetworkConfig}
 */
export const ZETACHAIN_CONFIG = {
  mainnet: {
    rpcUrl: "https://zetachain-evm.blockpi.network/v1/rpc/public",
    explorerUrl: "https://explorer.zetachain.com",
    explorerApiUrl: "https://zetachain.blockscout.com/api/v2",
    tendermintRpc: "https://zetachain.blockpi.network/rpc/v1/public",
    cosmosApi: "https://zetachain.blockpi.network/lcd/v1/public",
    websocket: "wss://zetachain.blockpi.network/rpc/v1/public/websocket",
    chainId: 7000,
    name: "ZetaChain Mainnet",
    symbol: "ZETA",
    connectedChains: [
      {
        chainId: 1,
        name: "Ethereum",
        symbol: "ETH",
        rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
        explorerUrl: "https://etherscan.io",
        isSupported: true,
      },
      {
        chainId: 56,
        name: "BNB Smart Chain",
        symbol: "BNB",
        rpcUrl: "https://bsc-dataseed.binance.org",
        explorerUrl: "https://bscscan.com",
        isSupported: true,
      },
      {
        chainId: 137,
        name: "Polygon",
        symbol: "MATIC",
        rpcUrl: "https://polygon-rpc.com",
        explorerUrl: "https://polygonscan.com",
        isSupported: true,
      },
      {
        chainId: 8453,
        name: "Base",
        symbol: "ETH",
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        isSupported: true,
      },
      {
        chainId: 42161,
        name: "Arbitrum One",
        symbol: "ETH",
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        explorerUrl: "https://arbiscan.io",
        isSupported: true,
      },
      {
        chainId: 43114,
        name: "Avalanche C-Chain",
        symbol: "AVAX",
        rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        explorerUrl: "https://snowtrace.io",
        isSupported: true,
      },
    ],
  },
  testnet: {
    rpcUrl: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
    explorerUrl: "https://athens.explorer.zetachain.com",
    explorerApiUrl: "https://zetachain-athens-3.blockscout.com/api/v2",
    tendermintRpc: "https://zetachain-athens.blockpi.network/rpc/v1/public",
    cosmosApi: "https://zetachain-athens.blockpi.network/lcd/v1/public",
    websocket: "wss://zetachain-athens.blockpi.network/rpc/v1/public/websocket",
    chainId: 7001,
    name: "ZetaChain Athens-3 Testnet",
    symbol: "ZETA",
    connectedChains: [
      {
        chainId: 11155111,
        name: "Ethereum Sepolia",
        symbol: "ETH",
        rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
        explorerUrl: "https://sepolia.etherscan.io",
        isSupported: true,
      },
      {
        chainId: 97,
        name: "BNB Smart Chain Testnet",
        symbol: "BNB",
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
        explorerUrl: "https://testnet.bscscan.com",
        isSupported: true,
      },
      {
        chainId: 80002,
        name: "Polygon Amoy",
        symbol: "MATIC",
        rpcUrl: "https://rpc-amoy.polygon.technology",
        explorerUrl: "https://amoy.polygonscan.com",
        isSupported: true,
      },
      {
        chainId: 84532,
        name: "Base Sepolia",
        symbol: "ETH",
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        isSupported: true,
      },
      {
        chainId: 421614,
        name: "Arbitrum Sepolia",
        symbol: "ETH",
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        explorerUrl: "https://sepolia.arbiscan.io",
        isSupported: true,
      },
      {
        chainId: 43113,
        name: "Avalanche Fuji",
        symbol: "AVAX",
        rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
        explorerUrl: "https://testnet.snowtrace.io",
        isSupported: true,
      },
    ],
  },
};

/**
 * Application configuration constants
 */
export const APP_CONFIG = {
  // Graph visualization settings
  GRAPH: {
    MAX_NODES: 1000,
    MAX_EDGES: 2000,
    ANIMATION_DURATION: 300,
    LAYOUT_PADDING: 50,
  },

  // API settings
  API: {
    REQUEST_TIMEOUT: 3000, // Even faster timeout for web responsiveness
    MAX_RETRIES: 1, // Single retry for faster failures
    RETRY_DELAY: 300, // Very fast retry
    CACHE_DURATION: 30000, // 30 seconds
  },

  // UI settings
  UI: {
    SIDEBAR_WIDTH: 400,
    HEADER_HEIGHT: 64,
    TOAST_DURATION: 5000,
  },

  // Theme colors
  COLORS: {
    DARK: {
      BACKGROUND: "#121212",
      SURFACE: "#1F1F1F",
      SURFACE_VARIANT: "#2C2C2C",
      PRIMARY: "#1E90FF",
      SECONDARY: "#9B59B6",
      ACCENT: "#00FFFF",
      SUCCESS: "#4CAF50",
      WARNING: "#FFC107",
      ERROR: "#F44336",
      TEXT_PRIMARY: "#FFFFFF",
      TEXT_SECONDARY: "#B0B0B0",
    },
  },
};

/**
 * Get network configuration by network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {ZetaNetworkConfig} Network configuration
 */
export function getNetworkConfig(networkType) {
  return ZETACHAIN_CONFIG[networkType];
}

/**
 * Get connected chain configuration by chain ID
 * @param {number} chainId - Chain ID
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {Object|null} Connected chain configuration or null if not found
 */
export function getConnectedChain(chainId, networkType) {
  const config = getNetworkConfig(networkType);
  return (
    config.connectedChains.find((chain) => chain.chainId === chainId) || null
  );
}

/**
 * Check if a chain is supported for cross-chain operations
 * @param {number} chainId - Chain ID to check
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {boolean} Whether the chain is supported
 */
export function isChainSupported(chainId, networkType) {
  const chain = getConnectedChain(chainId, networkType);
  return chain ? chain.isSupported : false;
}
