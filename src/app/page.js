"use client";

import { useState } from "react";
import { AppLayout, Header, Container } from "@/components/layout";
import {
  Button,
  ActionButton,
  StatusIndicator,
  StatusBadge,
} from "@/components/ui";

export default function Home() {
  const [networkMode, setNetworkMode] = useState("testnet");

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    console.log("Network switched to:", network);
  };

  return (
    <AppLayout>
      <Header networkMode={networkMode} onNetworkToggle={handleNetworkToggle} />

      <main className="flex-1 py-8">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-200px)]">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Network Stats
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Block Height:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gas Price:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TPS:</span>
                    <span className="font-mono text-black">Loading...</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Visualization Controls
                </h2>
                <div className="space-y-3">
                  <ActionButton color="blue" className="w-full">
                    Start Visualization
                  </ActionButton>
                  <Button variant="outline" className="w-full">
                    Reset View
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-black">
                  Connection Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">ZetaChain RPC:</span>
                    <StatusIndicator status="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Explorer API:</span>
                    <StatusIndicator status="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Wallet:</span>
                    <StatusIndicator status="pending" />
                  </div>
                </div>
              </div>
            </div>

            {/* Visualization Area */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-lg h-full relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600">
                      Initializing ZetaFlow Visualizer...
                    </p>
                    <p className="text-sm text-gray-500">
                      Setting up blockchain connections and visualization engine
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <StatusBadge status="success" text="RPC Connected" />
                      <StatusBadge status="pending" text="Loading Graph" />
                    </div>
                  </div>
                </div>

                {/* Placeholder for Cytoscape container */}
                <div
                  id="cy-container"
                  className="w-full h-full opacity-0 transition-opacity duration-500"
                ></div>
              </div>
            </div>
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <Container>
          <div className="py-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>© 2024 ZetaFlow Visualizer. Built for ZetaChain ecosystem.</p>
              <div className="flex items-center space-x-4">
                <span>
                  Network: ZetaChain{" "}
                  {networkMode === "mainnet" ? "Mainnet" : "Testnet"}
                </span>
                <StatusIndicator status="success" size="sm" />
              </div>
            </div>
          </div>
        </Container>
      </footer>
    </AppLayout>
  );
}
