// ZetaFlow Configuration
export const ZETA_CONFIG = {
  // ZetaChain Network Configuration
  networks: {
    testnet: {
      chainId: 7001,
      name: "ZetaChain Athens Testnet",
      rpcUrl: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      blockExplorer: "https://athens3.explorer.zetachain.com",
    },
    mainnet: {
      chainId: 7000,
      name: "ZetaChain Mainnet",
      rpcUrl: "https://zetachain-evm.blockpi.network/v1/rpc/public",
      blockExplorer: "https://explorer.zetachain.com",
    },
  },

  // Visualization Configuration
  visualization: {
    maxNodes: 1000,
    maxEdges: 2000,
    animationDuration: 300,
    nodeSize: {
      min: 10,
      max: 50,
      default: 20,
    },
    colors: {
      primary: "#00FF88",
      secondary: "#0066FF",
      accent: "#FF6B35",
      background: "#0A0A0A",
      text: "#FFFFFF",
    },
  },

  // API Configuration
  api: {
    refreshInterval: 5000, // 5 seconds
    maxRetries: 3,
    timeout: 10000, // 10 seconds
  },
};

// Environment-based configuration
export const getNetworkConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return isProduction
    ? ZETA_CONFIG.networks.mainnet
    : ZETA_CONFIG.networks.testnet;
};
