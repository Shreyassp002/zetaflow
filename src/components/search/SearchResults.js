"use client";

import { useState } from "react";
import {
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import StatusIndicator from "../ui/StatusIndicator.js";
import Button from "../ui/Button.js";

/**
 * @typedef {import('../../types/blockchain.js').TransactionData} TransactionData
 * @typedef {import('../../types/zetachain.js').CrossChainTransaction} CrossChainTransaction
 */

/**
 * Search results component for displaying transaction search results
 * @param {Object} props
 * @param {Array<TransactionData|CrossChainTransaction>} props.results - Search results
 * @param {function} props.onResultSelect - Result selection handler (result) => void
 * @param {boolean} [props.isLoading] - Loading state
 * @param {string} [props.error] - Error message
 * @param {string} [props.searchQuery] - Original search query
 * @param {'txid'|'address'} [props.searchType] - Type of search performed
 * @param {string} [props.className] - Additional CSS classes
 */
export default function SearchResults({
  results = [],
  onResultSelect,
  isLoading = false,
  error = null,
  searchQuery = "",
  searchType = "txid",
  className = "",
}) {
  const [expandedResults, setExpandedResults] = useState(new Set());

  /**
   * Toggle expanded state for a result
   * @param {string} resultId - Result identifier
   */
  const toggleExpanded = (resultId) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  /**
   * Format transaction amount for display
   * @param {string} amount - Amount in wei
   * @param {string} [symbol] - Token symbol
   * @returns {string} Formatted amount
   */
  const formatAmount = (amount, symbol = "ETH") => {
    if (!amount || amount === "0") return "0";

    try {
      // Convert from wei to ether (assuming 18 decimals)
      const value = parseFloat(amount) / Math.pow(10, 18);
      if (value < 0.0001) return `< 0.0001 ${symbol}`;
      if (value < 1) return `${value.toFixed(6)} ${symbol}`;
      return `${value.toFixed(4)} ${symbol}`;
    } catch {
      return `${amount} ${symbol}`;
    }
  };

  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date
   */
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  /**
   * Get chain name from chain ID
   * @param {number} chainId - Chain ID
   * @returns {string} Chain name
   */
  const getChainName = (chainId) => {
    const chainNames = {
      1: "Ethereum",
      56: "BNB Chain",
      137: "Polygon",
      8453: "Base",
      7000: "ZetaChain",
      7001: "ZetaChain Testnet",
      11155111: "Sepolia",
      97: "BNB Testnet",
      80001: "Mumbai",
      84531: "Base Goerli",
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  };

  /**
   * Truncate hash for display
   * @param {string} hash - Hash to truncate
   * @param {number} [length] - Length to show on each side
   * @returns {string} Truncated hash
   */
  const truncateHash = (hash, length = 6) => {
    if (!hash) return "";
    if (hash.length <= length * 2 + 3) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  /**
   * Render individual transaction result
   * @param {TransactionData|CrossChainTransaction} result - Transaction result
   * @param {number} index - Result index
   */
  const renderResult = (result, index) => {
    const resultId = result.txHash || `result-${index}`;
    const isExpanded = expandedResults.has(resultId);
    const isCrossChain = "sourceChain" in result;

    return (
      <div
        key={resultId}
        className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md overflow-hidden"
      >
        {/* Result Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIndicator
                status={
                  result.status === "completed"
                    ? "success"
                    : result.status === "failed"
                    ? "failed"
                    : "pending"
                }
                size="md"
              />
              <div>
                <div className="font-medium text-black">
                  {isCrossChain ? "Cross-Chain Transaction" : "Transaction"}
                </div>
                <div className="text-sm text-gray-600 font-mono">
                  {truncateHash(result.txHash)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(resultId)}
                className="p-2"
              >
                <ChevronRight
                  size={16}
                  className={`transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </Button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Amount</div>
              <div className="font-medium">
                {formatAmount(
                  result.amount || result.value,
                  result.tokenInfo?.symbol
                )}
              </div>
            </div>

            <div>
              <div className="text-gray-500">Time</div>
              <div className="font-medium">
                {formatTimestamp(result.timestamp)}
              </div>
            </div>

            {isCrossChain ? (
              <>
                <div>
                  <div className="text-gray-500">From</div>
                  <div className="font-medium">
                    {getChainName(result.sourceChain.chainId)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">To</div>
                  <div className="font-medium">
                    {getChainName(result.destinationChain.chainId)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-gray-500">Chain</div>
                  <div className="font-medium">
                    {getChainName(result.chainId)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Block</div>
                  <div className="font-medium">#{result.blockNumber}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-4 bg-gray-50">
            <div className="space-y-4">
              {/* Transaction Details */}
              <div>
                <h4 className="font-medium text-black mb-2">
                  Transaction Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Hash:</span>
                    <div className="font-mono text-xs break-all">
                      {result.txHash}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="capitalize">{result.status}</div>
                  </div>
                  {!isCrossChain && (
                    <>
                      <div>
                        <span className="text-gray-500">From:</span>
                        <div className="font-mono text-xs break-all">
                          {result.from}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">To:</span>
                        <div className="font-mono text-xs break-all">
                          {result.to}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Gas Used:</span>
                        <div>{result.gasUsed}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Gas Price:</span>
                        <div>{result.gasPrice} wei</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Cross-Chain Details */}
              {isCrossChain &&
                result.crossChainMessages &&
                result.crossChainMessages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-black mb-2">
                      Cross-Chain Messages
                    </h4>
                    <div className="space-y-2">
                      {result.crossChainMessages.map((message, msgIndex) => (
                        <div
                          key={msgIndex}
                          className="p-2 bg-white border border-gray-200 rounded text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {message.messageType}
                            </span>
                            <StatusIndicator
                              status={
                                message.status === "executed"
                                  ? "success"
                                  : message.status === "failed"
                                  ? "failed"
                                  : "pending"
                              }
                              size="sm"
                            />
                          </div>
                          <div className="text-gray-600 text-xs mt-1">
                            {getChainName(message.sourceChain)} →{" "}
                            {getChainName(message.destinationChain)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onResultSelect(result)}
                >
                  View in Graph
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open in explorer - this would need the actual explorer URL
                    const explorerUrl = isCrossChain
                      ? result.sourceChain.explorerUrl || "https://zetascan.com"
                      : "https://zetascan.com";
                    window.open(`${explorerUrl}/tx/${result.txHash}`, "_blank");
                  }}
                  className="flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  Explorer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            <span className="text-gray-600">Searching...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`w-full ${className}`}>
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={20} />
            <span className="font-medium">Search Error</span>
          </div>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // No results
  if (results.length === 0 && searchQuery) {
    return (
      <div className={`w-full ${className}`}>
        <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-md text-center">
          <div className="text-gray-500 mb-2">No results found</div>
          <p className="text-sm text-gray-600">
            No transactions found for{" "}
            {searchType === "txid" ? "transaction hash" : "address"}:
            <span className="font-mono ml-1">
              {truncateHash(searchQuery, 8)}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Results Header */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-black">
              Search Results ({results.length})
            </h3>
            <div className="text-sm text-gray-600">
              {searchType === "txid" ? "Transaction Hash" : "Address"}:
              <span className="font-mono ml-1">
                {truncateHash(searchQuery, 8)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result, index) => renderResult(result, index))}
      </div>
    </div>
  );
}

/**
 * Search results summary component
 * @param {Object} props
 * @param {number} props.totalResults - Total number of results
 * @param {string} props.searchQuery - Search query
 * @param {'txid'|'address'} props.searchType - Search type
 * @param {number} [props.loadTime] - Search load time in ms
 */
export function SearchResultsSummary({
  totalResults,
  searchQuery,
  searchType,
  loadTime,
}) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex items-center justify-between text-sm">
        <div className="text-blue-700">
          Found <span className="font-medium">{totalResults}</span> result
          {totalResults !== 1 ? "s" : ""}
          for {searchType === "txid" ? "transaction" : "address"}
        </div>
        {loadTime && <div className="text-blue-600">{loadTime}ms</div>}
      </div>
    </div>
  );
}
