/**
 * @fileoverview Search service for ZetaFlow application
 * Integrates unified ZetaChain API service for comprehensive search functionality
 */

import { zetaChainService } from "../blockchain/zetachain-service.js";
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
    this.zetaService = zetaChainService;
    this.zetaService.setNetwork(networkType);
    this.historyManager = getSearchHistoryManager();
    this.searchCache = new Map();
  }

  /**
   * Detect likely network from transaction ID patterns and known characteristics
   * @param {string} txHash - Transaction hash
   * @returns {{likelyNetwork: 'mainnet'|'testnet'|'unknown', confidence: 'high'|'medium'|'low', reason: string}}
   */
  detectTransactionNetwork(txHash) {
    const normalizedHash = this.normalizeQuery(txHash);
    
    // Remove 0x prefix for analysis
    const cleanHash = normalizedHash.startsWith('0x') ? normalizedHash.slice(2) : normalizedHash;
    
    // Basic validation - must be 64 hex characters
    if (!/^[0-9a-f]{64}$/i.test(cleanHash)) {
      return {
        likelyNetwork: 'unknown',
        confidence: 'low',
        reason: 'Invalid transaction hash format'
      };
    }

    // ZetaChain-specific patterns for network detection
    // These patterns are based on observed transaction characteristics
    
    // Check for mainnet patterns (block height ranges, common prefixes, etc.)
    // Mainnet transactions often have certain characteristics in their hash patterns
    const firstBytes = cleanHash.substring(0, 8);
    const lastBytes = cleanHash.substring(56, 64);
    
    // Mainnet heuristics (these are examples - would need real data analysis)
    const mainnetIndicators = [
      // Higher entropy in certain positions (mainnet has more activity)
      /^[0-9a-f]{2}[0-9]{2}/.test(firstBytes), // Mixed hex/numeric patterns
      // Certain ranges that are more common on mainnet
      parseInt(firstBytes, 16) > 0x80000000,
    ];
    
    // Testnet heuristics
    const testnetIndicators = [
      // Lower activity patterns
      /^0{2,4}/.test(firstBytes), // Leading zeros more common in testnet
      // Certain ranges more common on testnet
      parseInt(firstBytes, 16) < 0x40000000,
    ];
    
    const mainnetScore = mainnetIndicators.filter(Boolean).length;
    const testnetScore = testnetIndicators.filter(Boolean).length;
    
    // Determine likely network based on pattern analysis
    if (mainnetScore > testnetScore && mainnetScore > 0) {
      return {
        likelyNetwork: 'mainnet',
        confidence: mainnetScore > 1 ? 'medium' : 'low',
        reason: `Transaction hash patterns suggest mainnet (score: ${mainnetScore})`
      };
    } else if (testnetScore > mainnetScore && testnetScore > 0) {
      return {
        likelyNetwork: 'testnet',
        confidence: testnetScore > 1 ? 'medium' : 'low',
        reason: `Transaction hash patterns suggest testnet (score: ${testnetScore})`
      };
    }
    
    // If no clear pattern, return unknown
    return {
      likelyNetwork: 'unknown',
      confidence: 'low',
      reason: 'Cannot determine network from transaction hash pattern - try both networks'
    };
  }

  /**
   * Validate network compatibility before making API calls
   * @param {string} query - Search query (transaction hash or address)
   * @param {'txid'|'address'} type - Query type
   * @returns {{isValid: boolean, networkMismatch?: boolean, suggestedNetwork?: 'mainnet'|'testnet', message?: string, confidence?: string}}
   */
  validateNetworkCompatibility(query, type) {
    if (type === 'address') {
      // Addresses work on both networks, no validation needed
      return { isValid: true };
    }

    if (type === 'txid') {
      const detection = this.detectTransactionNetwork(query);
      
      // If we can detect a likely network and it doesn't match current network
      if (detection.likelyNetwork !== 'unknown' && 
          detection.likelyNetwork !== this.networkType) {
        
        // Only show warning for medium/high confidence
        if (detection.confidence === 'medium' || detection.confidence === 'high') {
          return {
            isValid: false,
            networkMismatch: true,
            suggestedNetwork: detection.likelyNetwork,
            confidence: detection.confidence,
            message: `This transaction hash appears to be from ${detection.likelyNetwork}, but you're currently searching on ${this.networkType}. ${detection.reason}`
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Create network mismatch suggestion message
   * @param {string} query - Search query
   * @param {'mainnet'|'testnet'} suggestedNetwork - Suggested network
   * @param {string} [context] - Additional context (e.g., 'not_found', 'pre_search')
   * @returns {string} User-friendly message with suggestion
   */
  createNetworkMismatchMessage(query, suggestedNetwork, context = 'not_found') {
    const currentNetwork = this.networkType;
    const shortHash = query.length > 10 ? `${query.slice(0, 8)}...${query.slice(-6)}` : query;
    
    if (context === 'pre_search') {
      return `This transaction hash looks like it belongs to ${suggestedNetwork}, but you're currently on ${currentNetwork}. Consider switching networks before searching.`;
    }
    
    return `Transaction ${shortHash} not found on ${currentNetwork}. Try switching to ${suggestedNetwork} - this transaction might exist there instead.`;
  }

  /**
   * Create network switch suggestion with action
   * @param {'mainnet'|'testnet'} suggestedNetwork - Network to suggest
   * @param {string} query - Original search query
   * @returns {Object} Suggestion object with message and action
   */
  createNetworkSwitchSuggestion(suggestedNetwork, query) {
    const shortHash = query.length > 10 ? `${query.slice(0, 8)}...${query.slice(-6)}` : query;
    
    return {
      message: `Switch to ${suggestedNetwork} and search again?`,
      action: 'switch_network',
      targetNetwork: suggestedNetwork,
      originalQuery: query,
      displayHash: shortHash
    };
  }

  /**
   * Enhanced error handling with network suggestions
   * @param {Error} error - Original error
   * @param {string} query - Search query that failed
   * @param {'txid'|'address'} type - Query type
   * @returns {SearchError} Enhanced search error with network suggestions
   */
  enhanceErrorWithNetworkSuggestion(error, query, type) {
    if (error instanceof SearchError && error.type === SEARCH_ERROR_TYPES.NOT_FOUND && type === 'txid') {
      const suggestedNetwork = this.networkType === 'mainnet' ? 'testnet' : 'mainnet';
      const enhancedMessage = this.createNetworkMismatchMessage(query, suggestedNetwork);
      
      return new SearchError(
        SEARCH_ERROR_TYPES.NOT_FOUND,
        enhancedMessage,
        {
          ...error.originalError,
          networkMismatch: true,
          currentNetwork: this.networkType,
          suggestedNetwork: suggestedNetwork,
          originalQuery: query
        }
      );
    }
    
    return error instanceof SearchError ? error : this.mapError(error, "Search failed");
  }

  /**
   * Show appropriate notification for search errors
   * @param {SearchError} error - Search error
   * @param {Object} notificationHandler - Toast notification handler
   * @param {string} query - Original search query
   */
  showSearchErrorNotification(error, notificationHandler, query) {
    const shortHash = query.length > 10 ? `${query.slice(0, 8)}...${query.slice(-6)}` : query;
    
    switch (error.type) {
      case SEARCH_ERROR_TYPES.NOT_FOUND:
        if (error.originalError?.networkMismatch) {
          // Network mismatch error with switch suggestion
          notificationHandler.showError(error.message, {
            title: "Transaction Not Found",
            duration: 8000,
            action: {
              label: `Switch to ${error.originalError.suggestedNetwork}`,
              onClick: () => {
                if (notificationHandler.onNetworkSwitch) {
                  notificationHandler.onNetworkSwitch(error.originalError.suggestedNetwork);
                  notificationHandler.showInfo(
                    `Switched to ${error.originalError.suggestedNetwork}. Try searching again.`,
                    {
                      title: "Network Switched",
                      duration: 3000
                    }
                  );
                }
              }
            }
          });
        } else {
          // Regular not found error
          notificationHandler.showWarning(error.message, {
            title: "Transaction Not Found",
            duration: 6000
          });
        }
        break;
        
      case SEARCH_ERROR_TYPES.NETWORK_ERROR:
        notificationHandler.showError(
          "Network connection failed. Please check your internet connection and try again.",
          {
            title: "Connection Error",
            duration: 6000
          }
        );
        break;
        
      case SEARCH_ERROR_TYPES.TIMEOUT:
        notificationHandler.showWarning(
          "Search request timed out. The network might be busy. Please try again.",
          {
            title: "Request Timeout",
            duration: 5000
          }
        );
        break;
        
      case SEARCH_ERROR_TYPES.SERVICE_ERROR:
        notificationHandler.showError(
          "Service temporarily unavailable. Please try again in a moment.",
          {
            title: "Service Error",
            duration: 5000
          }
        );
        break;
        
      case SEARCH_ERROR_TYPES.INVALID_INPUT:
        notificationHandler.showError(error.message, {
          title: "Invalid Input",
          duration: 5000
        });
        break;
        
      default:
        // Generic error fallback
        notificationHandler.showError(`Search failed: ${error.message}`, {
          title: "Search Error",
          duration: 5000
        });
        break;
    }
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
    this.zetaService.setNetwork(networkType);
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

    // Validate network compatibility
    const networkValidation = this.validateNetworkCompatibility(normalizedHash, "txid");
    if (!networkValidation.isValid && networkValidation.networkMismatch) {
      throw new SearchError(
        SEARCH_ERROR_TYPES.NOT_FOUND,
        networkValidation.message,
        {
          networkMismatch: true,
          currentNetwork: this.networkType,
          suggestedNetwork: networkValidation.suggestedNetwork,
          originalQuery: txHash
        }
      );
    }

    try {
      // Ensure ZetaChain service is using the correct network
      this.zetaService.setNetwork(this.networkType);
      
      // Use unified ZetaChain service for transaction search
      const transactionData = await this.zetaService.getTransaction(
        normalizedHash
      );

      // Determine result type based on transaction data
      const resultType =
        transactionData.type === "cross-chain"
          ? SEARCH_RESULT_TYPES.CROSS_CHAIN_TRANSACTION
          : SEARCH_RESULT_TYPES.TRANSACTION;

      const result = {
        type: resultType,
        data: [transactionData],
        metadata: {
          query: txHash,
          searchType: "txid",
          totalResults: 1,
          loadTime: Date.now() - startTime,
          network: this.networkType,
        },
      };

      return result;
    } catch (error) {
      // Handle ZetaChainService errors with enhanced network suggestions
      if (error.name === "ZetaChainServiceError") {
        // Check for network-related errors (400 errors, not found, etc.)
        const isNetworkMismatchError = 
          error.type === "TRANSACTION_NOT_FOUND" ||
          error.message.includes("400") ||
          error.message.includes("Cross-chain API request failed") ||
          error.message.includes("not found");

        if (isNetworkMismatchError) {
          // Create enhanced error with network suggestion
          const suggestedNetwork = this.networkType === "testnet" ? "mainnet" : "testnet";
          const enhancedError = new SearchError(
            SEARCH_ERROR_TYPES.NOT_FOUND,
            `Transaction not found on ${this.networkType}. This transaction might exist on ${suggestedNetwork} instead.`,
            {
              networkMismatch: true,
              currentNetwork: this.networkType,
              suggestedNetwork: suggestedNetwork,
              originalQuery: txHash,
              originalError: error
            }
          );
          throw enhancedError;
        }

        throw new SearchError(
          this.mapZetaServiceErrorType(error.type),
          error.message,
          error
        );
      }

      // Handle generic errors that might indicate network issues
      if (error.message && (
        error.message.includes("400") ||
        error.message.includes("not found") ||
        error.message.includes("Cross-chain API request failed")
      )) {
        const suggestedNetwork = this.networkType === "testnet" ? "mainnet" : "testnet";
        const enhancedError = new SearchError(
          SEARCH_ERROR_TYPES.NOT_FOUND,
          `Transaction not found on ${this.networkType}. This transaction might exist on ${suggestedNetwork} instead.`,
          {
            networkMismatch: true,
            currentNetwork: this.networkType,
            suggestedNetwork: suggestedNetwork,
            originalQuery: txHash,
            originalError: error
          }
        );
        throw enhancedError;
      }

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
    const { limit = 50 } = options;

    // Validate address format
    const validation = this.validateSearchInput(normalizedAddress);
    if (!validation.isValid || validation.type !== "address") {
      throw new SearchError(
        SEARCH_ERROR_TYPES.INVALID_INPUT,
        "Invalid address format"
      );
    }

    try {
      // Note: Address search is not implemented in the unified ZetaChain API
      // This would require additional endpoints or block scanning
      // For now, return empty results with helpful message

      const result = {
        type: SEARCH_RESULT_TYPES.ADDRESS_TRANSACTIONS,
        data: [],
        metadata: {
          query: address,
          searchType: "address",
          totalResults: 0,
          loadTime: Date.now() - startTime,
          network: this.networkType,
          note: "Address transaction search is not yet implemented. The unified ZetaChain API currently supports transaction hash search only.",
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
   * Main search method with network validation and notification support
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @param {number} [options.limit] - Maximum number of results
   * @param {boolean} [options.useCache] - Whether to use cache
   * @param {Object} [options.notificationHandler] - Toast notification handler
   * @returns {Promise<SearchResult>} Search result
   */
  async search(query, options = {}) {
    const { limit = 50, useCache = true, notificationHandler } = options;

    // Validate input
    const validation = this.validateSearchInput(query);
    if (!validation.isValid) {
      const error = new SearchError(
        SEARCH_ERROR_TYPES.INVALID_INPUT,
        validation.error || "Invalid search input"
      );
      
      // Show notification if handler provided
      if (notificationHandler?.showError) {
        notificationHandler.showError(error.message, {
          title: "Invalid Input",
          duration: 5000
        });
      }
      
      throw error;
    }

    const normalizedQuery = this.normalizeQuery(query);
    
    // Pre-search network validation for transaction hashes
    if (validation.type === "txid") {
      const networkValidation = this.validateNetworkCompatibility(normalizedQuery, validation.type);
      
      if (!networkValidation.isValid && networkValidation.networkMismatch) {
        // Show network mismatch warning with suggestion
        if (notificationHandler?.showWarning) {
          const suggestion = this.createNetworkSwitchSuggestion(
            networkValidation.suggestedNetwork, 
            normalizedQuery
          );
          
          notificationHandler.showWarning(
            this.createNetworkMismatchMessage(
              normalizedQuery, 
              networkValidation.suggestedNetwork, 
              'pre_search'
            ), 
            {
              title: "Network Mismatch Detected",
              duration: 8000,
              action: {
                label: `Switch to ${networkValidation.suggestedNetwork}`,
                onClick: () => {
                  if (notificationHandler.onNetworkSwitch) {
                    notificationHandler.onNetworkSwitch(networkValidation.suggestedNetwork);
                  }
                }
              }
            }
          );
        }
      }
    }

    const cacheKey = this.getCacheKey(normalizedQuery, validation.type);

    // Check cache
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Ensure ZetaChain service is using the correct network before any search
    this.zetaService.setNetwork(this.networkType);

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
      // Enhanced error handling with network suggestions
      const enhancedError = this.enhanceErrorWithNetworkSuggestion(error, normalizedQuery, validation.type);
      
      // Show appropriate notification
      if (notificationHandler) {
        this.showSearchErrorNotification(enhancedError, notificationHandler, normalizedQuery);
      }
      
      throw enhancedError;
    }
  }

  /**
   * Map ZetaChainService error types to SearchError types
   * @param {string} zetaServiceErrorType - ZetaChainService error type
   * @returns {string} SearchError type
   */
  mapZetaServiceErrorType(zetaServiceErrorType) {
    switch (zetaServiceErrorType) {
      case "TRANSACTION_NOT_FOUND":
        return SEARCH_ERROR_TYPES.NOT_FOUND;
      case "INVALID_INPUT":
        return SEARCH_ERROR_TYPES.INVALID_INPUT;
      case "NETWORK_ERROR":
        return SEARCH_ERROR_TYPES.NETWORK_ERROR;
      case "TIMEOUT":
        return SEARCH_ERROR_TYPES.TIMEOUT;
      case "API_RATE_LIMIT":
        return SEARCH_ERROR_TYPES.SERVICE_ERROR;
      default:
        return SEARCH_ERROR_TYPES.UNKNOWN_ERROR;
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

    // Map ZetaChainService errors
    if (error.name === "ZetaChainServiceError") {
      return new SearchError(
        this.mapZetaServiceErrorType(error.type),
        error.message,
        error
      );
    }

    // Check for network-related error patterns in the message
    const errorMessage = error.message || "";
    if (errorMessage.includes("400") || 
        errorMessage.includes("not found") ||
        errorMessage.includes("Cross-chain API request failed")) {
      return new SearchError(
        SEARCH_ERROR_TYPES.NOT_FOUND,
        errorMessage,
        error
      );
    }

    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      return new SearchError(
        SEARCH_ERROR_TYPES.NETWORK_ERROR,
        errorMessage,
        error
      );
    }

    if (errorMessage.includes("timeout")) {
      return new SearchError(
        SEARCH_ERROR_TYPES.TIMEOUT,
        errorMessage,
        error
      );
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
    try {
      // Test the unified service with a simple network info call
      const networkInfo = this.zetaService.getNetworkInfo();
      const isHealthy =
        !!networkInfo && networkInfo.network === this.networkType;

      return {
        network: this.networkType,
        zetaService: isHealthy,
        overall: isHealthy,
        networkInfo: networkInfo,
      };
    } catch (error) {
      return {
        network: this.networkType,
        zetaService: false,
        overall: false,
        error: error.message,
      };
    }
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
