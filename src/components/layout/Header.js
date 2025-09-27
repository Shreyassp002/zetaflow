"use client";

/**
 * Header component with clean typography and subtle gray borders
 * @param {Object} props
 * @param {'mainnet'|'testnet'} props.networkMode
 * @param {function} props.onNetworkToggle
 * @param {string} [props.connectedWallet]
 */
export default function Header({
  networkMode = "testnet",
  onNetworkToggle,
  connectedWallet,
}) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <h1 className="text-2xl font-bold text-black tracking-tight">
              ZetaFlow Visualizer
            </h1>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-6">
            {/* Network Toggle Buttons */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">
                Network:
              </span>
              <div className="flex border border-gray-200 rounded-md overflow-hidden">
                <button
                  onClick={() => onNetworkToggle("testnet")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    networkMode === "testnet"
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Testnet
                </button>
                <button
                  onClick={() => onNetworkToggle("mainnet")}
                  className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-200 ${
                    networkMode === "mainnet"
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Mainnet
                </button>
              </div>
            </div>

            {/* Connected Wallet Display */}
            {connectedWallet && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 font-mono">
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
              </div>
            )}

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
