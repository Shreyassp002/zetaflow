#!/usr/bin/env node

/**
 * Test with recent transactions from current block
 */

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";

async function testRecent() {
  console.log(`🔍 Testing with recent transactions\n`);

  try {
    const rpcService = getZetaRPCService("testnet");

    // Get current block
    console.log("1. Getting current block...");
    const currentBlock = await rpcService.getCurrentBlockNumber();
    console.log(`✅ Current block: ${currentBlock}`);

    // Find a block with transactions
    console.log("\n2. Finding block with transactions...");
    let block = null;
    let blockNum = currentBlock - 1;

    for (let i = 0; i < 10; i++) {
      try {
        const testBlock = await Promise.race([
          rpcService.provider.getBlock(blockNum - i, true),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Block timeout")), 3000)
          ),
        ]);

        console.log(
          `   Block ${testBlock.number}: ${testBlock.transactions.length} transactions`
        );

        if (testBlock.transactions.length > 0) {
          block = testBlock;
          break;
        }
      } catch (error) {
        console.log(`   Block ${blockNum - i}: Error - ${error.message}`);
      }
    }

    if (!block) {
      console.log("❌ No blocks with transactions found in recent 10 blocks");
      return;
    }

    console.log(
      `✅ Found block ${block.number} with ${block.transactions.length} transactions`
    );

    if (block.transactions.length > 0) {
      const recentTx = block.transactions[0];
      console.log(`\n3. Analyzing recent transaction:`);
      console.log(`   Type: ${typeof recentTx}`);
      console.log(`   Keys: ${Object.keys(recentTx || {}).join(", ")}`);

      // The transaction is already fully loaded from the block
      console.log("✅ Using block transaction data:");
      console.log(`   Hash: ${recentTx.hash}`);
      console.log(`   From: ${recentTx.from}`);
      console.log(`   To: ${recentTx.to}`);
      console.log(`   Value: ${recentTx.value?.toString()} wei`);
      console.log(`   Gas Used: ${recentTx.gasUsed?.toString()}`);
      console.log(`   Block: ${recentTx.blockNumber}`);

      // Now test our service transformation
      if (recentTx.hash) {
        console.log(`\n4. Testing service transformation:`);
        try {
          const transformedTx = rpcService._transformTransaction(
            recentTx,
            null
          );
          console.log("✅ Service transformation works:");
          console.log(`   Transformed hash: ${transformedTx.txHash}`);
          console.log(`   Transformed status: ${transformedTx.status}`);
        } catch (error) {
          console.log(`❌ Transformation error: ${error.message}`);
        }
      }
      console.log(`   To: ${tx.to}`);
      console.log(`   Value: ${tx.value} wei`);
      console.log(`   Status: ${tx.status}`);
    } else {
      console.log("❌ No transactions in recent block");
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("\n🎯 Recent transaction test completed!");
}

testRecent().catch(console.error);
