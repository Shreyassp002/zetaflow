#!/usr/bin/env node

/**
 * Test script to verify search functionality with real ZetaChain data
 */

import { getSearchService } from "./src/lib/search/SearchService.js";

async function testSearch() {
  console.log("🔍 Testing ZetaFlow Search with Real Data\n");

  const searchService = getSearchService("testnet");

  // Test 1: Check service health
  console.log("1. Testing service health...");
  try {
    const health = await searchService.getHealthStatus();
    console.log("✅ Health Status:", health);
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  // Test 2: Test with a real ZetaChain testnet transaction hash (if available)
  console.log("\n2. Testing transaction search...");
  try {
    // This is a placeholder - in real usage, you'd use an actual transaction hash
    const testTxHash =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    console.log(`Searching for transaction: ${testTxHash}`);

    const result = await searchService.searchByTransactionHash(testTxHash);
    console.log("✅ Transaction search result:", {
      type: result.type,
      dataCount: result.data.length,
      network: result.metadata.network,
      loadTime: result.metadata.loadTime + "ms",
    });
  } catch (error) {
    console.log(
      "❌ Transaction search failed (expected for test hash):",
      error.message
    );
  }

  // Test 3: Test with a real address format
  console.log("\n3. Testing address search...");
  try {
    const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    console.log(`Searching for address: ${testAddress}`);

    const result = await searchService.searchByAddress(testAddress, {
      limit: 5,
    });
    console.log("✅ Address search result:", {
      type: result.type,
      dataCount: result.data.length,
      network: result.metadata.network,
      loadTime: result.metadata.loadTime + "ms",
    });
  } catch (error) {
    console.log(
      "❌ Address search failed (expected for test address):",
      error.message
    );
  }

  // Test 4: Test input validation
  console.log("\n4. Testing input validation...");
  const testInputs = [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // Valid tx hash
    "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", // Valid address
    "0x123", // Too short
    "invalid", // Invalid format
  ];

  testInputs.forEach((input) => {
    const validation = searchService.validateSearchInput(input);
    console.log(`Input: ${input}`);
    console.log(`  Valid: ${validation.isValid}, Type: ${validation.type}`);
    if (validation.error) console.log(`  Error: ${validation.error}`);
  });

  console.log("\n✅ Search functionality test completed!");
}

// Run the test
testSearch().catch(console.error);
