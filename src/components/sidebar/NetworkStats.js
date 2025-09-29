import { useState, useEffect } from 'react';
import networkStatsService from '@/lib/network/NetworkStatsService';

export default function NetworkStats({ networkMode }) {
  const [stats, setStats] = useState({
    blockHeight: 'Loading...',
    gasPrice: 'Loading...',
    tps: 'Loading...',
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let intervalId;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const networkStats = await networkStatsService.getNetworkStats(networkMode);
        setStats({
          blockHeight: networkStats.blockHeight,
          gasPrice: networkStats.gasPrice,
          tps: networkStats.tps,
          error: networkStats.error || null
        });
      } catch (error) {
        console.error('Failed to fetch network stats:', error);
        setStats({
          blockHeight: 'Error',
          gasPrice: 'Error',
          tps: 'Error',
          error: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Set up auto-refresh every 30 seconds
    intervalId = setInterval(fetchStats, 30000);

    // Cleanup interval on unmount or network change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [networkMode]);

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-black">
        Network Stats
      </h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Block Height:</span>
          <span className={`font-mono text-black ${isLoading ? 'animate-pulse' : ''}`}>
            {typeof stats.blockHeight === 'number' 
              ? stats.blockHeight.toLocaleString()
              : stats.blockHeight
            }
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Gas Price:</span>
          <span className={`font-mono text-black ${isLoading ? 'animate-pulse' : ''}`}>
            {stats.gasPrice}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">TPS:</span>
          <span className={`font-mono text-black ${isLoading ? 'animate-pulse' : ''}`}>
            {stats.tps}
          </span>
        </div>
        {stats.error && (
          <div className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded border">
            Error: {stats.error}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">
          {networkMode === 'mainnet' ? 'ZetaChain Mainnet' : 'ZetaChain Athens Testnet'}
        </div>
      </div>
    </div>
  );
}