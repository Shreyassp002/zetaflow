import { useState } from "react";
import TransactionSidebar from "../sidebar/TransactionSidebar";

// Sample transaction data
const sampleTransaction = {
  txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  status: "success",
  value: "1.234567",
  tokenSymbol: "ZETA",
  from: "0xabcdef1234567890abcdef1234567890abcdef12",
  to: "0x1234567890abcdef1234567890abcdef12345678",
  chainId: 7000,
  chainName: "ZetaChain Mainnet",
  blockNumber: 1234567,
  gasUsed: "21000",
  timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  explorerUrl:
    "https://zetascan.com/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
};

export default function SidebarDemo() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const handleShowTransaction = () => {
    setSelectedTransaction(sampleTransaction);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Transaction Sidebar Demo
        </h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sample Transactions</h2>

          {/* Sample transaction item */}
          <div
            onClick={handleShowTransaction}
            className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-gray-600">
                  {sampleTransaction.txHash.slice(0, 20)}...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {sampleTransaction.value} {sampleTransaction.tokenSymbol}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Success
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Click on the transaction above to open the sidebar
          </p>
        </div>
      </div>

      {/* Transaction Sidebar */}
      <TransactionSidebar
        transaction={selectedTransaction}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />
    </div>
  );
}
