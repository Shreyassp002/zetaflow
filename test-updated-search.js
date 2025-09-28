#!/usr/bin/env node

/**
 * Test the updated search system
 */

import { getSearchService } from "./src/lib/search/SearchService.js";

async function testUpdatedSearch() {
  console.log("🔍 Testing Updated Search System...\n");

  const searchService = getSearchService("testnet");
  const txHash =
    "0xaf83cb7ef241e2708d5900559e875b251b3432903f440e6bef177e0909ebe1b7";

  console.log("1. Testing input validation...");
  const validation = searchService.validateSearchInput(txHash);
  console.log("✅ Validation result:", validation);

  console.log("\n2. Testing search with timeout...");
  try {
    const result = await Promise.race([
      searchService.search(txHash),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test timeout")), 8000)
      ),
    ]);
    console.log("✅ Search completed:", result.metadata);
  } catch (error) {
    console.log("❌ Search failed:", error.message);
  }

  console.log("\n3. Testing service health...");
  try {
    const health = await searchService.getHealthStatus();
    console.log("✅ Health status:", health);
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  console.log("\n✅ Test completed");
}

testUpdatedSearch().catch(console.error);
