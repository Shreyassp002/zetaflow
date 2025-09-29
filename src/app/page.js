"use client";

import { useState, useCallback } from "react";
import { AppLayout, Header, Container } from "@/components/layout";
import {
  Button,
  ActionButton,
  StatusIndicator,
  StatusBadge,
} from "@/components/ui";
import { SearchInput } from "@/components/search";
import { TransactionSidebar } from "@/components";
import { GraphVisualization, GraphControls } from "@/components/visualization";
import { getSearchService } from "@/lib/search/SearchService";

export default function Home() {
  const [networkMode, setNetworkMode] = useState("testnet");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTransaction, setSidebarTransaction] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [graphTransactions, setGraphTransactions] = useState([]);
  const [graphLayout, setGraphLayout] = useState('fcose');
  const [graphService, setGraphService] = useState(null);

  const handleNetworkToggle = (network) => {
    setNetworkMode(network);
    // Clear sidebar and visualization when switching networks
    setSidebarOpen(false);
    setSidebarTransaction(null);
    setShowVisualization(false);
    setSelectedTransaction(null);
    setGraphTransactions([]);
    console.log("Network switched to:", network);
  };

  const handleSearchResult = (result) => {
    setSelectedTransaction(result);
    setShowVisualization(true);
    console.log("Search result selected:", result);
  };

  const handleResultSelect = (transaction) => {
    console.log("Transaction selected for visualization:", transaction);
    // Show transaction details in sidebar
    setSidebarTransaction(transaction);
    setSidebarOpen(true);
    // This would also trigger the graph visualization
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSidebarTransaction(null);
  };

  const handleNodeClick = useCallback((nodeData) => {
    console.log("Node clicked:", nodeData);
    
    // If it's a transaction node, show transaction details
    if (nodeData.type === 'transaction' && nodeData.txData) {
      setSidebarTransaction(nodeData.txData);
      setSidebarOpen(true);
    }
    // If it's an address node, could show address details
    else if (nodeData.type === 'address') {
      // Could implement address details view
      console.log("Address node clicked:", nodeData.address);
    }
  }, []);

  const handleEdgeClick = useCallback((edgeData) => {
    console.log("Edge clicked:", edgeData);
    
    // Show transaction details for the edge
    if (edgeData.txData) {
      setSidebarTransaction(edgeData.txData);
      setSidebarOpen(true);
    }
  }, []);

  const handleGraphExport = async (format) => {
    console.log("Exporting graph as:", format);
    // Graph export will be handled by the GraphVisualization component
    // This is just a placeholder for additional export logic if needed
  };

  const handleGraphServiceReady = useCallback((service) => {
    setGraphService(service);
  }, []);

  const handleSearch = async (query, type) => {
    console.log("Search initiated:", { query, type, networkMode });
    
    setIsSearching(true);
    
    try {
      // Get the appropriate search service for the current network
      const searchService = getSearchService(networkMode);
      
      // Perform the search
      const searchResult = await searchService.search(query);
      console.log("Search result:", searchResult);
      
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const transactionData = searchResult.data[0];
        
        // Show visualization
        setShowVisualization(true);
        setSelectedTransaction(searchResult);
        
        // Set graph transactions for visualization
        setGraphTransactions(searchResult.data);
        
        // Show transaction details in sidebar
        setSidebarTransaction(transactionData);
        setSidebarOpen(true);
        
        console.log("Transaction data for sidebar:", transactionData);
      } else {
        console.log("No transaction data found");
        // Handle case where no results are found
        alert("No transaction found for the given query");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AppLayout>
      <Header networkMode={networkMode} onNetworkToggle={handleNetworkToggle} />

      <main className="flex-1 py-8">
        <div className={`transition-all duration-300 ${sidebarOpen ? 'pr-80' : ''}`}>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-200px)] h-full">
            {/* Left Sidebar */}
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
                  <ActionButton 
                    color="blue" 
                    className="w-full"
                    onClick={() => setShowVisualization(!showVisualization)}
                    disabled={!graphTransactions.length}
                  >
                    {showVisualization ? 'Hide Graph' : 'Show Graph'}
                  </ActionButton>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={!showVisualization}
                    onClick={() => {
                      if (graphService) {
                        graphService.fit();
                      }
                    }}
                  >
                    Reset View
                  </Button>
                  <div className="text-xs text-gray-500 mt-2">
                    {graphTransactions.length > 0 
                      ? `${graphTransactions.length} transaction(s) loaded`
                      : 'Search for transactions to visualize'
                    }
                  </div>
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

            {/* Main Content Area */}
            <div className="lg:col-span-3 flex flex-col space-y-6">
              {/* Search Input at Top */}
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <SearchInput
                    placeholder={`Search ${networkMode} transactions and addresses...`}
                    onSearch={handleSearch}
                    isLoading={isSearching}
                  />
                </div>
              </div>

              {/* Graph Area */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg min-h-[600px] relative overflow-hidden">
                {!showVisualization ? (
                  /* Graph Placeholder */
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 border border-gray-300 rounded"></div>
                      </div>
                      <p className="text-lg font-medium">Graph Visualization</p>
                      <p className="text-sm mt-1">
                        Search for transactions to visualize cross-chain flows
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Visualization Interface */
                  <div className="h-full relative">
                    {/* Visualization Header */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowVisualization(false)}
                          >
                            ← Back to Search
                          </Button>
                          <div className="text-sm text-gray-600">
                            {selectedTransaction && (
                              <span>
                                Visualizing:{" "}
                                {selectedTransaction.metadata?.totalResults ||
                                  0}{" "}
                                transaction(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Reset View
                          </Button>
                          <ActionButton color="blue" size="sm">
                            Export
                          </ActionButton>
                        </div>
                      </div>
                    </div>

                    {/* Graph Controls */}
                    <div className="absolute top-16 left-4 right-4 z-10">
                      <GraphControls
                        currentLayout={graphLayout}
                        onLayoutChange={setGraphLayout}
                        onExport={handleGraphExport}
                        graphService={graphService}
                        disabled={!graphTransactions.length}
                      />
                    </div>

                    {/* Graph Visualization */}
                    <div className="w-full h-full pt-16">
                      <GraphVisualization
                        transactions={graphTransactions}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        onGraphServiceReady={handleGraphServiceReady}
                        layout={graphLayout}
                        className="h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t border-gray-200 bg-white mt-8 transition-all duration-300 ${sidebarOpen ? 'pr-80' : ''}`}>
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

      {/* Sidebar Backdrop (mobile only) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      {/* Transaction Sidebar */}
      <TransactionSidebar
        transaction={sidebarTransaction}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />
    </AppLayout>
  );
}
