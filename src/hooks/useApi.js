/**
 * React Hooks for API interactions
 * Provides state management for async API calls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService, classifyImage, fetchHistory, checkHealth } from '../services/api';

/**
 * Generic hook for API calls with loading and error states
 * @param {Function} apiFunction - The API function to call
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export function useApiCall(apiFunction) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction(...args);
      if (mountedRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook for backend connection status
 * @param {number} pollInterval - Polling interval in ms (0 to disable)
 * @returns {Object} - { connected, checking, error, checkConnection }
 */
export function useBackendConnection(pollInterval = 0) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const result = await apiService.testConnection();
      setConnected(result.connected);
      setError(result.connected ? null : result.message);
      return result;
    } catch (err) {
      setConnected(false);
      setError(err.message);
      return { connected: false, message: err.message };
    } finally {
      setChecking(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Polling if interval is set
  useEffect(() => {
    if (pollInterval > 0) {
      const interval = setInterval(checkConnection, pollInterval);
      return () => clearInterval(interval);
    }
  }, [pollInterval, checkConnection]);

  return { connected, checking, error, checkConnection };
}

/**
 * Hook for image classification
 * @returns {Object} - Classification state and methods
 */
export function useImageClassification() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Handle file selection
  const selectFile = useCallback((file) => {
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  }, []);

  // Classify the selected image
  const classify = useCallback(async (confidence = 0.25) => {
    if (!selectedFile) {
      setError(new Error('No file selected'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const classificationResult = await classifyImage(selectedFile, confidence);
      setResult(classificationResult);
      return classificationResult;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  // Reset all state
  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
    setError(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [previewUrl]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return {
    result,
    loading,
    error,
    selectedFile,
    previewUrl,
    selectFile,
    classify,
    reset,
    // Computed properties
    hasResult: result !== null,
    detectionCount: result?.detections?.length || 0,
    isCached: result?.cached || false,
  };
}

/**
 * Hook for fetching detection history
 * @param {Object} options - Initial fetch options
 * @returns {Object} - History state and methods
 */
export function useDetectionHistory(options = {}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(options.limit || 50);
  const [search, setSearch] = useState(options.search || '');

  const fetch = useCallback(async (overrideOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchHistory({
        limit: overrideOptions.limit ?? limit,
        search: overrideOptions.search ?? search,
      });
      setRecords(result.results || []);
      return result;
    } catch (err) {
      setError(err);
      setRecords([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [limit, search]);

  // Initial fetch on mount
  useEffect(() => {
    fetch();
  }, []);

  // Re-fetch when limit or search changes
  const refresh = useCallback(() => {
    return fetch({ limit, search });
  }, [fetch, limit, search]);

  return {
    records,
    loading,
    error,
    limit,
    search,
    setLimit,
    setSearch,
    fetch,
    refresh,
    // Computed
    recordCount: records.length,
    hasRecords: records.length > 0,
  };
}

/**
 * Hook for real-time cleanliness data
 * Simulates real-time updates until backend provides WebSocket/SSE
 * @param {Object} mirrorData - The initial mirror data array
 * @param {boolean} enabled - Whether real-time updates are enabled
 * @returns {Object} - Real-time mirror data state
 */
export function useRealtimeData(initialMirrorData, enabled = false) {
  const [mirrorData, setMirrorData] = useState(initialMirrorData);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // In the future, this could connect to a WebSocket for real-time updates
  // For now, it just returns the initial data
  const refresh = useCallback(async () => {
    // TODO: Implement real backend fetch when available
    setLastUpdate(new Date());
    return mirrorData;
  }, [mirrorData]);

  return {
    mirrorData,
    lastUpdate,
    refresh,
    setMirrorData,
  };
}

export default {
  useApiCall,
  useBackendConnection,
  useImageClassification,
  useDetectionHistory,
  useRealtimeData,
};