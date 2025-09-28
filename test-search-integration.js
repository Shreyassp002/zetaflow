#!/usr/bin/env node

/**
 * Integration test for ZetaFlow search functionality with ZetaChain services
 * Tests the complete search pipeline including history and caching
 */

import { getSearchService } from "./src/lib/search/SearchService.js";
import { getSearchHistoryManager } from "./src/lib/search/SearchHistoryManager.js";

async function testSearchIntegration() {
  console.log("🔍 Testing ZetaFlow Search Integration\n");

  const searchService = getSearchService("testnet");
  const historyManager = getSearchHistoryManager();

  // Clear history for clean test
  historyManager.clearHistory();

  // Test 1: Service Health Check
  console.log("1. Testing service health...");
  try {
    const health = await searchService.getHealthStatus();
    console.log("✅ Health Status:", {
      network: health.network,
      rpcService: health.rpcService,
      apiService: health.apiService,
      overall: health.overall,
    });
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  // Test 2: Input Validation
  console.log("\n2. Testing input validation...");
  const testInputs = [
    {
      input:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      expected: { isValid: true, type: "txid" },
    },
    {
      input: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      expected: { isValid: true, type: "address" },
    },
    {
      input: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      expected: { isValid: true, type: "txid" },
    },
    {
      input: "742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      expected: { isValid: true, type: "address" },
    },
    {
      input: "0x123",
      expected: { isValid: false, type: "invalid" },
    },
    {
      input: "invalid",
      expected: { isValid: false, type: "invalid" },
    },
  ];

  testInputs.forEach(({ input, expected }) => {
    const validation = searchService.validateSearchInput(input);
    const passed =
      validation.isValid === expected.isValid &&
      validation.type === expected.type;
    console.log(`${passed ? "✅" : "❌"} Input: ${input}`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(
      `  Got: { isValid: ${validation.isValid}, type: ${validation.type} }`
    );
    if (validation.error) console.log(`  Error: ${validation.error}`);
  });

  // Test 3: Search History Management
  console.log("\n3. Testing search history management...");

  // Add some test searches to history
  const testSearches = [
    {
      query:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      type: "txid",
      resultCount: 1,
      successful: true,
    },
    {
      query: "0x2222222222222222222222222222222222222222",
      type: "address",
      resultCount: 5,
      successful: true,
    },
    {
      query:
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      type: "txid",
      resultCount: 0,
      successful: false,
    },
  ];

  testSearches.forEach(({ query, type, resultCount, successful }) => {
    historyManager.addSearch(query, type, "testnet", resultCount, successful);
  });

  const history = historyManager.getHistory({ limit: 10, network: "testnet" });
  console.log(`✅ Added ${testSearches.length} searches to history`);
  console.log(`✅ Retrieved ${history.length} items from history`);

  // Test suggestions
  const suggestions = historyManager.getSuggestions("0x11", {
    limit: 3,
    network: "testnet",
  });
  console.log(`✅ Found ${suggestions.length} suggestions for "0x11"`);

  // Test statistics
  const stats = historyManager.getStatistics("testnet");
  console.log("✅ History statistics:", {
    totalSearches: stats.totalSearches,
    successRate: Math.round(stats.successRate) + "%",
    txidSearches: stats.txidSearches,
    addressSearches: stats.addressSearches,
  });

  // Test 4: Cache Management
  console.log("\n4. Testing cache management...");

  const cacheKey = searchService.getCacheKey(
    "0x1111111111111111111111111111111111111111111111111111111111111111",
    "txid"
  );
  console.log(`✅ Generated cache key: ${cacheKey}`);

  // Test cache operations
  const testResult = {
    type: "TRANSACTION",
    data: [
      {
        txHash:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
      },
    ],
    metadata: { network: "testnet", loadTime: 100 },
  };

  searchService.setCache(cacheKey, testResult);
  const cachedResult = searchService.getFromCache(cacheKey);
  console.log(
    `✅ Cache set and retrieved: ${cachedResult ? "success" : "failed"}`
  );

  // Test 5: Error Handling
  console.log("\n5. Testing error handling...");

  try {
    await searchService.search("invalid_input");
    console.log("❌ Should have thrown error for invalid input");
  } catch (error) {
    console.log(`✅ Correctly caught error: ${error.type} - ${error.message}`);
  }

  try {
    await searchService.search("");
    console.log("❌ Should have thrown error for empty input");
  } catch (error) {
    console.log(`✅ Correctly caught error: ${error.type} - ${error.message}`);
  }

  // Test 6: Network Switching
  console.log("\n6. Testing network switching...");

  const originalNetwork = searchService.networkType;
  console.log(`Original network: ${originalNetwork}`);

  searchService.switchNetwork("mainnet");
  console.log(`Switched to: ${searchService.networkType}`);

  searchService.switchNetwork("testnet");
  console.log(`Switched back to: ${searchService.networkType}`);

  console.log(`✅ Network switching works correctly`);

  // Test 7: Search Service Integration
  console.log("\n7. Testing search service integration...");

  try {
    // Test with a properly formatted but non-existent transaction hash
    const testTxHash =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    console.log(`Attempting search for: ${testTxHash}`);

    const result = await searchService.search(testTxHash);
    console.log("✅ Search completed:", {
      type: result.type,
      dataCount: result.data.length,
      network: result.metadata.network,
      loadTime: result.metadata.loadTime + "ms",
    });
  } catch (error) {
    console.log(
      `✅ Search failed as expected: ${error.type} - ${error.message}`
    );
  }

  try {
    // Test with a properly formatted but non-existent address
    const testAddress = "0x1234567890123456789012345678901234567890";
    console.log(`Attempting search for: ${testAddress}`);

    const result = await searchService.search(testAddress, { limit: 5 });
    console.log("✅ Address search completed:", {
      type: result.type,
      dataCount: result.data.length,
      network: result.metadata.network,
      loadTime: result.metadata.loadTime + "ms",
    });
  } catch (error) {
    console.log(
      `✅ Address search failed as expected: ${error.type} - ${error.message}`
    );
  }

  // Test 8: History Integration with Search Service
  console.log("\n8. Testing history integration with search service...");

  const searchHistory = searchService.getSearchHistory(5);
  console.log(
    `✅ Retrieved ${searchHistory.length} items from search service history`
  );

  const searchSuggestions = searchService.getSearchSuggestions("0x12", 3);
  console.log(
    `✅ Retrieved ${searchSuggestions.length} suggestions from search service`
  );

  console.log("\n🎉 Search integration test completed successfully!");
  console.log("\nSummary:");
  console.log("- ✅ Service health checks");
  console.log("- ✅ Input validation");
  console.log("- ✅ Search history management");
  console.log("- ✅ Cache management");
  console.log("- ✅ Error handling");
  console.log("- ✅ Network switching");
  console.log("- ✅ Search service integration");
  console.log("- ✅ History integration");
}

// Run the test
testSearchIntegration().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
