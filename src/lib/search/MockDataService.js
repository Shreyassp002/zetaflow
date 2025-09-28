/**
 * @fileoverview Mock data service for demonstration purposes
 * Provides realistic sample data when real APIs are not available
 */

/**
 * Generate mock transaction data
 * @param {string} txHash - Transaction hash
 * @returns {Object} Mock transaction data
 */
export function generateMockTransaction(txHash) {
  const now = Math.floor(Date.now() / 1000);
  const randomDelay = Math.floor(Math.random() * 3600); // Random delay up to 1 hour

  return {
    txHash,
    blockNumber: 2500000 + Math.floor(Math.random() * 100000),
    timestamp: now - randomDelay,
    from: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    to: "0x1234567890123456789012345678901234567890",
    value: (Math.random() * 10).toFixed(18) + "000000000000000000", // Random ETH amount
    gasUsed: (21000 + Math.floor(Math.random() * 100000)).toString(),
    gasPrice: (20 + Math.floor(Math.random() * 80)).toString() + "000000000", // 20-100 gwei
    status:
      Math.random() > 0.1
        ? "success"
        : Math.random() > 0.5
        ? "pending"
        : "failed",
    chainId: 7001, // ZetaChain testnet
  };
}

/**
 * Generate mock cross-chain transaction data
 * @param {string} txHash - Transaction hash
 * @returns {Object} Mock cross-chain transaction data
 */
export function generateMockCrossChainTransaction(txHash) {
  const sourceChains = [1, 56, 137, 8453]; // ETH, BSC, Polygon, Base
  const destinationChains = [7001]; // ZetaChain testnet

  const sourceChainId =
    sourceChains[Math.floor(Math.random() * sourceChains.length)];
  const destinationChainId = destinationChains[0];

  const chainNames = {
    1: "Ethereum",
    56: "BNB Smart Chain",
    137: "Polygon",
    8453: "Base",
    7001: "ZetaChain Testnet",
  };

  const now = Math.floor(Date.now() / 1000);
  const randomDelay = Math.floor(Math.random() * 3600);

  return {
    txHash,
    sourceChain: {
      chainId: sourceChainId,
      name: chainNames[sourceChainId],
      rpcUrl: "",
      explorerUrl: "",
      nativeCurrency: {
        name:
          sourceChainId === 1 || sourceChainId === 8453
            ? "Ethereum"
            : sourceChainId === 56
            ? "BNB"
            : "Polygon",
        symbol:
          sourceChainId === 1 || sourceChainId === 8453
            ? "ETH"
            : sourceChainId === 56
            ? "BNB"
            : "MATIC",
        decimals: 18,
      },
    },
    destinationChain: {
      chainId: destinationChainId,
      name: chainNames[destinationChainId],
      rpcUrl: "",
      explorerUrl: "",
      nativeCurrency: {
        name: "ZetaChain",
        symbol: "ZETA",
        decimals: 18,
      },
    },
    omnichainContract:
      Math.random() > 0.5 ? "0xabcdef1234567890abcdef1234567890abcdef12" : null,
    crossChainMessages: [
      {
        messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
        sourceChain: sourceChainId,
        destinationChain: destinationChainId,
        messageType: ["token_transfer", "contract_call", "data_message"][
          Math.floor(Math.random() * 3)
        ],
        payload: {},
        status: ["sent", "received", "executed"][Math.floor(Math.random() * 3)],
        timestamp: now - randomDelay + 60,
        txHash,
      },
    ],
    status:
      Math.random() > 0.1
        ? "completed"
        : Math.random() > 0.5
        ? "pending"
        : "failed",
    timestamp: now - randomDelay,
    tokenInfo: {
      address: "0x1234567890123456789012345678901234567890",
      symbol: ["USDC", "USDT", "ETH", "ZETA"][Math.floor(Math.random() * 4)],
      decimals: 18,
      amount: (Math.random() * 1000).toFixed(6),
    },
    amount: (Math.random() * 10).toFixed(18) + "000000000000000000",
    confirmations: Math.floor(Math.random() * 100) + 1,
  };
}

/**
 * Generate mock address transactions
 * @param {string} address - Wallet address
 * @param {number} count - Number of transactions to generate
 * @returns {Array} Array of mock transactions
 */
export function generateMockAddressTransactions(address, count = 10) {
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    // Mix of regular and cross-chain transactions
    if (Math.random() > 0.3) {
      transactions.push(generateMockCrossChainTransaction(txHash));
    } else {
      const tx = generateMockTransaction(txHash);
      // Make sure the address is involved in the transaction
      if (Math.random() > 0.5) {
        tx.from = address;
      } else {
        tx.to = address;
      }
      transactions.push(tx);
    }
  }

  // Sort by timestamp (newest first)
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Check if a transaction hash looks valid
 * @param {string} txHash - Transaction hash to validate
 * @returns {boolean} Whether the hash looks valid
 */
export function isValidTxHash(txHash) {
  const cleanHash = txHash.startsWith("0x") ? txHash.slice(2) : txHash;
  return /^[a-fA-F0-9]{64}$/.test(cleanHash);
}

/**
 * Check if an address looks valid
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address looks valid
 */
export function isValidAddress(address) {
  const cleanAddress = address.startsWith("0x") ? address.slice(2) : address;
  return /^[a-fA-F0-9]{40}$/.test(cleanAddress);
}

/**
 * Simulate API delay
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise} Promise that resolves after delay
 */
export function simulateDelay(min = 500, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
