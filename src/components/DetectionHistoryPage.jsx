/**
 * Detection History Page Component
 * Fetches and displays detection history from the backend API
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Search, Filter, Eye, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from './Toast';
import { fetchHistory } from '../services/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const DetectionHistoryPage = () => {
  const toast = useToast();

  // State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(50);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch history from backend
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchHistory({
        limit,
        search: searchTerm || undefined,
      });
      setRecords(result.results || []);
    } catch (err) {
      setError(err);
      toast.error(err.message || 'Failed to load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [limit, searchTerm, toast]);

  // Initial load
  useEffect(() => {
    loadHistory();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    loadHistory();
  };

  // Export to Excel
  const handleExport = async () => {
    if (records.length === 0) {
      toast.warning('No records to export');
      return;
    }

    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = records.map(record => ({
        'Detection Time': record.time,
        'Filename': record.filename,
        'Target': record.target,
        'Center X': record.center_x?.toFixed(2),
        'Center Y': record.center_y?.toFixed(2),
        'Confidence': (record.confidence * 100).toFixed(1) + '%',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Detection History');

      // Generate and save file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `detection_history_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, filename);

      toast.success('History exported successfully!');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Group records by filename for summary view
  const groupedRecords = records.reduce((acc, record) => {
    const key = `${record.filename}_${record.time}`;
    if (!acc[key]) {
      acc[key] = {
        filename: record.filename,
        time: record.time,
        detections: [],
      };
    }
    acc[key].detections.push(record);
    return acc;
  }, {});

  const summaryRecords = Object.values(groupedRecords);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Detection History</h2>
          <p className="text-slate-400 text-sm mt-1">View past detection results from the AI model</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || records.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Excel
          </button>
        </div>
      </div>

      {/* Search/Filter Bar */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value={20}>20 records</option>
            <option value={50}>50 records</option>
            <option value={100}>100 records</option>
            <option value={200}>200 records</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            Search
          </button>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="text-rose-400 shrink-0" />
            <div>
              <h3 className="text-rose-400 font-medium">Failed to Load History</h3>
              <p className="text-rose-300/70 text-sm mt-1">{error.message}</p>
              <p className="text-slate-500 text-xs mt-2">Make sure the backend server is running on port 5000</p>
              <button
                onClick={loadHistory}
                className="mt-4 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg text-sm hover:bg-rose-500/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-12 text-center">
          <Loader2 size={32} className="animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading detection history...</p>
        </div>
      )}

      {/* Records Table */}
      {!loading && !error && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          {records.length > 0 ? (
            <>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Time</th>
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Filename</th>
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Target</th>
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Center (X, Y)</th>
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Confidence</th>
                    <th className="px-6 py-4 text-slate-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">{record.time}</td>
                      <td className="px-6 py-4">
                        <span className="text-amber-400 font-mono text-sm truncate block max-w-xs" title={record.filename}>
                          {record.filename}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                          {record.target}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                        ({record.center_x?.toFixed(1)}, {record.center_y?.toFixed(1)})
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                              style={{ width: `${record.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-emerald-400 text-sm font-medium">
                            {(record.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Footer */}
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-sm">
                  Showing {records.length} detection records
                </span>
                <span className="text-slate-500 text-xs">
                  {summaryRecords.length} unique images
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-slate-500" />
              </div>
              <p className="text-slate-400">No detection records found</p>
              <p className="text-slate-500 text-sm mt-1">
                {searchTerm ? 'Try a different search term' : 'Run some detections to see history here'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Detection Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Time</span>
                <span className="text-white">{selectedRecord.time}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Filename</span>
                <span className="text-amber-400 font-mono text-sm">{selectedRecord.filename}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Target</span>
                <span className="text-emerald-400">{selectedRecord.target}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Center Position</span>
                <span className="text-white font-mono">
                  ({selectedRecord.center_x?.toFixed(2)}, {selectedRecord.center_y?.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">Confidence</span>
                <span className="text-emerald-400 font-medium">
                  {(selectedRecord.confidence * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full mt-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionHistoryPage;