/**
 * @fileoverview ZetaChain RPC service for blockchain interactions
 * Provides ethers.js-based RPC client with retry logic and error handling
 */

import { ethers } from "ethers";
import { ZETACHAIN_CONFIG, APP_CONFIG } from "../config.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').ZetaNetworkInfo} ZetaNetworkInfo
 */

/**
 * RPC service error types
 * @enum {string}
 */
export const RPC_ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  INVALID_TX_HASH: "INVALID_TX_HASH",
  RPC_TIMEOUT: "RPC_TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Custom RPC error class
 */
export class ZetaRPCError extends Error {
  /**
   * @param {string} type - Error type from RPC_ERROR_TYPES
   * @param {string} message - Error message
   * @param {any} [originalError] - Original error object
   */
  constructor(type, message, originalError = null) {
    super(message);
    this.name = "ZetaRPCError";
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * ZetaChain RPC service class
 */
export class ZetaChainRPCService {
  /**
   * @param {'mainnet'|'testnet'} networkType - Network type
   */
  constructor(networkType = "testnet") {
    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.provider = null;
    this.isConnected = false;
    this.requestCache = new Map();

    this._initializeProvider();
  }

  /**
   * Initialize ethers.js provider with retry logic
   * @private
   */
  _initializeProvider() {
    try {
      // Create provider with custom configuration and timeout
      const fetchRequest = new ethers.FetchRequest(this.config.rpcUrl);
      fetchRequest.timeout = APP_CONFIG.API.REQUEST_TIMEOUT;

      this.provider = new ethers.JsonRpcProvider(fetchRequest, {
        chainId: this.config.chainId,
        name: this.config.name,
      });

      this.isConnected = true;
    } catch (error) {
      throw new ZetaRPCError(
        RPC_ERROR_TYPES.NETWORK_ERROR,
        `Failed to initialize RPC provider for ${this.networkType}`,
        error
      );
    }
  }

  /**
   * Switch network type and reinitialize provider
   * @param {'mainnet'|'testnet'} networkType - New network type
   */
  switchNetwork(networkType) {
    if (this.networkType === networkType) {
      return;
    }

    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.requestCache.clear(); // Clear cache when switching networks
    this._initializeProvider();
  }

  /**
   * Execute RPC call with retry logic and caching
   * @param {Function} operation - Async operation to execute
   * @param {string} [cacheKey] - Cache key for GET-like operations
   * @param {number} [maxRetries] - Maximum number of retries
   * @returns {Promise<any>} Operation result
   * @private
   */
  async _executeWithRetry(
    operation,
    cacheKey = null,
    maxRetries = APP_CONFIG.API.MAX_RETRIES
  ) {
    // Check cache first
    if (cacheKey && this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < APP_CONFIG.API.CACHE_DURATION) {
        return cached.data;
      }
      this.requestCache.delete(cacheKey);
    }

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("RPC request timeout")),
            APP_CONFIG.API.REQUEST_TIMEOUT
          );
        });

        const result = await Promise.race([operation(), timeoutPromise]);

        // Cache successful results
        if (cacheKey) {
          this.requestCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this._isNonRetryableError(error)) {
          throw this._mapError(error);
        }

        // Wait before retry (shorter delay)
        if (attempt < maxRetries) {
          const delay = APP_CONFIG.API.RETRY_DELAY * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw this._mapError(lastError);
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is non-retryable
   * @private
   */
  _isNonRetryableError(error) {
    const errorMessage = error.message?.toLowerCase() || "";

    return (
      errorMessage.includes("invalid") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("bad request") ||
      error.code === "INVALID_ARGUMENT" ||
      error.code === "CALL_EXCEPTION"
    );
  }

  /**
   * Map ethers error to ZetaRPCError
   * @param {Error} error - Original error
   * @returns {ZetaRPCError} Mapped error
   * @private
   */
  _mapError(error) {
    const errorMessage = error.message?.toLowerCase() || "";

    if (errorMessage.includes("timeout") || error.code === "TIMEOUT") {
      return new ZetaRPCError(
        RPC_ERROR_TYPES.RPC_TIMEOUT,
        "RPC request timed out",
        error
      );
    }

    if (errorMessage.includes("not found") || errorMessage.includes("null")) {
      return new ZetaRPCError(
        RPC_ERROR_TYPES.TRANSACTION_NOT_FOUND,
        "Transaction or resource not found",
        error
      );
    }

    if (
      errorMessage.includes("invalid address") ||
      error.code === "INVALID_ARGUMENT"
    ) {
      return new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_ADDRESS,
        "Invalid address format",
        error
      );
    }

    if (errorMessage.includes("invalid transaction hash")) {
      return new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_TX_HASH,
        "Invalid transaction hash format",
        error
      );
    }

    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests")
    ) {
      return new ZetaRPCError(
        RPC_ERROR_TYPES.RATE_LIMITED,
        "Rate limit exceeded",
        error
      );
    }

    return new ZetaRPCError(
      RPC_ERROR_TYPES.UNKNOWN_ERROR,
      error.message || "Unknown RPC error",
      error
    );
  }

  /**
   * Validate transaction hash format
   * @param {string} txHash - Transaction hash to validate
   * @throws {ZetaRPCError} If hash is invalid
   * @private
   */
  _validateTxHash(txHash) {
    if (!txHash || typeof txHash !== "string") {
      throw new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_TX_HASH,
        "Transaction hash must be a non-empty string"
      );
    }

    // Check if it's a valid hex string with 0x prefix and 64 characters
    const hexPattern = /^0x[a-fA-F0-9]{64}$/;
    if (!hexPattern.test(txHash)) {
      throw new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_TX_HASH,
        "Transaction hash must be a valid 32-byte hex string with 0x prefix"
      );
    }
  }

  /**
   * Validate address format
   * @param {string} address - Address to validate
   * @throws {ZetaRPCError} If address is invalid
   * @private
   */
  _validateAddress(address) {
    if (!address || typeof address !== "string") {
      throw new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_ADDRESS,
        "Address must be a non-empty string"
      );
    }

    try {
      // Use ethers.js to validate address format
      ethers.getAddress(address);
    } catch (error) {
      throw new ZetaRPCError(
        RPC_ERROR_TYPES.INVALID_ADDRESS,
        "Invalid Ethereum address format",
        error
      );
    }
  }

  /**
   * Transform ethers transaction to TransactionData format
   * @param {Object} ethersTransaction - Ethers transaction object
   * @param {Object} [receipt] - Transaction receipt
   * @returns {TransactionData} Formatted transaction data
   * @private
   */
  _transformTransaction(ethersTransaction, receipt = null) {
    const status = receipt
      ? receipt.status === 1
        ? "success"
        : "failed"
      : "pending";

    return {
      txHash: ethersTransaction.hash,
      blockNumber: ethersTransaction.blockNumber || 0,
      timestamp: receipt?.timestamp || Math.floor(Date.now() / 1000),
      from: ethersTransaction.from,
      to: ethersTransaction.to || "",
      value: ethersTransaction.value?.toString() || "0",
      gasUsed: receipt?.gasUsed?.toString() || "0",
      gasPrice: ethersTransaction.gasPrice?.toString() || "0",
      status,
      chainId: this.config.chainId,
      crossChainData: null, // Will be populated by higher-level services
      logs: receipt?.logs || [], // Include logs for cross-chain detection
    };
  }

  /**
   * Get transaction by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise<TransactionData>} Transaction data
   * @throws {ZetaRPCError} If transaction not found or RPC error
   */
  async getTransaction(txHash) {
    this._validateTxHash(txHash);

    return this._executeWithRetry(async () => {
      const [transaction, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash).catch(() => null),
      ]);

      if (!transaction) {
        throw new ZetaRPCError(
          RPC_ERROR_TYPES.TRANSACTION_NOT_FOUND,
          `Transaction ${txHash} not found`
        );
      }

      return this._transformTransaction(transaction, receipt);
    }, `tx_${txHash}`);
  }

  /**
   * Get all transactions for an address with improved efficiency
   * @param {string} address - Wallet address
   * @param {Object} [options] - Query options
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @param {number} [options.limit] - Maximum number of transactions
   * @param {number} [options.batchSize] - Number of blocks to process in each batch
   * @returns {Promise<TransactionData[]>} Array of transaction data
   * @throws {ZetaRPCError} If address is invalid or RPC error
   */
  async getAddressTransactions(address, options = {}) {
    this._validateAddress(address);

    const {
      fromBlock = 0,
      toBlock = "latest",
      limit = 100,
      batchSize = 50, // Process blocks in smaller batches for better performance
    } = options;

    const cacheKey = `addr_txs_${address}_${fromBlock}_${toBlock}_${limit}`;

    return this._executeWithRetry(async () => {
      // Get current block number for pagination
      const currentBlock = await this.provider.getBlockNumber();
      const endBlock =
        toBlock === "latest" ? currentBlock : Math.min(toBlock, currentBlock);

      const transactions = [];
      let blockNumber = endBlock;

      // Scan blocks backwards in batches to find transactions
      while (blockNumber >= fromBlock && transactions.length < limit) {
        const batchStart = Math.max(blockNumber - batchSize + 1, fromBlock);
        const batchPromises = [];

        // Create batch of block requests
        for (let i = blockNumber; i >= batchStart && i >= fromBlock; i--) {
          batchPromises.push(
            this.provider.getBlock(i, true).catch((error) => {
              console.warn(`Failed to fetch block ${i}:`, error.message);
              return null;
            })
          );
        }

        // Process batch
        const blocks = await Promise.all(batchPromises);

        for (const block of blocks) {
          if (!block || !block.transactions || transactions.length >= limit) {
            continue;
          }

          for (const tx of block.transactions) {
            if (transactions.length >= limit) break;

            // Check if transaction involves the address
            if (
              tx.from?.toLowerCase() === address.toLowerCase() ||
              tx.to?.toLowerCase() === address.toLowerCase()
            ) {
              // Get receipt for status
              try {
                const receipt = await this.provider.getTransactionReceipt(
                  tx.hash
                );
                transactions.push(this._transformTransaction(tx, receipt));
              } catch (error) {
                // Add transaction without receipt if receipt fetch fails
                transactions.push(this._transformTransaction(tx));
              }
            }
          }
        }

        blockNumber = batchStart - 1;
      }

      return transactions;
    }, cacheKey);
  }

  /**
   * Get cross-chain transaction logs for an address
   * @param {string} address - Address to search for
   * @param {Object} [options] - Query options
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @returns {Promise<Array>} Array of cross-chain transaction logs
   */
  async getCrossChainTransactionLogs(address, options = {}) {
    this._validateAddress(address);

    const { fromBlock = 0, toBlock = "latest" } = options;

    return this._executeWithRetry(async () => {
      // Common cross-chain event signatures on ZetaChain
      // These would need to be updated with actual ZetaChain signatures
      const crossChainTopics = [
        // Add known ZetaChain cross-chain event signatures here
        "0x7ec1c94701e09b1652f3e1d307e60c4b9ebf99aff8c2079fd1d8c585e031c4e4", // Example
      ];

      const filter = {
        fromBlock: typeof fromBlock === "number" ? fromBlock : 0,
        toBlock: typeof toBlock === "number" ? toBlock : "latest",
        topics: [crossChainTopics], // Any of these topics
      };

      // Filter by address involvement
      if (address !== ethers.ZeroAddress) {
        // Search for address in various log positions
        const logs = await Promise.all([
          this.provider.getLogs({
            ...filter,
            topics: [crossChainTopics, ethers.zeroPadValue(address, 32)],
          }),
          this.provider.getLogs({
            ...filter,
            topics: [crossChainTopics, null, ethers.zeroPadValue(address, 32)],
          }),
          this.provider.getLogs({ ...filter, address: address }),
        ]);

        // Flatten and deduplicate logs
        const allLogs = logs.flat();
        const uniqueLogs = allLogs.filter(
          (log, index, self) =>
            index ===
            self.findIndex(
              (l) =>
                l.transactionHash === log.transactionHash &&
                l.logIndex === log.logIndex
            )
        );

        return uniqueLogs;
      }

      return await this.provider.getLogs(filter);
    }, `cc_logs_${address}_${fromBlock}_${toBlock}`);
  }

  /**
   * Get current network information
   * @returns {Promise<ZetaNetworkInfo>} Network information
   */
  async getNetworkInfo() {
    return this._executeWithRetry(async () => {
      const network = await this.provider.getNetwork();

      return {
        chainId: Number(network.chainId),
        name: this.config.name,
        rpcUrl: this.config.rpcUrl,
        explorerUrl: this.config.explorerUrl,
        explorerApiUrl: this.config.explorerApiUrl,
        networkType: this.networkType,
        connectedChains: this.config.connectedChains,
      };
    }, `network_info_${this.networkType}`);
  }

  /**
   * Get current block number
   * @returns {Promise<number>} Current block number
   */
  async getCurrentBlockNumber() {
    return this._executeWithRetry(async () => {
      return await this.provider.getBlockNumber();
    }, `block_number_${this.networkType}`);
  }

  /**
   * Get address balance
   * @param {string} address - Address to check
   * @returns {Promise<string>} Balance in wei
   */
  async getBalance(address) {
    this._validateAddress(address);

    return this._executeWithRetry(async () => {
      const balance = await this.provider.getBalance(address);
      return balance.toString();
    }, `balance_${address}_${this.networkType}`);
  }

  /**
   * Get gas price
   * @returns {Promise<string>} Gas price in wei
   */
  async getGasPrice() {
    return this._executeWithRetry(async () => {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice?.toString() || "0";
    }, `gas_price_${this.networkType}`);
  }

  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object|null>} Transaction receipt
   */
  async getTransactionReceipt(txHash) {
    this._validateTxHash(txHash);

    return this._executeWithRetry(async () => {
      return await this.provider.getTransactionReceipt(txHash);
    }, `receipt_${txHash}`);
  }

  /**
   * Clear request cache
   */
  clearCache() {
    this.requestCache.clear();
  }

  /**
   * Check if service is connected and healthy
   * @returns {Promise<boolean>} Connection status
   */
  async isHealthy() {
    try {
      await this.getCurrentBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create and export singleton instances for both networks
 */
export const zetaMainnetRPC = new ZetaChainRPCService("mainnet");
export const zetaTestnetRPC = new ZetaChainRPCService("testnet");

/**
 * Get RPC service instance for network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {ZetaChainRPCService} RPC service instance
 */
export function getZetaRPCService(networkType) {
  return networkType === "mainnet" ? zetaMainnetRPC : zetaTestnetRPC;
}

/**
 * React Query key factory for ZetaChain RPC calls
 */
export const zetaChainRPCQueryKeys = {
  all: ["zetachain-rpc"],
  transaction: (networkType, txHash) => [
    "zetachain-rpc",
    networkType,
    "transaction",
    txHash,
  ],
  addressTransactions: (networkType, address, options) => [
    "zetachain-rpc",
    networkType,
    "address-txs",
    address,
    options,
  ],
  balance: (networkType, address) => [
    "zetachain-rpc",
    networkType,
    "balance",
    address,
  ],
  blockNumber: (networkType) => ["zetachain-rpc", networkType, "block-number"],
  networkInfo: (networkType) => ["zetachain-rpc", networkType, "network-info"],
  crossChainLogs: (networkType, address, options) => [
    "zetachain-rpc",
    networkType,
    "cc-logs",
    address,
    options,
  ],
};
