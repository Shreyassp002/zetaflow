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

    this._initializeProvider();
  }

  /**
   * Initialize ethers.js provider with retry logic
   * @private
   */
  _initializeProvider() {
    try {
      // Create provider with custom configuration
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, {
        chainId: this.config.chainId,
        name: this.config.name,
      });

      // Set timeout for requests
      this.provider._getConnection().timeout = APP_CONFIG.API.REQUEST_TIMEOUT;

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
    this._initializeProvider();
  }

  /**
   * Execute RPC call with retry logic
   * @param {Function} operation - Async operation to execute
   * @param {number} [maxRetries] - Maximum number of retries
   * @returns {Promise<any>} Operation result
   * @private
   */
  async _executeWithRetry(operation, maxRetries = APP_CONFIG.API.MAX_RETRIES) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this._isNonRetryableError(error)) {
          throw this._mapError(error);
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = APP_CONFIG.API.RETRY_DELAY * Math.pow(2, attempt);
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
      error.code === "INVALID_ARGUMENT"
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

    if (errorMessage.includes("timeout")) {
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

    if (errorMessage.includes("invalid address")) {
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
    });
  }

  /**
   * Get all transactions for an address
   * @param {string} address - Wallet address
   * @param {Object} [options] - Query options
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @param {number} [options.limit] - Maximum number of transactions
   * @returns {Promise<TransactionData[]>} Array of transaction data
   * @throws {ZetaRPCError} If address is invalid or RPC error
   */
  async getAddressTransactions(address, options = {}) {
    this._validateAddress(address);

    const { fromBlock = 0, toBlock = "latest", limit = 100 } = options;

    return this._executeWithRetry(async () => {
      // Get current block number for pagination
      const currentBlock = await this.provider.getBlockNumber();
      const endBlock =
        toBlock === "latest" ? currentBlock : Math.min(toBlock, currentBlock);

      const transactions = [];
      let blockNumber = endBlock;

      // Scan blocks backwards to find transactions
      while (blockNumber >= fromBlock && transactions.length < limit) {
        try {
          const block = await this.provider.getBlock(blockNumber, true);

          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (transactions.length >= limit) break;

              // Check if transaction involves the address
              if (
                tx.from?.toLowerCase() === address.toLowerCase() ||
                tx.to?.toLowerCase() === address.toLowerCase()
              ) {
                // Get receipt for status
                const receipt = await this.provider
                  .getTransactionReceipt(tx.hash)
                  .catch(() => null);

                transactions.push(this._transformTransaction(tx, receipt));
              }
            }
          }
        } catch (error) {
          // Skip blocks that can't be fetched
          console.warn(`Failed to fetch block ${blockNumber}:`, error.message);
        }

        blockNumber--;
      }

      return transactions;
    });
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
    });
  }

  /**
   * Get current block number
   * @returns {Promise<number>} Current block number
   */
  async getCurrentBlockNumber() {
    return this._executeWithRetry(async () => {
      return await this.provider.getBlockNumber();
    });
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
    });
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
