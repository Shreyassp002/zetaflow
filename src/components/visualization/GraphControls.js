'use client';

import { useState } from 'react';

/**
 * GraphControls Component
 * Provides controls for graph layout, zoom, and other interactions
 */
export default function GraphControls({
  onLayoutChange,
  onFit,
  onCenter,
  onExport,
  currentLayout = 'fcose',
  disabled = false,
  graphService = null
}) {
  const [isExporting, setIsExporting] = useState(false);

  const layouts = [
    { value: 'fcose', label: 'Force Directed' },
    { value: 'dagre', label: 'Hierarchical' },
    { value: 'coseBilkent', label: 'Cose Bilkent' }
  ];

  const handleExport = async (format) => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      if (graphService) {
        let exportData;
        if (format === 'png') {
          exportData = graphService.exportPNG();
          if (exportData) {
            // Create download link
            const link = document.createElement('a');
            link.download = `zetaflow-graph-${Date.now()}.png`;
            link.href = exportData;
            link.click();
          }
        } else if (format === 'json') {
          exportData = graphService.exportJSON();
          if (exportData) {
            // Create download link for JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `zetaflow-graph-${Date.now()}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }
      } else if (onExport) {
        await onExport(format);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
      {/* Layout selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Layout:</label>
        <select
          value={currentLayout}
          onChange={(e) => onLayoutChange?.(e.target.value)}
          disabled={disabled}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          {layouts.map((layout) => (
            <option key={layout.value} value={layout.value}>
              {layout.label}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-gray-300" />

      {/* View controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (graphService) {
              graphService.fit();
            } else if (onFit) {
              onFit();
            }
          }}
          disabled={disabled}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Fit to view"
        >
          Fit
        </button>
        <button
          onClick={() => {
            if (graphService) {
              graphService.center();
            } else if (onCenter) {
              onCenter();
            }
          }}
          disabled={disabled}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Center graph"
        >
          Center
        </button>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-gray-300" />

      {/* Export controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleExport('png')}
          disabled={disabled || isExporting}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export as PNG"
        >
          {isExporting ? 'Exporting...' : 'PNG'}
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={disabled || isExporting}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export as JSON"
        >
          JSON
        </button>
      </div>
    </div>
  );
}