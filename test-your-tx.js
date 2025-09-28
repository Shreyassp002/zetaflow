#!/usr/bin/env node

import { getZetaRPCService } from "./src/lib/blockchain/zetachain-rpc.js";

async function testYourTx() {
  const yourTx =
    "0x41ef2c6d2ec0265e6feae6c753f4ca6b1904f7c837fdbe9863fd027b5a571f57";

  console.log(`Testing your transaction: ${yourTx}`);

  // Test both networks with direct ethers calls
  const networks = ["testnet", "mainnet"];

  for (const network of networks) {
    console.log(`\n${network.toUpperCase()}:`);
    const rpcService = getZetaRPCService(network);

    try {
      // Direct ethers call
      const directTx = await Promise.race([
        rpcService.provider.getTransaction(yourTx),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        ),
      ]);

      if (directTx) {
        console.log("✅ Found with direct call:");
        console.log(`   Hash: ${directTx.hash}`);
        console.log(`   Block: ${directTx.blockNumber}`);
        console.log(`   From: ${directTx.from}`);
        console.log(`   To: ${directTx.to}`);
      } else {
        console.log("❌ Not found");
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testYourTx().catch(console.error);
