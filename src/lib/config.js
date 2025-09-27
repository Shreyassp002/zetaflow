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
 * @property {string} explorerApiUrl - Explorer API URL
 * @property {number} chainId - Chain ID
 * @property {string} name - Network name
 * @property {string} symbol - Native token symbol
 * @property {ConnectedChain[]} connectedChains - Connected external chains
 */

/**
 * ZetaChain network configurations for mainnet and testnet
 * @type {NetworkConfig}
 */
export const ZETACHAIN_CONFIG = {
  mainnet: {
    rpcUrl: "https://rpc.zetachain.com",
    explorerUrl: "https://zetascan.com",
    explorerApiUrl: "https://zetascan.com/api",
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
    ],
  },
  testnet: {
    rpcUrl: "https://rpc-testnet.zetachain.com",
    explorerUrl: "https://zetascan.com/testnet",
    explorerApiUrl: "https://zetascan.com/testnet/api",
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
        chainId: 80001,
        name: "Polygon Mumbai",
        symbol: "MATIC",
        rpcUrl: "https://rpc-mumbai.maticvigil.com",
        explorerUrl: "https://mumbai.polygonscan.com",
        isSupported: true,
      },
      {
        chainId: 84531,
        name: "Base Goerli",
        symbol: "ETH",
        rpcUrl: "https://goerli.base.org",
        explorerUrl: "https://goerli.basescan.org",
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
    REQUEST_TIMEOUT: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
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
 * @returns {ConnectedChain|null} Connected chain configuration or null if not found
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
