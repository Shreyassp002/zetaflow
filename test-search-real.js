#!/usr/bin/env node

/**
 * Test search service with a real transaction
 */

import { getSearchService } from "./src/lib/search/SearchService.js";

async function testSearchReal() {
  console.log(`🔍 Testing search service with real transaction\n`);

  // Use a known real transaction hash from ZetaChain testnet
  const realTxHash =
    "0xbe8d1e75f16dcfb24c0f994cc95aef7bf4a257ce985c6c3356439e996201bd7d";

  try {
    console.log(`Testing with real transaction: ${realTxHash}`);

    const searchService = getSearchService("testnet");

    console.log("Testing search service...");
    const searchResult = await Promise.race([
      searchService.search(realTxHash),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), 10000)
      ),
    ]);

    console.log("✅ Search service works!");
    console.log(`   Type: ${searchResult.type}`);
    console.log(`   Results: ${searchResult.data.length}`);
    console.log(`   Load time: ${searchResult.metadata.loadTime}ms`);
    console.log(`   Network: ${searchResult.metadata.network}`);

    if (searchResult.data.length > 0) {
      const tx = searchResult.data[0];
      console.log(`   Transaction: ${tx.txHash}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   From: ${tx.from}`);
      console.log(`   To: ${tx.to}`);
    }

    // Test with the original failing hash to show proper error handling
    console.log("\n" + "=".repeat(50));
    console.log(
      "Testing with non-existent transaction (should show proper error):"
    );

    const nonExistentHash =
      "0xa67ec21bfcc7fccb0cf886a861648c3b9acd4abe1a78fb4b59bc64b846ad6e3f";

    try {
      await searchService.search(nonExistentHash);
    } catch (error) {
      console.log("✅ Proper error handling:");
      console.log(`   Error type: ${error.type}`);
      console.log(`   Message: ${error.message}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }

  console.log("\n🎯 Search test completed!");
}

testSearchReal().catch(console.error);
