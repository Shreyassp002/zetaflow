/**
 * @fileoverview React Query hooks for ZetaChain API integration
 * Provides caching, background updates, and error handling for ZetaChain operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zetaChainService } from "./zetachain-service.js";

/**
 * Query keys for ZetaChain operations
 */
export const zetaChainQueryKeys = {
  all: ["zetachain"],
  transactions: () => [...zetaChainQueryKeys.all, "transactions"],
  transaction: (txHashOrUrl, network) => [
    ...zetaChainQueryKeys.transactions(),
    "transaction",
    txHashOrUrl,
    network,
  ],
  transactionWithReceipt: (txHash, network) => [
    ...zetaChainQueryKeys.transactions(),
    "transaction-receipt",
    txHash,
    network,
  ],
  networkInfo: (network) => [
    ...zetaChainQueryKeys.all,
    "network-info",
    network,
  ],
};

/**
 * Hook to get transaction data with automatic caching and error handling
 * @param {string} txHashOrUrl - Transaction hash or ZetaScan URL
 * @param {Object} options - Query options
 * @returns {Object} Query result with data, loading, error states
 */
export function useZetaTransaction(txHashOrUrl, options = {}) {
  const network = zetaChainService.getCurrentNetwork();

  return useQuery({
    queryKey: zetaChainQueryKeys.transaction(txHashOrUrl, network),
    queryFn: () => zetaChainService.getTransaction(txHashOrUrl),
    enabled: Boolean(txHashOrUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (
        error?.type === "INVALID_INPUT" ||
        error?.type === "TRANSACTION_NOT_FOUND"
      ) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook to get transaction with receipt data
 * @param {string} txHash - Transaction hash
 * @param {Object} options - Query options
 * @returns {Object} Query result with enhanced transaction data
 */
export function useZetaTransactionWithReceipt(txHash, options = {}) {
  const network = zetaChainService.getCurrentNetwork();

  return useQuery({
    queryKey: zetaChainQueryKeys.transactionWithReceipt(txHash, network),
    queryFn: () => zetaChainService.getTransactionWithReceipt(txHash),
    enabled: Boolean(txHash),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (
        error?.type === "INVALID_INPUT" ||
        error?.type === "TRANSACTION_NOT_FOUND"
      ) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook to get network information
 * @param {Object} options - Query options
 * @returns {Object} Query result with network configuration
 */
export function useZetaNetworkInfo(options = {}) {
  const network = zetaChainService.getCurrentNetwork();

  return useQuery({
    queryKey: zetaChainQueryKeys.networkInfo(network),
    queryFn: () => zetaChainService.getNetworkInfo(),
    staleTime: 30 * 60 * 1000, // 30 minutes (network info rarely changes)
    cacheTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

/**
 * Hook to switch networks with cache invalidation
 * @returns {Object} Mutation object for network switching
 */
export function useZetaNetworkSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (network) => {
      zetaChainService.setNetwork(network);
      return Promise.resolve(network);
    },
    onSuccess: () => {
      // Invalidate all queries when network changes
      queryClient.invalidateQueries({ queryKey: zetaChainQueryKeys.all });
    },
    onError: (error) => {
      console.error("Failed to switch network:", error);
    },
  });
}

/**
 * Hook to clear ZetaChain cache
 * @returns {Object} Mutation object for cache clearing
 */
export function useZetaCacheClear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      zetaChainService.clearCache();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Remove all ZetaChain queries from React Query cache
      queryClient.removeQueries({ queryKey: zetaChainQueryKeys.all });
    },
  });
}

/**
 * Hook for batch transaction fetching
 * @param {string[]} txHashes - Array of transaction hashes
 * @param {Object} options - Query options
 * @returns {Object[]} Array of query results
 */
export function useZetaTransactionBatch(txHashes, options = {}) {
  const network = zetaChainService.getCurrentNetwork();

  return useQuery({
    queryKey: [
      ...zetaChainQueryKeys.transactions(),
      "batch",
      txHashes,
      network,
    ],
    queryFn: async () => {
      const results = await Promise.allSettled(
        txHashes.map((hash) => zetaChainService.getTransaction(hash))
      );

      return results.map((result, index) => ({
        txHash: txHashes[index],
        status: result.status,
        data: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? result.reason : null,
      }));
    },
    enabled: Boolean(txHashes?.length),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Custom hook for real-time transaction status updates
 * @param {string} txHash - Transaction hash to monitor
 * @param {Object} options - Options including polling interval
 * @returns {Object} Query result with real-time updates
 */
export function useZetaTransactionStatus(txHash, options = {}) {
  const { pollingInterval = 10000, ...queryOptions } = options; // Default 10 seconds
  const network = zetaChainService.getCurrentNetwork();

  return useQuery({
    queryKey: [...zetaChainQueryKeys.transaction(txHash, network), "status"],
    queryFn: async () => {
      const tx = await zetaChainService.getTransaction(txHash);
      return {
        txHash,
        status: tx.status,
        timestamp: Date.now(),
        blockNumber: tx.blockNumber,
        type: tx.type,
      };
    },
    enabled: Boolean(txHash),
    refetchInterval: (data) => {
      // Stop polling if transaction is completed or failed
      if (data?.status === "success" || data?.status === "failed") {
        return false;
      }
      return pollingInterval;
    },
    staleTime: 0, // Always consider stale for real-time updates
    ...queryOptions,
  });
}

/**
 * Error boundary helper for ZetaChain operations
 * @param {Error} error - Error to handle
 * @returns {Object} Formatted error information
 */
export function handleZetaChainError(error) {
  if (error?.name === "ZetaChainServiceError") {
    return {
      type: error.type,
      message: error.message,
      isRetryable:
        error.type !== "INVALID_INPUT" &&
        error.type !== "TRANSACTION_NOT_FOUND",
      timestamp: error.timestamp,
    };
  }

  return {
    type: "UNKNOWN",
    message: error?.message || "An unknown error occurred",
    isRetryable: true,
    timestamp: Date.now(),
  };
}
