/**
 * @fileoverview ZetaChain Service - Application wrapper for unified ZetaChain API
 * Provides network switching, data normalization, error handling, and caching
 */

import { ZetaChainAPI } from "./zetachain-api.js";

/**
 * Custom error class for ZetaChain service operations
 */
export class ZetaChainServiceError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = "ZetaChainServiceError";
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * Error types for ZetaChain service
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  API_RATE_LIMIT: "API_RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

/**
 * ZetaChain service wrapper for application integration
 * Wraps ZetaChainAPI with application-specific functionality
 */
export class ZetaChainService {
  constructor() {
    this.api = new ZetaChainAPI();
    this.currentNetwork = "mainnet"; // Default to mainnet
    this.cache = new Map(); // Simple in-memory cache
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffFactor: 2,
    };
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffFactor, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Execute a function with retry logic and error handling
   * @param {Function} fn - Function to execute
   * @param {string} operation - Operation name for error messages
   * @returns {Promise<any>} Function result
   */
  async executeWithRetry(fn, operation) {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          throw this.wrapError(error, operation);
        }

        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxRetries) {
          throw this.wrapError(error, operation);
        }

        // Wait before retrying
        const delay = this.calculateRetryDelay(attempt);
        console.warn(
          `${operation} failed (attempt ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          }), retrying in ${delay}ms:`,
          error.message
        );
        await this.sleep(delay);
      }
    }

    throw this.wrapError(lastError, operation);
  }

  /**
   * Check if an error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} True if error should not be retried
   */
  isNonRetryableError(error) {
    const message = error.message.toLowerCase();

    // Don't retry on validation errors or not found errors
    if (
      message.includes("invalid") ||
      message.includes("not found") ||
      message.includes("400") ||
      message.includes("404")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Wrap an error with additional context
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {ZetaChainServiceError} Wrapped error
   */
  wrapError(error, operation) {
    let errorType = ERROR_TYPES.UNKNOWN;

    if (error.message.includes("fetch")) {
      errorType = ERROR_TYPES.NETWORK_ERROR;
    } else if (error.message.includes("not found")) {
      errorType = ERROR_TYPES.TRANSACTION_NOT_FOUND;
    } else if (error.message.includes("timeout")) {
      errorType = ERROR_TYPES.TIMEOUT;
    } else if (error.message.includes("rate limit")) {
      errorType = ERROR_TYPES.API_RATE_LIMIT;
    }

    return new ZetaChainServiceError(
      `${operation} failed: ${error.message}`,
      errorType,
      error
    );
  }

  /**
   * Generate cache key for requests
   * @param {string} method - Method name
   * @param {...any} args - Method arguments
   * @returns {string} Cache key
   */
  getCacheKey(method, ...args) {
    return `${method}:${this.currentNetwork}:${JSON.stringify(args)}`;
  }

  /**
   * Get cached result or execute function and cache result
   * @param {string} cacheKey - Cache key
   * @param {Function} fn - Function to execute if not cached
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   * @returns {Promise<any>} Cached or fresh result
   */
  async getCachedOrExecute(cacheKey, fn, ttl = 5 * 60 * 1000) {
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const result = await fn();
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Clear cache entries (useful for network switching)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Set the current network for subsequent operations
   * @param {'mainnet'|'testnet'} network - Network to switch to
   */
  setNetwork(network) {
    if (network !== "mainnet" && network !== "testnet") {
      throw new ZetaChainServiceError(
        `Invalid network: ${network}. Must be 'mainnet' or 'testnet'`,
        ERROR_TYPES.INVALID_INPUT
      );
    }

    if (this.currentNetwork !== network) {
      this.currentNetwork = network;
      this.clearCache(); // Clear cache when switching networks
    }
  }

  /**
   * Get current network
   * @returns {'mainnet'|'testnet'}
   */
  getCurrentNetwork() {
    return this.currentNetwork;
  }

  /**
   * Get transaction data with automatic type detection
   * @param {string} txHashOrUrl - Transaction hash or ZetaScan URL
   * @returns {Promise<Object>} Normalized transaction data
   */
  async getTransaction(txHashOrUrl) {
    if (!txHashOrUrl || typeof txHashOrUrl !== "string") {
      throw new ZetaChainServiceError(
        "Transaction hash or URL is required",
        ERROR_TYPES.INVALID_INPUT
      );
    }

    const cacheKey = this.getCacheKey("getTransaction", txHashOrUrl);

    return this.getCachedOrExecute(cacheKey, async () => {
      return this.executeWithRetry(async () => {
        const isMainnet = this.currentNetwork === "mainnet";

        // Handle both direct hash and ZetaScan URLs
        if (txHashOrUrl.includes("zetascan.com")) {
          const rawData = await this.api.getTransaction(txHashOrUrl);
          const detection = this.api.detectTransactionType(txHashOrUrl);

          if (detection.isCrossChain) {
            return this.normalizeCrossChainTransaction(rawData);
          } else {
            return this.normalizeEVMTransaction(rawData.result || rawData);
          }
        } else {
          // Direct hash - try EVM first, then cross-chain
          try {
            const [evmResult, receiptResult] = await Promise.all([
              this.api.getEVMTransaction(txHashOrUrl, isMainnet),
              this.api.getEVMTransactionReceipt(txHashOrUrl, isMainnet).catch(() => null)
            ]);
            
            if (evmResult.result) {
              return this.normalizeEVMTransaction(evmResult.result, receiptResult?.result);
            }
          } catch (error) {
            console.log("EVM transaction not found, trying cross-chain...");
          }

          // If EVM fails, try cross-chain
          const ccResult = await this.api.getCrossChainTransaction(
            txHashOrUrl,
            isMainnet
          );
          return this.normalizeCrossChainTransaction(ccResult);
        }
      }, "getTransaction");
    });
  }

  /**
   * Get transaction with receipt data for EVM transactions
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction with receipt data
   */
  async getTransactionWithReceipt(txHash) {
    if (!txHash || typeof txHash !== "string") {
      throw new ZetaChainServiceError(
        "Transaction hash is required",
        ERROR_TYPES.INVALID_INPUT
      );
    }

    const cacheKey = this.getCacheKey("getTransactionWithReceipt", txHash);

    return this.getCachedOrExecute(cacheKey, async () => {
      return this.executeWithRetry(async () => {
        const isMainnet = this.currentNetwork === "mainnet";

        try {
          const [txResult, receiptResult] = await Promise.all([
            this.api.getEVMTransaction(txHash, isMainnet),
            this.api.getEVMTransactionReceipt(txHash, isMainnet),
          ]);

          if (txResult.result && receiptResult.result) {
            const normalizedTx = this.normalizeEVMTransaction(txResult.result);
            const receipt = receiptResult.result;

            // Enhance with receipt data
            normalizedTx.status =
              receipt.status === "0x1" ? "success" : "failed";
            normalizedTx.gasUsed = receipt.gasUsed;
            normalizedTx.blockNumber = parseInt(receipt.blockNumber, 16);

            return normalizedTx;
          }
        } catch (error) {
          // Fallback to cross-chain if EVM fails
          const ccResult = await this.api.getCrossChainTransaction(
            txHash,
            isMainnet
          );
          return this.normalizeCrossChainTransaction(ccResult);
        }
      }, "getTransactionWithReceipt");
    });
  }

  /**
   * Normalize EVM transaction data to application format
   * @param {Object} evmTx - Raw EVM transaction data
   * @param {Object} [receipt] - Transaction receipt data
   * @returns {Object} Normalized transaction data
   */
  normalizeEVMTransaction(evmTx, receipt = null) {
    const chainId = evmTx.chainId
      ? parseInt(evmTx.chainId, 16)
      : this.currentNetwork === "mainnet"
      ? 7000
      : 7001;

    // Determine if this is a contract interaction
    const isContractInteraction = evmTx.input && evmTx.input !== "0x" && evmTx.input.length > 2;
    
    return {
      txHash: evmTx.hash,
      blockNumber: evmTx.blockNumber ? parseInt(evmTx.blockNumber, 16) : 0,
      timestamp: Date.now(), // Would need block data for actual timestamp
      from: evmTx.from,
      to: evmTx.to || "Contract Creation",
      value: evmTx.value,
      gasUsed: receipt ? receipt.gasUsed : evmTx.gas,
      gasPrice: evmTx.gasPrice,
      status: receipt 
        ? (receipt.status === "0x1" ? "success" : "failed")
        : "pending",
      chainId: chainId,
      type: "evm",
      network: this.currentNetwork,
      evmData: {
        nonce: evmTx.nonce ? parseInt(evmTx.nonce, 16) : 0,
        transactionIndex: evmTx.transactionIndex ? parseInt(evmTx.transactionIndex, 16) : 0,
        gasLimit: evmTx.gas ? parseInt(evmTx.gas, 16) : 0,
        effectiveGasPrice: receipt?.effectiveGasPrice || evmTx.gasPrice,
        isContractInteraction: isContractInteraction,
        inputData: evmTx.input,
        blockHash: evmTx.blockHash,
      },
    };
  }

  /**
   * Normalize cross-chain transaction data to application format
   * @param {Object} ccTx - Raw cross-chain transaction data
   * @returns {Object} Normalized transaction data
   */
  normalizeCrossChainTransaction(ccTx) {
    // Handle the actual API response structure
    const cctx = ccTx.CrossChainTx || ccTx.cctx || ccTx;
    const inboundParams = cctx.inbound_params || cctx.inbound_tx_params || {};
    const outboundParams = cctx.outbound_params?.[0] || cctx.outbound_tx_params?.[0] || {};
    const status = cctx.cctx_status?.status;

    // Parse timestamp from the API response
    const timestamp = cctx.cctx_status?.created_timestamp 
      ? parseInt(cctx.cctx_status.created_timestamp) * 1000 
      : Date.now();

    return {
      txHash: cctx.index || "unknown",
      blockNumber: inboundParams.observed_external_height 
        ? parseInt(inboundParams.observed_external_height) 
        : 0,
      timestamp: timestamp,
      from: inboundParams.sender || "unknown",
      to: outboundParams.receiver || "unknown",
      value: inboundParams.amount || "0",
      gasUsed: outboundParams.gas_used || inboundParams.gas_limit || "0",
      gasPrice: outboundParams.gas_price || inboundParams.gas_price || "0",
      status: this.mapCrossChainStatus(status),
      chainId: inboundParams.sender_chain_id 
        ? parseInt(inboundParams.sender_chain_id) 
        : 0,
      type: "cross-chain",
      network: this.currentNetwork,
      crossChainData: {
        sourceChain: inboundParams.sender_chain_id 
          ? parseInt(inboundParams.sender_chain_id) 
          : undefined,
        destinationChain: outboundParams.receiver_chainId 
          ? parseInt(outboundParams.receiver_chainId) 
          : undefined,
        status: this.mapCrossChainStatus(status),
        bridgeContract: inboundParams.coin_type || "unknown",
        crossChainTxHash: outboundParams.hash || outboundParams.outbound_tx_hash,
        inboundTxHash: inboundParams.observed_hash,
        statusMessage: cctx.cctx_status?.status_message || "",
        errorMessage: cctx.cctx_status?.error_message || "",
      },
    };
  }

  /**
   * Map cross-chain status to application status
   * @param {string|number} status - Cross-chain status code or string
   * @returns {'success'|'pending'|'failed'}
   */
  mapCrossChainStatus(status) {
    if (typeof status === 'string') {
      switch (status.toLowerCase()) {
        case 'outboundmined':
        case 'success':
          return "success";
        case 'pendinginbound':
        case 'pendingoutbound':
        case 'pending':
          return "pending";
        case 'aborted':
        case 'reverted':
        case 'failed':
          return "failed";
        default:
          return "pending";
      }
    }
    
    // Handle numeric status codes
    switch (status) {
      case 3:
        return "success"; // OutboundMined
      case 1:
      case 2:
        return "pending"; // PendingInbound, PendingOutbound
      case 4:
        return "failed"; // Aborted
      case 5:
        return "failed"; // Reverted
      default:
        return "pending";
    }
  }

  /**
   * Get network information for current network
   * @returns {Object} Network configuration
   */
  getNetworkInfo() {
    return {
      network: this.currentNetwork,
      chainId: this.currentNetwork === "mainnet" ? 7000 : 7001,
      name:
        this.currentNetwork === "mainnet"
          ? "ZetaChain Mainnet"
          : "ZetaChain Athens-3 Testnet",
      rpcUrl:
        this.currentNetwork === "mainnet"
          ? "https://zetachain-evm.blockpi.network/v1/rpc/public"
          : "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      explorerUrl:
        this.currentNetwork === "mainnet"
          ? "https://zetascan.com"
          : "https://testnet.zetascan.com",
      nativeCurrency: {
        name: "ZETA",
        symbol: "ZETA",
        decimals: 18,
      },
    };
  }

  /**
   * Detect transaction type from URL or hash
   * @param {string} input - Transaction hash or ZetaScan URL
   * @returns {Object} Detection result
   */
  detectTransactionType(input) {
    if (input.includes("zetascan.com")) {
      return this.api.detectTransactionType(input);
    }

    // For direct hash, we can't determine type without trying both APIs
    return {
      isMainnet: this.currentNetwork === "mainnet",
      isCrossChain: null, // Unknown until we try the APIs
      txHash: input,
      network: this.currentNetwork,
      type: "unknown",
    };
  }
}

// Export singleton instance for application use
export const zetaChainService = new ZetaChainService();
