/**
 * @fileoverview ZetaScan Explorer API service for cross-chain transaction data
 * Provides API client with React Query caching for performance optimization
 */

import { ZETACHAIN_CONFIG, APP_CONFIG } from "../config.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 * @typedef {import('../../types/zetachain.js').CrossChainMessage} CrossChainMessage
 */

/**
 * ZetaScan API error types
 * @enum {string}
 */
export const ZETASCAN_ERROR_TYPES = {
  API_ERROR: "API_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_PARAMS: "INVALID_PARAMS",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Custom ZetaScan API error class
 */
export class ZetaScanAPIError extends Error {
  /**
   * @param {string} type - Error type from ZETASCAN_ERROR_TYPES
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {any} [originalError] - Original error object
   */
  constructor(type, message, statusCode = null, originalError = null) {
    super(message);
    this.name = "ZetaScanAPIError";
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * ZetaScan Explorer API service class
 */
export class ZetaScanAPIService {
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
    this.requestCache.clear(); // Clear cache when switching networks
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
      if (Date.now() - cached.timestamp < 30000) {
        // 30 second cache
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

        const response = await fetch(url.toString(), {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ZetaScanAPIError(
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
          throw error;
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
   * Map HTTP status code to error type
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error type
   * @private
   */
  _mapStatusCodeToErrorType(statusCode) {
    switch (statusCode) {
      case 400:
      case 422:
        return ZETASCAN_ERROR_TYPES.INVALID_PARAMS;
      case 404:
        return ZETASCAN_ERROR_TYPES.NOT_FOUND;
      case 429:
        return ZETASCAN_ERROR_TYPES.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return ZETASCAN_ERROR_TYPES.API_ERROR;
      default:
        return ZETASCAN_ERROR_TYPES.UNKNOWN_ERROR;
    }
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is non-retryable
   * @private
   */
  _isNonRetryableError(error) {
    if (error instanceof ZetaScanAPIError) {
      return (
        error.type === ZETASCAN_ERROR_TYPES.INVALID_PARAMS ||
        error.type === ZETASCAN_ERROR_TYPES.NOT_FOUND ||
        (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
      );
    }

    return (
      error.name === "AbortError" || // Timeout
      error.message?.includes("invalid") ||
      error.message?.includes("not found")
    );
  }

  /**
   * Map generic error to ZetaScanAPIError
   * @param {Error} error - Original error
   * @returns {ZetaScanAPIError} Mapped error
   * @private
   */
  _mapError(error) {
    if (error instanceof ZetaScanAPIError) {
      return error;
    }

    if (error.name === "AbortError") {
      return new ZetaScanAPIError(
        ZETASCAN_ERROR_TYPES.TIMEOUT,
        "API request timed out",
        null,
        error
      );
    }

    if (error.message?.includes("fetch")) {
      return new ZetaScanAPIError(
        ZETASCAN_ERROR_TYPES.NETWORK_ERROR,
        "Network error occurred",
        null,
        error
      );
    }

    return new ZetaScanAPIError(
      ZETASCAN_ERROR_TYPES.UNKNOWN_ERROR,
      error.message || "Unknown API error",
      null,
      error
    );
  }

  /**
   * Transform API transaction data to CrossChainTransaction format
   * @param {Object} apiTransaction - Raw API transaction data
   * @returns {CrossChainTransaction} Formatted cross-chain transaction
   * @private
   */
  _transformCrossChainTransaction(apiTransaction) {
    return {
      txHash: apiTransaction.hash || apiTransaction.tx_hash,
      sourceChain: {
        chainId: apiTransaction.source_chain_id || apiTransaction.from_chain_id,
        name: apiTransaction.source_chain_name || "Unknown",
        rpcUrl: "",
        explorerUrl: "",
        nativeCurrency: {
          name: apiTransaction.source_token_symbol || "ETH",
          symbol: apiTransaction.source_token_symbol || "ETH",
          decimals: 18,
        },
      },
      destinationChain: {
        chainId:
          apiTransaction.destination_chain_id || apiTransaction.to_chain_id,
        name: apiTransaction.destination_chain_name || "Unknown",
        rpcUrl: "",
        explorerUrl: "",
        nativeCurrency: {
          name: apiTransaction.destination_token_symbol || "ETH",
          symbol: apiTransaction.destination_token_symbol || "ETH",
          decimals: 18,
        },
      },
      omnichainContract: apiTransaction.omnichain_contract || null,
      crossChainMessages: apiTransaction.messages || [],
      status: this._mapTransactionStatus(apiTransaction.status),
      timestamp:
        apiTransaction.timestamp ||
        apiTransaction.block_time ||
        Date.now() / 1000,
      tokenInfo: apiTransaction.token
        ? {
            address: apiTransaction.token.address,
            symbol: apiTransaction.token.symbol,
            decimals: apiTransaction.token.decimals || 18,
            amount: apiTransaction.amount || "0",
          }
        : null,
      amount: apiTransaction.amount || apiTransaction.value || "0",
      confirmations: apiTransaction.confirmations || 0,
    };
  }

  /**
   * Map API transaction status to standard format
   * @param {string} status - API status
   * @returns {'pending'|'completed'|'failed'} Mapped status
   * @private
   */
  _mapTransactionStatus(status) {
    if (!status) return "pending";

    const normalizedStatus = status.toLowerCase();

    if (
      normalizedStatus.includes("success") ||
      normalizedStatus.includes("complete")
    ) {
      return "completed";
    }

    if (
      normalizedStatus.includes("fail") ||
      normalizedStatus.includes("error")
    ) {
      return "failed";
    }

    return "pending";
  }

  /**
   * Get cross-chain transactions from ZetaScan API
   * @param {Object} [options] - Query options
   * @param {number} [options.page] - Page number (default: 1)
   * @param {number} [options.limit] - Results per page (default: 20)
   * @param {string} [options.address] - Filter by address
   * @param {number} [options.sourceChain] - Filter by source chain ID
   * @param {number} [options.destinationChain] - Filter by destination chain ID
   * @returns {Promise<CrossChainTransaction[]>} Array of cross-chain transactions
   */
  async getCrossChainTransactions(options = {}) {
    const {
      page = 1,
      limit = 20,
      address,
      sourceChain,
      destinationChain,
    } = options;

    const params = {
      page,
      limit,
    };

    if (address) params.address = address;
    if (sourceChain) params.source_chain = sourceChain;
    if (destinationChain) params.destination_chain = destinationChain;

    try {
      const response = await this._makeRequest("/cross-chain-transactions", {
        params,
      });

      const transactions = response.data || response.transactions || [];
      return transactions.map((tx) => this._transformCrossChainTransaction(tx));
    } catch (error) {
      // If the specific endpoint doesn't exist, try alternative endpoints
      if (error.type === ZETASCAN_ERROR_TYPES.NOT_FOUND) {
        return this._getCrossChainTransactionsFallback(options);
      }
      throw error;
    }
  }

  /**
   * Fallback method for getting cross-chain transactions
   * @param {Object} options - Query options
   * @returns {Promise<CrossChainTransaction[]>} Array of cross-chain transactions
   * @private
   */
  async _getCrossChainTransactionsFallback(options) {
    // Try alternative API endpoints that might exist
    const endpoints = [
      "/transactions/cross-chain",
      "/omnichain/transactions",
      "/bridge/transactions",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this._makeRequest(endpoint, {
          params: options,
        });

        const transactions =
          response.data || response.transactions || response.results || [];
        return transactions.map((tx) =>
          this._transformCrossChainTransaction(tx)
        );
      } catch (error) {
        // Continue to next endpoint if this one fails
        continue;
      }
    }

    // If all endpoints fail, return empty array
    console.warn(
      "No cross-chain transaction endpoints available, returning empty array"
    );
    return [];
  }

  /**
   * Get cross-chain transaction history for a specific address
   * @param {string} address - Address to query
   * @param {Object} [options] - Query options
   * @param {number} [options.page] - Page number (default: 1)
   * @param {number} [options.limit] - Results per page (default: 50)
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @returns {Promise<CrossChainTransaction[]>} Array of cross-chain transactions for address
   */
  async getAddressCrossChainHistory(address, options = {}) {
    if (!address || typeof address !== "string") {
      throw new ZetaScanAPIError(
        ZETASCAN_ERROR_TYPES.INVALID_PARAMS,
        "Address parameter is required and must be a string"
      );
    }

    const { page = 1, limit = 50, fromBlock, toBlock } = options;

    const params = {
      address: address.toLowerCase(),
      page,
      limit,
    };

    if (fromBlock) params.from_block = fromBlock;
    if (toBlock) params.to_block = toBlock;

    try {
      const response = await this._makeRequest(
        `/address/${address}/cross-chain`,
        {
          params,
        }
      );

      const transactions = response.data || response.transactions || [];
      return transactions.map((tx) => this._transformCrossChainTransaction(tx));
    } catch (error) {
      // If specific endpoint doesn't exist, try getting all cross-chain transactions and filter
      if (error.type === ZETASCAN_ERROR_TYPES.NOT_FOUND) {
        const allTransactions = await this.getCrossChainTransactions({
          address,
          page,
          limit,
        });
        return allTransactions;
      }
      throw error;
    }
  }

  /**
   * Get transaction details by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise<CrossChainTransaction|null>} Transaction details or null if not found
   */
  async getTransactionDetails(txHash) {
    if (!txHash || typeof txHash !== "string") {
      throw new ZetaScanAPIError(
        ZETASCAN_ERROR_TYPES.INVALID_PARAMS,
        "Transaction hash is required and must be a string"
      );
    }

    try {
      const response = await this._makeRequest(`/transaction/${txHash}`);

      if (response.data || response.transaction) {
        return this._transformCrossChainTransaction(
          response.data || response.transaction
        );
      }

      return null;
    } catch (error) {
      if (error.type === ZETASCAN_ERROR_TYPES.NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get network statistics
   * @returns {Promise<Object>} Network statistics
   */
  async getNetworkStats() {
    try {
      const response = await this._makeRequest("/stats");
      return response.data || response;
    } catch (error) {
      // Return default stats if endpoint doesn't exist
      if (error.type === ZETASCAN_ERROR_TYPES.NOT_FOUND) {
        return {
          totalTransactions: 0,
          crossChainTransactions: 0,
          connectedChains: this.config.connectedChains.length,
          networkType: this.networkType,
        };
      }
      throw error;
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
      await this._makeRequest("/health");
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create and export singleton instances for both networks
 */
export const zetaScanMainnet = new ZetaScanAPIService("mainnet");
export const zetaScanTestnet = new ZetaScanAPIService("testnet");

/**
 * Get ZetaScan API service instance for network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {ZetaScanAPIService} API service instance
 */
export function getZetaScanAPIService(networkType) {
  return networkType === "mainnet" ? zetaScanMainnet : zetaScanTestnet;
}

/**
 * React Query key factory for ZetaScan API calls
 */
export const zetaScanQueryKeys = {
  all: ["zetascan"],
  crossChainTransactions: (networkType, options = {}) => [
    "zetascan",
    networkType,
    "cross-chain-transactions",
    options,
  ],
  addressHistory: (networkType, address, options = {}) => [
    "zetascan",
    networkType,
    "address-history",
    address,
    options,
  ],
  transactionDetails: (networkType, txHash) => [
    "zetascan",
    networkType,
    "transaction",
    txHash,
  ],
  networkStats: (networkType) => ["zetascan", networkType, "stats"],
};
