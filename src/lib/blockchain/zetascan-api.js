/**
 * @fileoverview ZetaChain Explorer API service using Blockscout API
 * Provides API client with React Query caching for performance optimization
 */

import { ZETACHAIN_CONFIG, APP_CONFIG } from "../config.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 * @typedef {import('../../types/zetachain.js').CrossChainMessage} CrossChainMessage
 */

/**
 * ZetaChain Explorer API error types
 * @enum {string}
 */
export const ZETACHAIN_EXPLORER_ERROR_TYPES = {
  API_ERROR: "API_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_PARAMS: "INVALID_PARAMS",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Custom ZetaChain Explorer API error class
 */
export class ZetaChainExplorerAPIError extends Error {
  /**
   * @param {string} type - Error type from ZETACHAIN_EXPLORER_ERROR_TYPES
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {any} [originalError] - Original error object
   */
  constructor(type, message, statusCode = null, originalError = null) {
    super(message);
    this.name = "ZetaChainExplorerAPIError";
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * ZetaChain Explorer API service class (Blockscout-based)
 */
export class ZetaChainExplorerAPIService {
  /**
   * @param {'mainnet'|'testnet'} networkType - Network type
   */
  constructor(networkType = "testnet") {
    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.baseURL = this.config.explorerApiUrl;
    this.requestCache = new Map();
  }

  /**
   * Switch network type
   * @param {'mainnet'|'testnet'} networkType - New network type
   */
  switchNetwork(networkType) {
    if (this.networkType === networkType) {
      return;
    }

    this.networkType = networkType;
    this.config = ZETACHAIN_CONFIG[networkType];
    this.baseURL = this.config.explorerApiUrl;
    this.requestCache.clear();
  }

  /**
   * Make HTTP request with error handling and retry logic
   * @param {string} endpoint - API endpoint
   * @param {Object} [options] - Request options
   * @returns {Promise<any>} API response data
   * @private
   */
  async _makeRequest(endpoint, options = {}) {
    const {
      method = "GET",
      params = {},
      headers = {},
      maxRetries = APP_CONFIG.API.MAX_RETRIES,
    } = options;

    // Build URL with query parameters
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    // Create cache key for GET requests
    const cacheKey = method === "GET" ? url.toString() : null;

    // Check cache for GET requests
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
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          APP_CONFIG.API.REQUEST_TIMEOUT
        );

        // Create timeout promise to race with fetch
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            controller.abort();
            reject(new Error("Request timeout"));
          }, APP_CONFIG.API.REQUEST_TIMEOUT);
        });

        const fetchPromise = fetch(url.toString(), {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "ZetaFlow/1.0",
            ...headers,
          },
          signal: controller.signal,
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ZetaChainExplorerAPIError(
            this._mapStatusCodeToErrorType(response.status),
            `API request failed: ${response.status} ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();

        // Cache successful GET requests
        if (cacheKey) {
          this.requestCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });
        }

        return data;
      } catch (error) {
        lastError = error;

        // Don't retry on certain error types
        if (this._isNonRetryableError(error)) {
          throw this._mapError(error);
        }

        // Wait before retry (shorter delay for faster failures)
        if (attempt < maxRetries) {
          const delay = APP_CONFIG.API.RETRY_DELAY * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw this._mapError(lastError);
  }

  /**
   * Map HTTP status code to error type
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error type
   * @private
   */
  _mapStatusCodeToErrorType(statusCode) {
    switch (statusCode) {
      case 400:
      case 422:
        return ZETACHAIN_EXPLORER_ERROR_TYPES.INVALID_PARAMS;
      case 404:
        return ZETACHAIN_EXPLORER_ERROR_TYPES.NOT_FOUND;
      case 429:
        return ZETACHAIN_EXPLORER_ERROR_TYPES.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return ZETACHAIN_EXPLORER_ERROR_TYPES.API_ERROR;
      default:
        return ZETACHAIN_EXPLORER_ERROR_TYPES.UNKNOWN_ERROR;
    }
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is non-retryable
   * @private
   */
  _isNonRetryableError(error) {
    if (error instanceof ZetaChainExplorerAPIError) {
      return (
        error.type === ZETACHAIN_EXPLORER_ERROR_TYPES.INVALID_PARAMS ||
        error.type === ZETACHAIN_EXPLORER_ERROR_TYPES.NOT_FOUND ||
        (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
      );
    }

    const errorMessage = error.message?.toLowerCase() || "";

    return (
      errorMessage.includes("invalid") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("bad request") ||
      (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
    );
  }

  /**
   * Map generic error to ZetaChainExplorerAPIError
   * @param {Error} error - Original error
   * @returns {ZetaChainExplorerAPIError} Mapped error
   * @private
   */
  _mapError(error) {
    if (error instanceof ZetaChainExplorerAPIError) {
      return error;
    }

    const errorMessage = error.message?.toLowerCase() || "";

    if (error.name === "AbortError" || errorMessage.includes("timeout")) {
      return new ZetaChainExplorerAPIError(
        ZETACHAIN_EXPLORER_ERROR_TYPES.TIMEOUT,
        "API request timed out",
        null,
        error
      );
    }

    if (
      errorMessage.includes("fetch") ||
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("failed to fetch") ||
      error.code === "NETWORK_ERROR"
    ) {
      return new ZetaChainExplorerAPIError(
        ZETACHAIN_EXPLORER_ERROR_TYPES.NETWORK_ERROR,
        "Network error occurred",
        null,
        error
      );
    }

    if (errorMessage.includes("not found")) {
      return new ZetaChainExplorerAPIError(
        ZETACHAIN_EXPLORER_ERROR_TYPES.NOT_FOUND,
        "Resource not found",
        null,
        error
      );
    }

    return new ZetaChainExplorerAPIError(
      ZETACHAIN_EXPLORER_ERROR_TYPES.UNKNOWN_ERROR,
      error.message || "Unknown API error",
      null,
      error
    );
  }

  /**
   * Transform Blockscout transaction data to CrossChainTransaction format
   * @param {Object} apiTransaction - Raw API transaction data from Blockscout
   * @returns {CrossChainTransaction} Formatted cross-chain transaction
   * @private
   */
  _transformCrossChainTransaction(apiTransaction) {
    // Parse transaction logs for cross-chain events
    const crossChainLogs = this._extractCrossChainLogs(
      apiTransaction.logs || []
    );

    return {
      txHash: apiTransaction.hash,
      sourceChain: {
        chainId: this.config.chainId,
        name: this.config.name,
        rpcUrl: this.config.rpcUrl,
        explorerUrl: this.config.explorerUrl,
        nativeCurrency: {
          name: this.config.symbol,
          symbol: this.config.symbol,
          decimals: 18,
        },
      },
      destinationChain: crossChainLogs.destinationChain || {
        chainId: null,
        name: "Unknown",
        rpcUrl: "",
        explorerUrl: "",
        nativeCurrency: {
          name: "ETH",
          symbol: "ETH",
          decimals: 18,
        },
      },
      omnichainContract: apiTransaction.to?.hash || null,
      crossChainMessages: crossChainLogs.messages,
      status: this._mapTransactionStatus(
        apiTransaction.status,
        apiTransaction.result
      ),
      timestamp: apiTransaction.timestamp
        ? new Date(apiTransaction.timestamp).getTime() / 1000
        : Date.now() / 1000,
      tokenInfo: crossChainLogs.tokenInfo,
      amount: apiTransaction.value || "0",
      confirmations: apiTransaction.confirmations || 0,
      gasUsed: apiTransaction.gas_used || "0",
      gasPrice: apiTransaction.gas_price || "0",
      from: apiTransaction.from?.hash || "",
      to: apiTransaction.to?.hash || "",
      blockNumber: apiTransaction.block_number || 0,
    };
  }

  /**
   * Extract cross-chain information from transaction logs
   * @param {Array} logs - Transaction logs
   * @returns {Object} Extracted cross-chain data
   * @private
   */
  _extractCrossChainLogs(logs) {
    const crossChainData = {
      destinationChain: null,
      messages: [],
      tokenInfo: null,
    };

    // Look for common cross-chain event signatures
    const CROSS_CHAIN_SIGNATURES = [
      "0x7ec1c94701e09b1652f3e1d307e60c4b9ebf99aff8c2079fd1d8c585e031c4e4", // Example signature
      // Add more known ZetaChain cross-chain event signatures
    ];

    for (const log of logs) {
      if (log.topics && log.topics.length > 0) {
        const signature = log.topics[0];

        if (CROSS_CHAIN_SIGNATURES.includes(signature)) {
          // Parse cross-chain event data
          try {
            // This would need actual ABI decoding for real implementation
            crossChainData.messages.push({
              type: "cross_chain_call",
              data: log.data,
              topics: log.topics,
            });
          } catch (error) {
            console.warn("Failed to parse cross-chain log:", error);
          }
        }
      }
    }

    return crossChainData;
  }

  /**
   * Map Blockscout transaction status to standard format
   * @param {string} status - Transaction status
   * @param {string} result - Transaction result
   * @returns {'pending'|'completed'|'failed'} Mapped status
   * @private
   */
  _mapTransactionStatus(status, result) {
    if (status === "pending" || status === "queued") return "pending";
    if (status === "ok" || result === "success") return "completed";
    if (status === "error" || result === "error") return "failed";
    return "pending";
  }

  /**
   * Get recent transactions from ZetaChain
   * @param {Object} [options] - Query options
   * @param {string} [options.filter] - Transaction filter type
   * @param {string} [options.type] - Transaction type filter
   * @param {string} [options.method] - Transaction method filter
   * @returns {Promise<CrossChainTransaction[]>} Array of transactions
   */
  async getTransactions(options = {}) {
    const { filter = "validated", type, method } = options;

    const params = { filter };
    if (type) params.type = type;
    if (method) params.method = method;

    try {
      const response = await this._makeRequest("/transactions", { params });

      const transactions = response.items || [];
      return transactions
        .filter((tx) => this._isCrossChainTransaction(tx))
        .map((tx) => this._transformCrossChainTransaction(tx));
    } catch (error) {
      console.warn("Failed to fetch transactions:", error);
      return [];
    }
  }

  /**
   * Check if transaction is a cross-chain transaction
   * @param {Object} transaction - Transaction object
   * @returns {boolean} Whether transaction is cross-chain
   * @private
   */
  _isCrossChainTransaction(transaction) {
    // Check for cross-chain indicators
    if (!transaction.logs || transaction.logs.length === 0) return false;

    // Look for cross-chain contract addresses or event signatures
    const crossChainIndicators = [
      "omnichain",
      "cross_chain",
      "bridge",
      // Add known ZetaChain cross-chain contract addresses
    ];

    return crossChainIndicators.some(
      (indicator) =>
        transaction.to?.hash?.toLowerCase().includes(indicator) ||
        transaction.logs.some((log) =>
          log.address?.hash?.toLowerCase().includes(indicator)
        )
    );
  }

  /**
   * Get transaction details by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise<CrossChainTransaction|null>} Transaction details or null if not found
   */
  async getTransactionDetails(txHash) {
    if (!txHash || typeof txHash !== "string") {
      throw new ZetaChainExplorerAPIError(
        ZETACHAIN_EXPLORER_ERROR_TYPES.INVALID_PARAMS,
        "Transaction hash is required and must be a string"
      );
    }

    try {
      const response = await this._makeRequest(`/transactions/${txHash}`);

      if (this._isCrossChainTransaction(response)) {
        return this._transformCrossChainTransaction(response);
      }

      return null; // Not a cross-chain transaction
    } catch (error) {
      if (error.type === ZETACHAIN_EXPLORER_ERROR_TYPES.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get address transaction history
   * @param {string} address - Address to query
   * @param {Object} [options] - Query options
   * @param {string} [options.filter] - Filter type (to, from, or null for all)
   * @param {number} [options.page] - Page number
   * @returns {Promise<CrossChainTransaction[]>} Array of transactions for address
   */
  async getAddressTransactions(address, options = {}) {
    if (!address || typeof address !== "string") {
      throw new ZetaChainExplorerAPIError(
        ZETACHAIN_EXPLORER_ERROR_TYPES.INVALID_PARAMS,
        "Address parameter is required and must be a string"
      );
    }

    const { filter, page = 1 } = options;
    const params = {};
    if (filter) params.filter = filter;
    if (page > 1) params.page = page;

    try {
      const response = await this._makeRequest(
        `/addresses/${address}/transactions`,
        { params }
      );

      const transactions = response.items || [];
      return transactions
        .filter((tx) => this._isCrossChainTransaction(tx))
        .map((tx) => this._transformCrossChainTransaction(tx));
    } catch (error) {
      console.warn(
        `Failed to fetch transactions for address ${address}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get network statistics from Blockscout
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats() {
    try {
      const response = await this._makeRequest("/stats");
      return {
        totalTransactions: response.total_transactions || "0",
        totalBlocks: response.total_blocks || "0",
        averageBlockTime: response.average_block_time || 0,
        totalAddresses: response.total_addresses || "0",
        networkType: this.networkType,
        chainId: this.config.chainId,
        ...response,
      };
    } catch (error) {
      // Return default stats if endpoint doesn't exist
      return {
        totalTransactions: "0",
        totalBlocks: "0",
        averageBlockTime: 0,
        totalAddresses: "0",
        networkType: this.networkType,
        chainId: this.config.chainId,
        connectedChains: this.config.connectedChains.length,
      };
    }
  }

  /**
   * Clear request cache
   */
  clearCache() {
    this.requestCache.clear();
  }

  /**
   * Check if API service is healthy
   * @returns {Promise<boolean>} Health status
   */
  async isHealthy() {
    try {
      await this._makeRequest("/stats");
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create and export singleton instances for both networks
 */
export const zetaChainMainnetExplorer = new ZetaChainExplorerAPIService(
  "mainnet"
);
export const zetaChainTestnetExplorer = new ZetaChainExplorerAPIService(
  "testnet"
);

/**
 * Get ZetaChain Explorer API service instance for network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {ZetaChainExplorerAPIService} API service instance
 */
export function getZetaChainExplorerAPIService(networkType) {
  return networkType === "mainnet"
    ? zetaChainMainnetExplorer
    : zetaChainTestnetExplorer;
}

/**
 * React Query key factory for ZetaChain Explorer API calls
 */
export const zetaChainExplorerQueryKeys = {
  all: ["zetachain-explorer"],
  transactions: (networkType, options = {}) => [
    "zetachain-explorer",
    networkType,
    "transactions",
    options,
  ],
  addressTransactions: (networkType, address, options = {}) => [
    "zetachain-explorer",
    networkType,
    "address-transactions",
    address,
    options,
  ],
  transactionDetails: (networkType, txHash) => [
    "zetachain-explorer",
    networkType,
    "transaction",
    txHash,
  ],
  networkStats: (networkType) => ["zetachain-explorer", networkType, "stats"],
};

// Legacy compatibility exports (without deprecated warnings)
export const ZETASCAN_ERROR_TYPES = ZETACHAIN_EXPLORER_ERROR_TYPES;
export const ZetaScanAPIError = ZetaChainExplorerAPIError;
