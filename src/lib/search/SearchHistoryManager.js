/**
 * @fileoverview Search history manager for persistent search history
 * Manages search history with local storage persistence and caching
 */

/**
 * Search history item
 * @typedef {Object} SearchHistoryItem
 * @property {string} query - Search query
 * @property {'txid'|'address'} type - Search type
 * @property {number} timestamp - Search timestamp
 * @property {'mainnet'|'testnet'} network - Network used
 * @property {number} resultCount - Number of results found
 * @property {boolean} successful - Whether search was successful
 */

/**
 * Search history manager class
 */
export class SearchHistoryManager {
  /**
   * @param {string} [storageKey] - Local storage key
   * @param {number} [maxItems] - Maximum number of history items
   */
  constructor(storageKey = "zetaflow_search_history", maxItems = 100) {
    this.storageKey = storageKey;
    this.maxItems = maxItems;
    this.history = this._loadFromStorage();
  }

  /**
   * Load history from local storage
   * @returns {SearchHistoryItem[]} History items
   * @private
   */
  _loadFromStorage() {
    try {
      if (typeof window === "undefined") {
        return []; // SSR compatibility
      }

      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Validate and filter history items
      return parsed
        .filter(this._isValidHistoryItem)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxItems);
    } catch (error) {
      console.warn("Failed to load search history from storage:", error);
      return [];
    }
  }

  /**
   * Save history to local storage
   * @private
   */
  _saveToStorage() {
    try {
      if (typeof window === "undefined") {
        return; // SSR compatibility
      }

      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.warn("Failed to save search history to storage:", error);
    }
  }

  /**
   * Validate history item structure
   * @param {any} item - Item to validate
   * @returns {boolean} Whether item is valid
   * @private
   */
  _isValidHistoryItem(item) {
    return (
      item &&
      typeof item === "object" &&
      typeof item.query === "string" &&
      typeof item.type === "string" &&
      typeof item.timestamp === "number" &&
      typeof item.network === "string" &&
      typeof item.resultCount === "number" &&
      typeof item.successful === "boolean"
    );
  }

  /**
   * Add search to history
   * @param {string} query - Search query
   * @param {'txid'|'address'} type - Search type
   * @param {'mainnet'|'testnet'} network - Network used
   * @param {number} resultCount - Number of results found
   * @param {boolean} successful - Whether search was successful
   */
  addSearch(query, type, network, resultCount, successful) {
    const normalizedQuery = query.trim().toLowerCase();

    // Remove existing entry for the same query/type/network combination
    this.history = this.history.filter(
      (item) =>
        !(
          item.query.toLowerCase() === normalizedQuery &&
          item.type === type &&
          item.network === network
        )
    );

    // Add new entry at the beginning
    const newItem = {
      query: query.trim(),
      type,
      network,
      resultCount,
      successful,
      timestamp: Date.now(),
    };

    this.history.unshift(newItem);

    // Limit history size
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    this._saveToStorage();
  }

  /**
   * Get search history
   * @param {Object} [options] - Filter options
   * @param {number} [options.limit] - Maximum number of items
   * @param {'mainnet'|'testnet'} [options.network] - Filter by network
   * @param {'txid'|'address'} [options.type] - Filter by search type
   * @param {boolean} [options.successfulOnly] - Only successful searches
   * @returns {SearchHistoryItem[]} Filtered history items
   */
  getHistory(options = {}) {
    const { limit = 50, network, type, successfulOnly = false } = options;

    let filtered = [...this.history];

    // Apply filters
    if (network) {
      filtered = filtered.filter((item) => item.network === network);
    }

    if (type) {
      filtered = filtered.filter((item) => item.type === type);
    }

    if (successfulOnly) {
      filtered = filtered.filter((item) => item.successful);
    }

    // Sort by timestamp (newest first) and limit
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get search suggestions based on partial query
   * @param {string} partialQuery - Partial search query
   * @param {Object} [options] - Filter options
   * @param {number} [options.limit] - Maximum number of suggestions
   * @param {'mainnet'|'testnet'} [options.network] - Filter by network
   * @param {'txid'|'address'} [options.type] - Filter by search type
   * @returns {SearchHistoryItem[]} Matching history items
   */
  getSuggestions(partialQuery, options = {}) {
    const { limit = 5, network, type } = options;

    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const queryLower = partialQuery.toLowerCase();
    let filtered = this.history.filter((item) =>
      item.query.toLowerCase().includes(queryLower)
    );

    // Apply filters
    if (network) {
      filtered = filtered.filter((item) => item.network === network);
    }

    if (type) {
      filtered = filtered.filter((item) => item.type === type);
    }

    // Sort by relevance (exact matches first, then by recency)
    filtered.sort((a, b) => {
      const aExact = a.query.toLowerCase() === queryLower;
      const bExact = b.query.toLowerCase() === queryLower;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.query.toLowerCase().startsWith(queryLower);
      const bStarts = b.query.toLowerCase().startsWith(queryLower);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return b.timestamp - a.timestamp;
    });

    return filtered.slice(0, limit);
  }

  /**
   * Remove specific search from history
   * @param {string} query - Search query to remove
   * @param {'txid'|'address'} type - Search type
   * @param {'mainnet'|'testnet'} network - Network
   */
  removeSearch(query, type, network) {
    const normalizedQuery = query.trim().toLowerCase();
    this.history = this.history.filter(
      (item) =>
        !(
          item.query.toLowerCase() === normalizedQuery &&
          item.type === type &&
          item.network === network
        )
    );
    this._saveToStorage();
  }

  /**
   * Clear all search history
   */
  clearHistory() {
    this.history = [];
    this._saveToStorage();
  }

  /**
   * Clear history for specific network
   * @param {'mainnet'|'testnet'} network - Network to clear
   */
  clearNetworkHistory(network) {
    this.history = this.history.filter((item) => item.network !== network);
    this._saveToStorage();
  }

  /**
   * Get search statistics
   * @param {'mainnet'|'testnet'} [network] - Filter by network
   * @returns {Object} Search statistics
   */
  getStatistics(network) {
    let filtered = this.history;

    if (network) {
      filtered = filtered.filter((item) => item.network === network);
    }

    const totalSearches = filtered.length;
    const successfulSearches = filtered.filter(
      (item) => item.successful
    ).length;
    const txidSearches = filtered.filter((item) => item.type === "txid").length;
    const addressSearches = filtered.filter(
      (item) => item.type === "address"
    ).length;

    const recentSearches = filtered.filter(
      (item) => Date.now() - item.timestamp < 24 * 60 * 60 * 1000
    ).length; // Last 24 hours

    return {
      totalSearches,
      successfulSearches,
      failedSearches: totalSearches - successfulSearches,
      successRate:
        totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0,
      txidSearches,
      addressSearches,
      recentSearches,
      networks: network
        ? [network]
        : [...new Set(this.history.map((item) => item.network))],
    };
  }

  /**
   * Export history as JSON
   * @returns {string} JSON string of history
   */
  exportHistory() {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import history from JSON
   * @param {string} jsonData - JSON string of history data
   * @returns {boolean} Whether import was successful
   */
  importHistory(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) {
        throw new Error("Invalid data format");
      }

      const validItems = imported.filter(this._isValidHistoryItem);

      // Merge with existing history and deduplicate
      const combined = [...validItems, ...this.history];
      const unique = [];
      const seen = new Set();

      for (const item of combined) {
        const key = `${item.query.toLowerCase()}-${item.type}-${item.network}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      this.history = unique
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxItems);

      this._saveToStorage();
      return true;
    } catch (error) {
      console.error("Failed to import search history:", error);
      return false;
    }
  }
}

/**
 * Create and export singleton instance
 */
export const searchHistoryManager = new SearchHistoryManager();

/**
 * Get search history manager instance
 * @returns {SearchHistoryManager} History manager instance
 */
export function getSearchHistoryManager() {
  return searchHistoryManager;
}
