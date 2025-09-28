/**
 * @fileoverview React hooks for search functionality
 * Provides hooks for search operations with React Query integration
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSearchService, searchQueryKeys } from "./SearchService.js";

/**
 * Hook for performing searches with caching and state management
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @returns {Object} Search hook state and methods
 */
export function useSearch(networkType = "testnet") {
  const [searchHistory, setSearchHistory] = useState([]);
  const queryClient = useQueryClient();
  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );

  // Load search history on mount and network change
  useEffect(() => {
    const history = searchService.getSearchHistory(20);
    setSearchHistory(history);
  }, [searchService, networkType]);

  // Search mutation for performing searches
  const searchMutation = useMutation({
    mutationFn: async ({ query, options = {} }) => {
      const result = await searchService.search(query, options);

      // Update search history after successful search
      const updatedHistory = searchService.getSearchHistory(20);
      setSearchHistory(updatedHistory);

      return result;
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: searchQueryKeys.byNetwork(networkType),
      });
    },
    onError: (error) => {
      console.error("Search failed:", error);
    },
  });

  // Search function
  const search = useCallback(
    (query, options = {}) => {
      return searchMutation.mutateAsync({ query, options });
    },
    [searchMutation]
  );

  // Validate search input
  const validateInput = useCallback(
    (query) => {
      return searchService.validateSearchInput(query);
    },
    [searchService]
  );

  // Get search suggestions
  const getSuggestions = useCallback(
    (partialQuery, limit = 5) => {
      return searchService.getSearchSuggestions(partialQuery, limit);
    },
    [searchService]
  );

  // Clear search cache
  const clearCache = useCallback(() => {
    searchService.clearCache();
    queryClient.invalidateQueries({
      queryKey: searchQueryKeys.byNetwork(networkType),
    });
  }, [searchService, queryClient, networkType]);

  // Clear search history
  const clearHistory = useCallback(() => {
    searchService.clearHistory();
    setSearchHistory([]);
  }, [searchService]);

  // Refresh search history
  const refreshHistory = useCallback(() => {
    const history = searchService.getSearchHistory(20);
    setSearchHistory(history);
  }, [searchService]);

  return {
    // Search state
    isLoading: searchMutation.isPending,
    error: searchMutation.error,
    data: searchMutation.data,

    // Search methods
    search,
    validateInput,
    getSuggestions,
    clearCache,
    clearHistory,
    refreshHistory,

    // Search history
    searchHistory,

    // Mutation object for advanced usage
    searchMutation,
  };
}

/**
 * Hook for getting transaction details by hash
 * @param {string} txHash - Transaction hash
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @param {Object} [options] - Query options
 * @returns {Object} Query result
 */
export function useTransactionSearch(
  txHash,
  networkType = "testnet",
  options = {}
) {
  const { enabled = true, ...queryOptions } = options;
  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );

  return useQuery({
    queryKey: searchQueryKeys.transaction(networkType, txHash),
    queryFn: () => searchService.searchByTransactionHash(txHash),
    enabled: enabled && !!txHash,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...queryOptions,
  });
}

/**
 * Hook for getting address transactions
 * @param {string} address - Wallet address
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @param {Object} [options] - Query options
 * @returns {Object} Query result
 */
export function useAddressSearch(
  address,
  networkType = "testnet",
  options = {}
) {
  const {
    enabled = true,
    limit = 50,
    fromBlock,
    toBlock,
    ...queryOptions
  } = options;

  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );
  const searchOptions = { limit, fromBlock, toBlock };

  return useQuery({
    queryKey: searchQueryKeys.address(networkType, address, searchOptions),
    queryFn: () => searchService.searchByAddress(address, searchOptions),
    enabled: enabled && !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

/**
 * Hook for search service health status
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @returns {Object} Health status query result
 */
export function useSearchHealth(networkType = "testnet") {
  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );

  return useQuery({
    queryKey: searchQueryKeys.health(networkType),
    queryFn: () => searchService.getHealthStatus(),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for managing search input state with validation
 * @param {Object} [options] - Hook options
 * @param {string} [options.initialValue] - Initial input value
 * @param {'mainnet'|'testnet'} [options.networkType] - Network type
 * @param {function} [options.onSearch] - Search callback
 * @param {function} [options.onValidationChange] - Validation change callback
 * @returns {Object} Search input state and handlers
 */
export function useSearchInput(options = {}) {
  const {
    initialValue = "",
    networkType = "testnet",
    onSearch,
    onValidationChange,
  } = options;

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);

  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );
  const { search, isLoading } = useSearch(networkType);

  // Validate input
  const validation = useMemo(() => {
    const result = searchService.validateSearchInput(value);
    if (onValidationChange) {
      onValidationChange(result);
    }
    return result;
  }, [value, searchService, onValidationChange]);

  // Handle input change
  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    setError(null); // Clear error when user types
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!validation.isValid) {
      setError(validation.error || "Invalid input");
      return;
    }

    try {
      const result = await search(value);
      if (onSearch) {
        onSearch(result);
      }
      return result;
    } catch (searchError) {
      setError(searchError.message);
      throw searchError;
    }
  }, [validation, value, search, onSearch]);

  // Reset function
  const reset = useCallback(() => {
    setValue("");
    setError(null);
  }, []);

  return {
    // Input state
    value,
    setValue: handleChange,
    validation,
    error,
    setError,
    isLoading,

    // Actions
    search: handleSearch,
    reset,

    // Computed properties
    isValid: validation.isValid,
    searchType: validation.type,
  };
}

/**
 * Hook for search suggestions based on history
 * @param {string} query - Current search query
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @param {number} [maxSuggestions] - Maximum number of suggestions
 * @returns {Array} Search suggestions
 */
export function useSearchSuggestions(
  query,
  networkType = "testnet",
  maxSuggestions = 5
) {
  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );

  const suggestions = useMemo(() => {
    if (!query || query.length < 3) {
      return [];
    }

    const history = searchService.getSearchHistory(20);
    const queryLower = query.toLowerCase();

    return history
      .filter(({ query: historyQuery }) =>
        historyQuery.toLowerCase().includes(queryLower)
      )
      .slice(0, maxSuggestions)
      .map(({ query: historyQuery, type, timestamp }) => ({
        query: historyQuery,
        type,
        timestamp,
        isExact: historyQuery.toLowerCase() === queryLower,
      }));
  }, [query, searchService, maxSuggestions]);

  return suggestions;
}

/**
 * Hook for debounced search with automatic execution
 * @param {string} query - Search query
 * @param {'mainnet'|'testnet'} [networkType] - Network type
 * @param {Object} [options] - Hook options
 * @param {number} [options.delay] - Debounce delay in ms
 * @param {number} [options.minLength] - Minimum query length
 * @param {boolean} [options.enabled] - Whether search is enabled
 * @returns {Object} Debounced search result
 */
export function useDebouncedSearch(
  query,
  networkType = "testnet",
  options = {}
) {
  const { delay = 500, minLength = 3, enabled = true } = options;
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const searchService = useMemo(
    () => getSearchService(networkType),
    [networkType]
  );

  // Debounce the query
  useMemo(() => {
    const timer = setTimeout(() => {
      if (query.length >= minLength) {
        setDebouncedQuery(query);
      } else {
        setDebouncedQuery("");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, minLength]);

  // Validate debounced query
  const validation = useMemo(() => {
    if (!debouncedQuery) {
      return { isValid: false, type: "empty" };
    }
    return searchService.validateSearchInput(debouncedQuery);
  }, [debouncedQuery, searchService]);

  // Perform search when debounced query changes
  const searchResult = useQuery({
    queryKey: ["debouncedSearch", networkType, debouncedQuery],
    queryFn: () => searchService.search(debouncedQuery),
    enabled: enabled && validation.isValid && !!debouncedQuery,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    query: debouncedQuery,
    validation,
    ...searchResult,
  };
}
