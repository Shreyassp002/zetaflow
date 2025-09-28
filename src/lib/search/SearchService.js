/**
 * @fileoverview Search service for ZetaFlow application
 * Integrates ZetaChain RPC and Explorer API services for comprehensive search functionality
 */

import { getZetaRPCService } from "../blockchain/zetachain-rpc.js";
import { getZetaChainExplorerAPIService } from "../blockchain/zetascan-api.js";
import { getSearchHistoryManager } from "./SearchHistoryManager.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 */

/**
 * Search result types
 * @enum {string}
 */
export const SEARCH_RESULT_TYPES = {
  TRANSACTION: "TRANSACTION",
  CROSS_CHAIN_TRANSACTION: "CROSS_CHAIN_TRANSACTION",
  ADDRESS_TRANSACTIONS: "ADDRESS_TRANSACTIONS",
};

/**
 * Search error types
 * @enum {string}
 */
export const SEARCH_ERROR_TYPES = {
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVICE_ERROR: "SERVICE_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Custom search error class
 */
export class SearchError extends Error {
  /**
   * @param {string} type - Error type from SEARCH_ERROR_TYPES
   * @param {string} message - Error message
   * @param {any} [originalError] - Original error object
   */
  constructor(type, message, originalError = null) {
    super(message);
    this.name = "SearchError";
    this.type = type;
    this.originalError = originalError;
    this.timestamp = Date.now();
  }
}

/**
 * Search result object
 * @typedef {Object} SearchResult
 * @property {string} type - Result type from SEARCH_RESULT_TYPES
 * @property {Array<TransactionData|CrossChainTransaction>} data - Result data
 * @property {Object} metadata - Search metadata
 * @property {string} metadata.query - Original search query
 * @property {'txid'|'address'} metadata.searchType - Search type
 * @property {number} metadata.totalResults - Total number of results
 * @property {number} metadata.loadTime - Search execution time in ms
 * @property {'mainnet'|'testnet'} metadata.network - Network used for search
 */

/**
 * Search service class
 */
export class SearchService {
  /**
   * @param {'mainnet'|'testnet'} networkType - Network type
   */
  constructor(networkType = "testnet") {
    this.networkType = networkType;
    this.rpcService = getZetaRPCService(networkType);
    this.apiService = getZetaChainExplorerAPIService(networkType);
    this.historyManager = getSearchHistoryManager();
    this.searchCache = new Map();
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
    this.rpcService.switchNetwork(networkType);
    this.apiService.switchNetwork(networkType);
    this.clearCache(); // Clear cache when switching networks
  }

  /**
   * Validate search input and detect type
   * @param {string} query - Search query
   * @returns {{isValid: boolean, type: 'txid'|'address'|'invalid', error?: string}}
   */
  validateSearchInput(query) {
    const trimmed = query.trim();

    if (!trimmed) {
      return {
        isValid: false,
        type: "invalid",
        error: "Search query cannot be empty",
      };
    }

    // Transaction hash validation (64 hex characters, optionally prefixed with 0x)
    const txHashRegex = /^(0x)?[a-fA-F0-9]{64}$/;
    if (txHashRegex.test(trimmed)) {
      return {
        isValid: true,
        type: "txid",
      };
    }

    // Ethereum address validation (40 hex characters, optionally prefixed with 0x)
    const addressRegex = /^(0x)?[a-fA-F0-9]{40}$/;
    if (addressRegex.test(trimmed)) {
      return {
        isValid: true,
        type: "address",
      };
    }

    // Provide specific error messages based on input
    if (trimmed.length < 40) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too short. Enter a valid transaction hash (64 chars) or address (40 chars).",
      };
    }

    if (trimmed.length > 66) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Input too long. Transaction hashes are 64 characters, addresses are 40 characters.",
      };
    }

    if (!/^(0x)?[a-fA-F0-9]+$/.test(trimmed)) {
      return {
        isValid: false,
        type: "invalid",
        error:
          "Invalid characters. Only hexadecimal characters (0-9, a-f) are allowed.",
      };
    }

    return {
      isValid: false,
      type: "invalid",
      error:
        "Invalid format. Enter a valid transaction hash or wallet address.",
    };
  }

  /**
   * Normalize search query (add 0x prefix if missing)
   * @param {string} query - Search query
   * @returns {string} Normalized query
   */
  normalizeQuery(query) {
    const trimmed = query.trim();
    return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  }

  /**
   * Get cache key for search
   * @param {string} query - Search query
   * @param {'txid'|'address'} type - Search type
   * @returns {string} Cache key
   */
  getCacheKey(query, type) {
    return `${this.networkType}:${type}:${query.toLowerCase()}`;
  }

  /**
   * Check cache for existing results
   * @param {string} cacheKey - Cache key
   * @returns {SearchResult|null} Cached result or null
   */
  getFromCache(cacheKey) {
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      // 1 minute cache
      return cached.result;
    }
    if (cached) {
      this.searchCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Store result in cache
   * @param {string} cacheKey - Cache key
   * @param {SearchResult} result - Search result
   */
  setCache(cacheKey, result) {
    this.searchCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Add search to history
   * @param {string} query - Search query
   * @param {'txid'|'address'} type - Search type
   * @param {SearchResult} result - Search result
   */
  addToHistory(query, type, result) {
    const resultCount = result.data ? result.data.length : 0;
    const successful = resultCount > 0;

    this.historyManager.addSearch(
      query,
      type,
      this.networkType,
      resultCount,
      successful
    );
  }

  /**
   * Search for transaction by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise<SearchResult>} Search result
   */
  async searchByTransactionHash(txHash) {
    const startTime = Date.now();
    const normalizedHash = this.normalizeQuery(txHash);

    // Validate transaction hash format
    const validation = this.validateSearchInput(normalizedHash);
    if (!validation.isValid || validation.type !== "txid") {
      throw new SearchError(
        SEARCH_ERROR_TYPES.INVALID_INPUT,
        "Invalid transaction hash format"
      );
    }

    try {
      const errors = [];

      // Run both services in parallel for faster results
      const [crossChainResult, rpcResult] = await Promise.allSettled([
        this.apiService.getTransactionDetails(normalizedHash),
        this.rpcService.getTransaction(normalizedHash),
      ]);

      // Check cross-chain transaction first (more comprehensive)
      if (crossChainResult.status === "fulfilled" && crossChainResult.value) {
        const result = {
          type: SEARCH_RESULT_TYPES.CROSS_CHAIN_TRANSACTION,
          data: [crossChainResult.value],
          metadata: {
            query: txHash,
            searchType: "txid",
            totalResults: 1,
            loadTime: Date.now() - startTime,
            network: this.networkType,
          },
        };

        return result;
      }

      // Check RPC transaction
      if (rpcResult.status === "fulfilled" && rpcResult.value) {
        const result = {
          type: SEARCH_RESULT_TYPES.TRANSACTION,
          data: [rpcResult.value],
          metadata: {
            query: txHash,
            searchType: "txid",
            totalResults: 1,
            loadTime: Date.now() - startTime,
            network: this.networkType,
          },
        };

        return result;
      }

      // Collect errors from failed services
      if (crossChainResult.status === "rejected") {
        const error = crossChainResult.reason;
        if (error.type !== "NOT_FOUND") {
          errors.push(`Explorer API: ${error.message}`);
        }
      }

      if (rpcResult.status === "rejected") {
        const error = rpcResult.reason;
        if (error.type !== "TRANSACTION_NOT_FOUND") {
          errors.push(`RPC Service: ${error.message}`);
        }
      }

      // If both services fail, provide helpful error information
      let errorMessage = `Transaction ${normalizedHash} not found on ${this.networkType} network. `;

      if (errors.length > 0) {
        errorMessage += `Service issues detected: ${errors.join("; ")}. `;
      }

      errorMessage += `This could mean: `;
      errorMessage += `(1) The transaction doesn't exist on this network, `;
      errorMessage += `(2) Try switching to ${
        this.networkType === "testnet" ? "mainnet" : "testnet"
      }, `;
      errorMessage += `(3) The transaction is very recent and not yet indexed, or `;
      errorMessage += `(4) The blockchain services are temporarily unavailable.`;

      throw new SearchError(SEARCH_ERROR_TYPES.NOT_FOUND, errorMessage);
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw this.mapError(error, `Failed to find transaction ${txHash}`);
    }
  }

  /**
   * Search for transactions by address
   * @param {string} address - Wallet address
   * @param {Object} [options] - Search options
   * @param {number} [options.limit] - Maximum number of results
   * @param {number} [options.fromBlock] - Starting block number
   * @param {number} [options.toBlock] - Ending block number
   * @returns {Promise<SearchResult>} Search result
   */
  async searchByAddress(address, options = {}) {
    const startTime = Date.now();
    const normalizedAddress = this.normalizeQuery(address);
    const { limit = 50, fromBlock, toBlock } = options;

    // Validate address format
    const validation = this.validateSearchInput(normalizedAddress);
    if (!validation.isValid || validation.type !== "address") {
      throw new SearchError(
        SEARCH_ERROR_TYPES.INVALID_INPUT,
        "Invalid address format"
      );
    }

    try {
      const errors = [];

      // Try to get cross-chain transactions first
      let crossChainTxs = [];
      try {
        crossChainTxs = await this.apiService.getAddressTransactions(
          normalizedAddress,
          { limit, fromBlock, toBlock }
        );
      } catch (error) {
        errors.push(`Explorer API: ${error.message}`);
        console.warn("Explorer API failed for address search:", error.message);
      }

      // Get regular transactions from RPC
      let regularTxs = [];
      try {
        regularTxs = await this.rpcService.getAddressTransactions(
          normalizedAddress,
          { limit, fromBlock, toBlock }
        );
      } catch (error) {
        errors.push(`RPC Service: ${error.message}`);
        console.warn("RPC service failed for address search:", error.message);
      }

      // Combine and deduplicate results
      const allTransactions = [...crossChainTxs, ...regularTxs];
      const uniqueTransactions = this.deduplicateTransactions(allTransactions);

      // Sort by timestamp (newest first) and limit results
      const sortedTransactions = uniqueTransactions.sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );
      const limitedTransactions = sortedTransactions.slice(0, limit);

      // If no transactions found and we have service errors, provide helpful message
      if (limitedTransactions.length === 0 && errors.length > 0) {
        let errorMessage = `No transactions found for address ${normalizedAddress} on ${this.networkType} network. `;
        errorMessage += `This could mean: (1) The address has no transactions, (2) It's on a different network, or (3) The services are temporarily unavailable. `;
        errorMessage += `Service details: ${errors.join("; ")}`;
        throw new SearchError(SEARCH_ERROR_TYPES.NOT_FOUND, errorMessage);
      }

      const result = {
        type: SEARCH_RESULT_TYPES.ADDRESS_TRANSACTIONS,
        data: limitedTransactions,
        metadata: {
          query: address,
          searchType: "address",
          totalResults: limitedTransactions.length,
          loadTime: Date.now() - startTime,
          network: this.networkType,
          serviceErrors: errors.length > 0 ? errors : undefined,
        },
      };

      return result;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw this.mapError(
        error,
        `Failed to find transactions for address ${address}`
      );
    }
  }

  /**
   * Deduplicate transactions by hash
   * @param {Array<TransactionData|CrossChainTransaction>} transactions - Transactions to deduplicate
   * @returns {Array<TransactionData|CrossChainTransaction>} Deduplicated transactions
   */
  deduplicateTransactions(transactions) {
    const seen = new Set();
    return transactions.filter((tx) => {
      if (seen.has(tx.txHash)) {
        return false;
      }
      seen.add(tx.txHash);
      return true;
    });
  }

  /**
   * Main search method
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @param {number} [options.limit] - Maximum number of results
   * @param {boolean} [options.useCache] - Whether to use cache
   * @returns {Promise<SearchResult>} Search result
   */
  async search(query, options = {}) {
    const { limit = 50, useCache = true } = options;

    // Validate input
    const validation = this.validateSearchInput(query);
    if (!validation.isValid) {
      throw new SearchError(
        SEARCH_ERROR_TYPES.INVALID_INPUT,
        validation.error || "Invalid search input"
      );
    }

    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.getCacheKey(normalizedQuery, validation.type);

    // Check cache
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let result;

    try {
      if (validation.type === "txid") {
        result = await this.searchByTransactionHash(normalizedQuery);
      } else if (validation.type === "address") {
        result = await this.searchByAddress(normalizedQuery, { limit });
      } else {
        throw new SearchError(
          SEARCH_ERROR_TYPES.INVALID_INPUT,
          "Unsupported search type"
        );
      }

      // Cache result
      if (useCache) {
        this.setCache(cacheKey, result);
      }

      // Add to history
      this.addToHistory(query, validation.type, result);

      return result;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw this.mapError(error, "Search operation failed");
    }
  }

  /**
   * Map service errors to SearchError
   * @param {Error} error - Original error
   * @param {string} [defaultMessage] - Default error message
   * @returns {SearchError} Mapped search error
   */
  mapError(error, defaultMessage = "Search failed") {
    if (error instanceof SearchError) {
      return error;
    }

    // Map RPC errors
    if (error.name === "ZetaRPCError") {
      switch (error.type) {
        case "TRANSACTION_NOT_FOUND":
        case "NOT_FOUND":
          return new SearchError(
            SEARCH_ERROR_TYPES.NOT_FOUND,
            "Transaction or address not found",
            error
          );
        case "INVALID_ADDRESS":
        case "INVALID_TX_HASH":
          return new SearchError(
            SEARCH_ERROR_TYPES.INVALID_INPUT,
            error.message,
            error
          );
        case "RPC_TIMEOUT":
          return new SearchError(
            SEARCH_ERROR_TYPES.TIMEOUT,
            "Search request timed out",
            error
          );
        case "NETWORK_ERROR":
          return new SearchError(
            SEARCH_ERROR_TYPES.NETWORK_ERROR,
            "Network connection failed",
            error
          );
        default:
          return new SearchError(
            SEARCH_ERROR_TYPES.SERVICE_ERROR,
            error.message || defaultMessage,
            error
          );
      }
    }

    // Map API errors
    if (error.name === "ZetaScanAPIError") {
      switch (error.type) {
        case "NOT_FOUND":
          return new SearchError(
            SEARCH_ERROR_TYPES.NOT_FOUND,
            "Transaction or address not found",
            error
          );
        case "INVALID_PARAMS":
          return new SearchError(
            SEARCH_ERROR_TYPES.INVALID_INPUT,
            error.message,
            error
          );
        case "TIMEOUT":
          return new SearchError(
            SEARCH_ERROR_TYPES.TIMEOUT,
            "Search request timed out",
            error
          );
        case "NETWORK_ERROR":
          return new SearchError(
            SEARCH_ERROR_TYPES.NETWORK_ERROR,
            "Network connection failed",
            error
          );
        default:
          return new SearchError(
            SEARCH_ERROR_TYPES.SERVICE_ERROR,
            error.message || defaultMessage,
            error
          );
      }
    }

    return new SearchError(
      SEARCH_ERROR_TYPES.UNKNOWN_ERROR,
      error.message || defaultMessage,
      error
    );
  }

  /**
   * Get search history
   * @param {number} [limit] - Maximum number of history items
   * @returns {Array} Search history
   */
  getSearchHistory(limit = 10) {
    return this.historyManager.getHistory({
      limit,
      network: this.networkType,
      successfulOnly: false,
    });
  }

  /**
   * Get search suggestions based on partial query
   * @param {string} partialQuery - Partial search query
   * @param {number} [limit] - Maximum number of suggestions
   * @returns {Array} Search suggestions
   */
  getSearchSuggestions(partialQuery, limit = 5) {
    return this.historyManager.getSuggestions(partialQuery, {
      limit,
      network: this.networkType,
    });
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.historyManager.clearNetworkHistory(this.networkType);
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const [rpcHealthy, apiHealthy] = await Promise.all([
      this.rpcService.isHealthy().catch(() => false),
      this.apiService.isHealthy().catch(() => false),
    ]);

    return {
      network: this.networkType,
      rpcService: rpcHealthy,
      apiService: apiHealthy,
      overall: rpcHealthy || apiHealthy, // At least one service should be healthy
    };
  }
}

/**
 * Create and export singleton instances for both networks
 */
export const searchServiceMainnet = new SearchService("mainnet");
export const searchServiceTestnet = new SearchService("testnet");

/**
 * Get search service instance for network type
 * @param {'mainnet'|'testnet'} networkType - Network type
 * @returns {SearchService} Search service instance
 */
export function getSearchService(networkType) {
  return networkType === "mainnet"
    ? searchServiceMainnet
    : searchServiceTestnet;
}

/**
 * React Query key factory for search operations
 */
export const searchQueryKeys = {
  all: ["search"],
  byNetwork: (networkType) => ["search", networkType],
  transaction: (networkType, txHash) => [
    "search",
    networkType,
    "transaction",
    txHash,
  ],
  address: (networkType, address, options = {}) => [
    "search",
    networkType,
    "address",
    address,
    options,
  ],
  history: (networkType) => ["search", networkType, "history"],
  health: (networkType) => ["search", networkType, "health"],
};
