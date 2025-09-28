#!/usr/bin/env node

/**
 * Test with working transaction lookup
 */

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";
import { getSearchService } from "./src/lib/search/SearchService.js";

async function testWorking() {
  console.log(`🔍 Testing with real ZetaChain transactions\n`);

  try {
    const rpcService = getZetaRPCService("testnet");
    const searchService = getSearchService("testnet");

    // Get current block
    console.log("1. Getting current block...");
    const currentBlock = await rpcService.getCurrentBlockNumber();
    console.log(`✅ Current block: ${currentBlock}`);

    // Find a block with transactions
    console.log("\n2. Finding block with transactions...");
    let txHash = null;

    for (let i = 1; i <= 20; i++) {
      try {
        const block = await Promise.race([
          rpcService.provider.getBlock(currentBlock - i, true),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 2000)
          ),
        ]);

        if (block && block.transactions && block.transactions.length > 0) {
          txHash = block.transactions[0];
          console.log(
            `✅ Found transaction in block ${block.number}: ${txHash}`
          );
          break;
        }
      } catch (error) {
        console.log(`   Block ${currentBlock - i}: ${error.message}`);
      }
    }

    if (!txHash) {
      console.log("❌ No transactions found in recent blocks");
      return;
    }

    // Test our services with this real transaction
    console.log(`\n3. Testing services with: ${txHash}`);

    // Test RPC service
    try {
      console.log("   Testing RPC service...");
      const rpcTx = await Promise.race([
        rpcService.getTransaction(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC timeout")), 5000)
        ),
      ]);

      console.log("✅ RPC service works:");
      console.log(`   Hash: ${rpcTx.txHash}`);
      console.log(`   Block: ${rpcTx.blockNumber}`);
      console.log(`   From: ${rpcTx.from}`);
      console.log(`   To: ${rpcTx.to}`);
      console.log(`   Status: ${rpcTx.status}`);
    } catch (error) {
      console.log(`❌ RPC service failed: ${error.message}`);
    }

    // Test search service
    try {
      console.log("\n   Testing search service...");
      const searchResult = await Promise.race([
        searchService.search(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Search timeout")), 8000)
        ),
      ]);

      console.log("✅ Search service works:");
      console.log(`   Type: ${searchResult.type}`);
      console.log(`   Results: ${searchResult.data.length}`);
      console.log(`   Load time: ${searchResult.metadata.loadTime}ms`);

      if (searchResult.data.length > 0) {
        const tx = searchResult.data[0];
        console.log(`   Transaction: ${tx.txHash}`);
        console.log(`   Status: ${tx.status}`);
      }
    } catch (error) {
      console.log(`❌ Search service failed: ${error.message}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }

  console.log("\n🎯 Working test completed!");
}

testWorking().catch(console.error);
