#!/usr/bin/env node

/**
 * Simple search functionality test
 */

import { getSearchService } from "./src/lib/search/SearchService.js";

async function testSearch() {
  console.log("🔍 Testing Search Functionality\n");

  const searchService = getSearchService("testnet");

  // Test 1: Input validation
  console.log("1. Testing input validation...");
  const validTx =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const validAddr = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";

  const txValidation = searchService.validateSearchInput(validTx);
  const addrValidation = searchService.validateSearchInput(validAddr);

  console.log(
    `✅ TX validation: ${txValidation.isValid} (${txValidation.type})`
  );
  console.log(
    `✅ Address validation: ${addrValidation.isValid} (${addrValidation.type})`
  );

  // Test 2: Service health
  console.log("\n2. Testing service health...");
  const health = await searchService.getHealthStatus();
  console.log(`✅ RPC Service: ${health.rpcService}`);
  console.log(`✅ API Service: ${health.apiService}`);
  console.log(`✅ Overall Health: ${health.overall}`);

  // Test 3: Try a search (expect not found, but should not error)
  console.log("\n3. Testing search functionality...");
  try {
    const result = await searchService.search(validTx);
    console.log(`✅ Search completed: ${result.data.length} results`);
  } catch (error) {
    if (error.type === "NOT_FOUND") {
      console.log(`✅ Search handled not found correctly: ${error.message}`);
    } else {
      console.log(`❌ Search error: ${error.type} - ${error.message}`);
    }
  }

  console.log("\n🎉 Search test completed!");
}

testSearch().catch(console.error);
