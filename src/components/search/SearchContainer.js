"use client";

import { useState, useCallback } from "react";
import { SearchInput, SearchResults } from "./index.js";
import { useSearch } from "../../lib/search/index.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 */

/**
 * Complete search container component that integrates search input and results
 * @param {Object} props
 * @param {'mainnet'|'testnet'} [props.networkType] - Network type
 * @param {function} [props.onResultSelect] - Result selection handler (result) => void
 * @param {function} [props.onSearchComplete] - Search completion handler (result) => void
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.searchOptions] - Search options
 * @param {number} [props.searchOptions.limit] - Maximum number of results
 * @param {boolean} [props.searchOptions.useCache] - Whether to use cache
 */
export default function SearchContainer({
  networkType = "testnet",
  onResultSelect,
  onSearchComplete,
  className = "",
  searchOptions = {},
}) {
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState(null);

  // Use search hook
  const {
    search,
    isLoading,
    error: searchError,
    searchHistory,
    getSuggestions,
    clearHistory,
  } = useSearch(networkType);

  /**
   * Handle search execution
   * @param {string} query - Search query
   * @param {'txid'|'address'} type - Search type
   */
  const handleSearch = useCallback(
    async (query, type) => {
      try {
        setSearchQuery(query);
        setSearchType(type);
        setSearchResults(null); // Clear previous results

        const result = await search(query, searchOptions);
        setSearchResults(result);

        if (onSearchComplete) {
          onSearchComplete(result);
        }

        // If we have transaction data, automatically select the first result for sidebar
        if (result && result.data && result.data.length > 0) {
          const firstTransaction = result.data[0];
          console.log("Auto-selecting transaction for sidebar:", firstTransaction);
          if (onResultSelect) {
            onResultSelect(firstTransaction);
          }
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults(null);
      }
    },
    [search, searchOptions, onSearchComplete]
  );

  /**
   * Handle result selection
   * @param {TransactionData|CrossChainTransaction} result - Selected result
   */
  const handleResultSelect = useCallback(
    (result) => {
      if (onResultSelect) {
        onResultSelect(result);
      }
    },
    [onResultSelect]
  );

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setSearchResults(null);
    setSearchQuery("");
    setSearchType(null);
  }, []);

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Search Input */}
      <div className="flex justify-center">
        <SearchInput
          onSearch={handleSearch}
          isLoading={isLoading}
          error={searchError?.message}
          placeholder={`Search ${networkType} transactions and addresses...`}
          getSuggestions={getSuggestions}
          showSuggestions={true}
        />
      </div>

      {/* Search Results */}
      {(searchResults || isLoading || searchError) && (
        <div className="w-full">
          <SearchResults
            results={searchResults?.data || []}
            onResultSelect={handleResultSelect}
            isLoading={isLoading}
            error={searchError?.message}
            searchQuery={searchQuery}
            searchType={searchType}
          />
        </div>
      )}

      {/* Network Indicator */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-600">
          <div
            className={`w-2 h-2 rounded-full ${
              networkType === "mainnet" ? "bg-green-500" : "bg-blue-500"
            }`}
          />
          <span className="font-medium capitalize">{networkType}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Search container with advanced features
 * @param {Object} props
 * @param {'mainnet'|'testnet'} [props.networkType] - Network type
 * @param {function} [props.onResultSelect] - Result selection handler
 * @param {function} [props.onNetworkChange] - Network change handler
 * @param {boolean} [props.showNetworkToggle] - Whether to show network toggle
 * @param {boolean} [props.showSearchHistory] - Whether to show search history
 * @param {string} [props.className] - Additional CSS classes
 */
export function AdvancedSearchContainer({
  networkType = "testnet",
  onResultSelect,
  onNetworkChange,
  showNetworkToggle = false,
  showSearchHistory = false,
  className = "",
}) {
  const [currentNetwork, setCurrentNetwork] = useState(networkType);
  const [showHistory, setShowHistory] = useState(false);

  const { searchHistory } = useSearch(currentNetwork);

  /**
   * Handle network change
   * @param {'mainnet'|'testnet'} newNetwork - New network type
   */
  const handleNetworkChange = useCallback(
    (newNetwork) => {
      setCurrentNetwork(newNetwork);
      if (onNetworkChange) {
        onNetworkChange(newNetwork);
      }
    },
    [onNetworkChange]
  );

  /**
   * Handle history item selection
   * @param {Object} historyItem - History item
   */
  const handleHistorySelect = useCallback((historyItem) => {
    // This would trigger a new search with the historical query
    // Implementation depends on how you want to handle this
    console.log("Selected history item:", historyItem);
  }, []);

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Network Toggle */}
      {showNetworkToggle && (
        <div className="flex justify-center">
          <div className="flex items-center bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md overflow-hidden">
            <button
              onClick={() => handleNetworkChange("testnet")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                currentNetwork === "testnet"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => handleNetworkChange("mainnet")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                currentNetwork === "mainnet"
                  ? "bg-green-100 text-green-700"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Mainnet
            </button>
          </div>
        </div>
      )}

      {/* Main Search Container */}
      <SearchContainer
        networkType={currentNetwork}
        onResultSelect={onResultSelect}
      />

      {/* Search History */}
      {showSearchHistory && searchHistory.length > 0 && (
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              Recent Searches
            </h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showHistory ? "Hide" : "Show"}
            </button>
          </div>

          {showHistory && (
            <div className="space-y-2">
              {searchHistory.slice(0, 5).map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistorySelect(item)}
                  className="w-full p-2 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-sm transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-gray-800">
                      {item.query}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {item.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
