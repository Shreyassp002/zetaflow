/**
 * @fileoverview Search module exports
 */

// Search service
export {
  SearchService,
  SearchError,
  getSearchService,
  searchServiceMainnet,
  searchServiceTestnet,
  searchQueryKeys,
  SEARCH_RESULT_TYPES,
  SEARCH_ERROR_TYPES,
} from "./SearchService.js";

// Search hooks
export {
  useSearch,
  useTransactionSearch,
  useAddressSearch,
  useSearchHealth,
  useSearchInput,
  useSearchSuggestions,
  useDebouncedSearch,
} from "./useSearch.js";

// Search history management
export {
  SearchHistoryManager,
  getSearchHistoryManager,
  searchHistoryManager,
} from "./SearchHistoryManager.js";

// Validation utilities (moved from MockDataService)
export {
  isValidTxHash,
  isValidAddress,
  simulateDelay,
} from "./MockDataService.js";
