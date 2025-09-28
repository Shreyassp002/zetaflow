#!/usr/bin/env node

/**
 * Test specific transaction hash
 */

import { getSearchService } from "./src/lib/search/SearchService.js";
import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";
import { getZetaChainExplorerAPIService } from "./src/lib/blockchain/zetascan-api.js";

async function testTransaction() {
  const txHash =
    "0x41ef2c6d2ec0265e6feae6c753f4ca6b1904f7c837fdbe9863fd027b5a571f57";

  console.log(`🔍 Testing transaction: ${txHash}\n`);

  // Test both networks
  const networks = ["testnet", "mainnet"];

  for (const network of networks) {
    console.log(`\n📡 Testing on ${network.toUpperCase()}:`);

    const rpcService = getZetaRPCService(network);
    const apiService = getZetaChainExplorerAPIService(network);
    const searchService = getSearchService(network);

    // Test 1: RPC Service
    console.log("1. RPC Service:");
    try {
      const rpcTx = await rpcService.getTransaction(txHash);
      console.log("✅ RPC found transaction:");
      console.log(`   Block: ${rpcTx.blockNumber}`);
      console.log(`   From: ${rpcTx.from}`);
      console.log(`   To: ${rpcTx.to}`);
      console.log(`   Value: ${rpcTx.value} wei`);
      console.log(`   Status: ${rpcTx.status}`);
      console.log(`   Gas Used: ${rpcTx.gasUsed}`);
    } catch (error) {
      console.log(`❌ RPC error: ${error.message}`);
    }

    // Test 2: API Service
    console.log("\n2. API Service:");
    try {
      const apiTx = await apiService.getTransactionDetails(txHash);
      if (apiTx) {
        console.log("✅ API found cross-chain transaction:");
        console.log(
          `   Source Chain: ${apiTx.sourceChain?.name || "Unknown"} (${
            apiTx.sourceChain?.chainId
          })`
        );
        console.log(
          `   Dest Chain: ${apiTx.destinationChain?.name || "Unknown"} (${
            apiTx.destinationChain?.chainId
          })`
        );
        console.log(`   Status: ${apiTx.status}`);
        console.log(`   Amount: ${apiTx.amount}`);
        console.log(`   Messages: ${apiTx.crossChainMessages?.length || 0}`);
      } else {
        console.log("❌ API: Not a cross-chain transaction");
      }
    } catch (error) {
      console.log(`❌ API error: ${error.message}`);
    }

    // Test 3: Search Service (integrated)
    console.log("\n3. Search Service:");
    try {
      const searchResult = await searchService.search(txHash);
      console.log("✅ Search service found:");
      console.log(`   Type: ${searchResult.type}`);
      console.log(`   Results: ${searchResult.data.length}`);
      console.log(`   Network: ${searchResult.metadata.network}`);
      console.log(`   Load Time: ${searchResult.metadata.loadTime}ms`);

      if (searchResult.data.length > 0) {
        const tx = searchResult.data[0];
        console.log(`   Transaction Details:`);
        console.log(`     Hash: ${tx.txHash}`);
        console.log(`     Block: ${tx.blockNumber}`);
        console.log(`     From: ${tx.from}`);
        console.log(`     To: ${tx.to}`);
        console.log(`     Value: ${tx.value || tx.amount} wei`);
        console.log(`     Status: ${tx.status}`);
      }
    } catch (error) {
      console.log(`❌ Search error: ${error.type} - ${error.message}`);
    }
  }

  console.log("\n🎯 Transaction test completed!");
}

testTransaction().catch(console.error);
