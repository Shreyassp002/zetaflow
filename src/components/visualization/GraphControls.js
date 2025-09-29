'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={disabled}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="Export graph"
        >
          Export
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Export dropdown menu */}
        {showExportMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[120px]">
            <button
              onClick={() => {
                handleExport('png');
                setShowExportMenu(false);
              }}
              disabled={isExporting}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export PNG'}
            </button>
            <button
              onClick={() => {
                handleExport('json');
                setShowExportMenu(false);
              }}
              disabled={isExporting}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-100"
            >
              Export JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}