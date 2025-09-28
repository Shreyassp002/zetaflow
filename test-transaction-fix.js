#!/usr/bin/env node

/**
 * Test transaction lookup with the specific hash that was failing
 */

import { getSearchService } from "./src/lib/search/SearchService.js";
import { getZetaChainExplorerAPIService } from "./src/lib/blockchain/zetascan-api.js";
import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";

async function testTransactionFix() {
  console.log(`🔍 Testing transaction lookup fix\n`);

  const txHash =
    "0xa67ec21bfcc7fccb0cf886a861648c3b9acd4abe1a78fb4b59bc64b846ad6e3f";

  try {
    console.log(`Testing with transaction: ${txHash}`);

    // Test individual services first
    console.log("\n1. Testing API service directly...");
    const apiService = getZetaChainExplorerAPIService("testnet");

    try {
      const apiResult = await Promise.race([
        apiService.getTransactionDetails(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API timeout")), 8000)
        ),
      ]);

      if (apiResult) {
        console.log("✅ API service found transaction");
        console.log(`   Hash: ${apiResult.txHash}`);
        console.log(`   Status: ${apiResult.status}`);
      } else {
        console.log("ℹ️  API service: Transaction not found (not cross-chain)");
      }
    } catch (error) {
      console.log(`❌ API service failed: ${error.message}`);
      console.log(`   Error type: ${error.type || "unknown"}`);
    }

    console.log("\n2. Testing RPC service directly...");
    const rpcService = getZetaRPCService("testnet");

    try {
      const rpcResult = await Promise.race([
        rpcService.getTransaction(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), 8000)
        ),
      ]);

      console.log("✅ RPC service found transaction");
      console.log(`   Hash: ${rpcResult.txHash}`);
      console.log(`   Block: ${rpcResult.blockNumber}`);
      console.log(`   Status: ${rpcResult.status}`);
      console.log(`   From: ${rpcResult.from}`);
      console.log(`   To: ${rpcResult.to}`);
    } catch (error) {
      console.log(`❌ RPC service failed: ${error.message}`);
      console.log(`   Error type: ${error.type || "unknown"}`);
    }

    console.log("\n3. Testing search service (integrated)...");
    const searchService = getSearchService("testnet");

    try {
      const searchResult = await Promise.race([
        searchService.search(txHash),
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
      }
    } catch (error) {
      console.log(`❌ Search service failed: ${error.message}`);
      console.log(`   Error type: ${error.type || "unknown"}`);
    }

    console.log("\n4. Testing with mainnet...");
    const mainnetSearchService = getSearchService("mainnet");

    try {
      const mainnetResult = await Promise.race([
        mainnetSearchService.search(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Mainnet timeout")), 10000)
        ),
      ]);

      console.log("✅ Mainnet search works!");
      console.log(`   Type: ${mainnetResult.type}`);
      console.log(`   Results: ${mainnetResult.data.length}`);
      console.log(`   Load time: ${mainnetResult.metadata.loadTime}ms`);
    } catch (error) {
      console.log(`ℹ️  Mainnet search: ${error.message}`);
      // This is expected if the transaction is only on testnet
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  }

  console.log("\n🎯 Transaction fix test completed!");
}

testTransactionFix().catch(console.error);
