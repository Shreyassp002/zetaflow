#!/usr/bin/env node

/**
 * Test optimized search service performance
 */

import { getSearchService } from "./src/lib/search/SearchService.js";

async function testOptimized() {
  console.log(`🚀 Testing optimized search service\n`);

  const realTxHash =
    "0xbe8d1e75f16dcfb24c0f994cc95aef7bf4a257ce985c6c3356439e996201bd7d";
  const nonExistentHash =
    "0xa67ec21bfcc7fccb0cf886a861648c3b9acd4abe1a78fb4b59bc64b846ad6e3f";

  try {
    const searchService = getSearchService("testnet");

    console.log("1. Testing with REAL transaction (should be faster now):");
    const startTime1 = Date.now();

    const realResult = await searchService.search(realTxHash);
    const loadTime1 = Date.now() - startTime1;

    console.log(`✅ Real transaction found in ${loadTime1}ms`);
    console.log(
      `   Service reported load time: ${realResult.metadata.loadTime}ms`
    );
    console.log(`   Type: ${realResult.type}`);
    console.log(`   Results: ${realResult.data.length}`);

    console.log(
      "\n2. Testing with NON-EXISTENT transaction (should fail fast):"
    );
    const startTime2 = Date.now();

    try {
      await searchService.search(nonExistentHash);
    } catch (error) {
      const loadTime2 = Date.now() - startTime2;
      console.log(`✅ Non-existent transaction failed fast in ${loadTime2}ms`);
      console.log(`   Error type: ${error.type}`);
      console.log(`   Message preview: ${error.message.substring(0, 100)}...`);
    }

    console.log("\n3. Testing multiple searches in parallel:");
    const startTime3 = Date.now();

    const parallelResults = await Promise.allSettled([
      searchService.search(realTxHash),
      searchService.search(nonExistentHash).catch((e) => e),
      searchService.search(realTxHash), // Should hit cache
    ]);

    const loadTime3 = Date.now() - startTime3;
    console.log(`✅ Parallel searches completed in ${loadTime3}ms`);
    console.log(`   Results: ${parallelResults.length} searches processed`);
    console.log(`   Cache hit should make 3rd search very fast`);
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }

  console.log("\n🎯 Optimization test completed!");
}

testOptimized().catch(console.error);
