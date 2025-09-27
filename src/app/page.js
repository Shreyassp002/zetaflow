export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground blockchain-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  Z
                </span>
              </div>
              <h1 className="text-2xl font-bold zeta-glow">
                ZetaFlow Visualizer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-secondary rounded-full text-sm">
                <span className="text-secondary-foreground">Status: </span>
                <span className="text-primary zeta-pulse">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Network Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Block Height:</span>
                  <span className="font-mono">Loading...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Price:</span>
                  <span className="font-mono">Loading...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TPS:</span>
                  <span className="font-mono">Loading...</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">
                Visualization Controls
              </h2>
              <div className="space-y-3">
                <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  Start Visualization
                </button>
                <button className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors">
                  Reset View
                </button>
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg h-full relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-muted-foreground">
                    Initializing ZetaFlow Visualizer...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Setting up blockchain connections and visualization engine
                  </p>
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 ZetaFlow Visualizer. Built for ZetaChain ecosystem.</p>
            <div className="flex items-center space-x-4">
              <span>Network: ZetaChain Testnet</span>
              <div className="w-2 h-2 bg-primary rounded-full zeta-pulse"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
