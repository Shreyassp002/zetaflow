"use client";

import { useState } from "react";
import { SearchContainer, AdvancedSearchContainer } from "../search/index.js";

/**
 * Demo component for testing search functionality
 */
export default function SearchDemo() {
  const [selectedResult, setSelectedResult] = useState(null);
  const [networkType, setNetworkType] = useState("testnet");

  /**
   * Handle result selection
   * @param {Object} result - Selected search result
   */
  const handleResultSelect = (result) => {
    setSelectedResult(result);
    console.log("Selected result:", result);
  };

  /**
   * Handle search completion
   * @param {Object} searchResult - Complete search result
   */
  const handleSearchComplete = (searchResult) => {
    console.log("Search completed:", searchResult);
  };

  /**
   * Handle network change
   * @param {'mainnet'|'testnet'} newNetwork - New network type
   */
  const handleNetworkChange = (newNetwork) => {
    setNetworkType(newNetwork);
    setSelectedResult(null); // Clear selection when network changes
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            ZetaFlow Search Demo
          </h1>
          <p className="text-gray-600">
            Test the search functionality for ZetaChain transactions and
            addresses
          </p>
        </div>

        {/* Basic Search Container */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-black mb-4">
            Basic Search
          </h2>
          <SearchContainer
            networkType={networkType}
            onResultSelect={handleResultSelect}
            onSearchComplete={handleSearchComplete}
            className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        {/* Advanced Search Container */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-black mb-4">
            Advanced Search
          </h2>
          <AdvancedSearchContainer
            networkType={networkType}
            onResultSelect={handleResultSelect}
            onNetworkChange={handleNetworkChange}
            showNetworkToggle={true}
            showSearchHistory={true}
            className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        {/* Selected Result Display */}
        {selectedResult && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-black mb-4">
              Selected Result
            </h2>
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <pre className="text-sm text-gray-800 overflow-auto">
                {JSON.stringify(selectedResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Example Queries */}
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            Example Queries to Test
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-blue-700">
                Transaction Hash:
              </span>
              <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-blue-800">
                0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
              </code>
            </div>
            <div>
              <span className="font-medium text-blue-700">Wallet Address:</span>
              <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-blue-800">
                0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
              </code>
            </div>
            <div className="text-blue-600 text-xs mt-3">
              Note: These are example formats. Use real transaction hashes and
              addresses from ZetaChain for actual testing.
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-600">
            <div
              className={`w-3 h-3 rounded-full ${
                networkType === "mainnet" ? "bg-green-500" : "bg-blue-500"
              }`}
            />
            <span className="font-medium">
              Currently searching on{" "}
              {networkType === "mainnet"
                ? "ZetaChain Mainnet"
                : "ZetaChain Athens-3 Testnet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
