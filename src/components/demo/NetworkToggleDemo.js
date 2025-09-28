"use client";

import { useState } from "react";
import { Header } from "../layout";

/**
 * Demo component to test network toggle functionality
 */
export default function NetworkToggleDemo() {
  const [networkMode, setNetworkMode] = useState("testnet");

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    console.log("Network switched to:", network);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        networkMode={networkMode}
        onNetworkToggle={handleNetworkToggle}
        connectedWallet="0x1234567890abcdef1234567890abcdef12345678"
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-black mb-6">
            Network Toggle Demo
          </h1>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-black">
              Current Network State
            </h2>

            <div className="space-y-2">
              <p className="text-gray-600">
                <strong>Selected Network:</strong>{" "}
                {networkMode === "mainnet" ? "Mainnet" : "Testnet"}
              </p>
              <p className="text-gray-600">
                <strong>Network Mode Value:</strong>{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {networkMode}
                </code>
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-black mb-2">Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • Click &quot;Testnet&quot; or &quot;Mainnet&quot; buttons in
                  the header
                </li>
                <li>• The active button will have a black background</li>
                <li>• The network state will update in real-time</li>
                <li>• Check the browser console for toggle events</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
