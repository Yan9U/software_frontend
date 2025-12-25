/**
 * API Service Layer for Heliostat Cleanliness Measurement System
 * Connects to the Flask backend at localhost:5000
 */

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Accept': 'application/json',
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Try to parse JSON response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new APIError(
        data?.error || data?.message || `HTTP error ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Network error or other fetch error
    throw new APIError(
      error.message || 'Network error - please check if backend is running',
      0,
      null
    );
  }
}

/**
 * Health check - verify backend connection
 * @returns {Promise<{status: string}>}
 */
export async function checkHealth() {
  return fetchAPI('/health');
}

/**
 * Classify an image using YOLO model
 * @param {File} imageFile - The image file to classify
 * @param {number} confidence - Confidence threshold (0-1, default 0.25)
 * @returns {Promise<ClassificationResult>}
 *
 * @typedef {Object} ClassificationResult
 * @property {string} filename - Original filename
 * @property {Detection[]} detections - Array of detected objects
 * @property {string} annotated_image - Base64-encoded annotated image
 * @property {boolean} cached - Whether result was from cache
 *
 * @typedef {Object} Detection
 * @property {string} target - Class name (e.g., "mirror")
 * @property {number[]} center - [x, y] center coordinates
 * @property {number} confidence - Confidence score (0-1)
 */
export async function classifyImage(imageFile, confidence = 0.25) {
  const formData = new FormData();
  formData.append('file', imageFile);

  // Note: confidence param not currently supported by backend, but kept for future
  return fetchAPI('/classify', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Fetch detection history
 * @param {Object} options - Query options
 * @param {number} options.limit - Max records to return (1-200, default 50)
 * @param {string} options.search - Filename search pattern (optional)
 * @returns {Promise<{results: HistoryRecord[]}>}
 *
 * @typedef {Object} HistoryRecord
 * @property {string} time - Detection timestamp
 * @property {string} filename - Original image filename
 * @property {string} target - Detected class
 * @property {number} center_x - X coordinate
 * @property {number} center_y - Y coordinate
 * @property {number} confidence - Confidence score
 */
export async function fetchHistory({ limit = 50, search = '' } = {}) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (search) params.append('search', search);

  const queryString = params.toString();
  return fetchAPI(`/history${queryString ? `?${queryString}` : ''}`);
}

/**
 * Fetch all detection history for export (no limit)
 * @param {Object} options - Query options
 * @param {string} options.search - Filename search pattern (optional)
 * @returns {Promise<{results: HistoryRecord[], total: number}>}
 */
export async function fetchHistoryForExport({ search = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const queryString = params.toString();
  return fetchAPI(`/history/export${queryString ? `?${queryString}` : ''}`);
}

// ============== NEW API FUNCTIONS ==============

/**
 * Get mirror image URL (for display in modal)
 * @param {string} mirrorId - The mirror ID
 * @returns {string} - Image URL
 */
export function getMirrorImageUrl(mirrorId) {
  return `${API_BASE_URL}/mirror/image/${encodeURIComponent(mirrorId)}`;
}

/**
 * Get random mirror image URL
 * @returns {string} - Image URL
 */
export function getRandomImageUrl() {
  return `${API_BASE_URL}/mirror/image/random?t=${Date.now()}`;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  return fetchAPI('/dashboard/stats');
}

/**
 * Refresh dashboard data
 */
export async function refreshDashboard() {
  return fetchAPI('/dashboard/refresh', { method: 'POST' });
}

/**
 * Get drone status
 */
export async function getDroneStatus() {
  return fetchAPI('/drone/status');
}

/**
 * Start drone inspection
 */
export async function startInspection(zones = '全场') {
  return fetchAPI('/drone/inspection/start', {
    method: 'POST',
    body: JSON.stringify({ zones }),
  });
}

/**
 * Stop drone inspection
 */
export async function stopInspection() {
  return fetchAPI('/drone/inspection/stop', { method: 'POST' });
}

/**
 * Get zone statistics
 */
export async function getZoneStats() {
  return fetchAPI('/zones/stats');
}

/**
 * Get cleanliness history for charts
 */
export async function getCleanlinessHistory(days = 30) {
  return fetchAPI(`/cleanliness/history?days=${days}`);
}

/**
 * Get system alerts
 */
export async function getAlerts() {
  return fetchAPI('/alerts');
}

/**
 * Get inspection records
 */
export async function getInspectionRecords() {
  return fetchAPI('/inspection/records');
}

/**
 * Filter inspection records
 */
export async function filterInspectionRecords(filters) {
  return fetchAPI('/inspection/filter', {
    method: 'POST',
    body: JSON.stringify(filters),
  });
}

/**
 * Get settings
 */
export async function getSettings() {
  return fetchAPI('/settings');
}

/**
 * Save settings
 */
export async function saveSettings(settings) {
  return fetchAPI('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

/**
 * Test MODBUS connection
 */
export async function testModbusConnection(host, port) {
  return fetchAPI('/settings/test-connection', {
    method: 'POST',
    body: JSON.stringify({ host, port }),
  });
}

/**
 * Import data from file
 */
export async function importData(file) {
  const formData = new FormData();
  formData.append('file', file);
  return fetchAPI('/data/import', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Get mirrors by zone
 */
export async function getMirrorsByZone(zone) {
  return fetchAPI(`/mirrors/${zone}`);
}

/**
 * Get all mirror field data for map visualization
 * @returns {Promise<{success: boolean, total: number, mirrors: MirrorData[], center: {lat: number, lng: number}}>}
 *
 * @typedef {Object} MirrorData
 * @property {string} id - Mirror ID (e.g., "00-001")
 * @property {number} x - X coordinate in meters
 * @property {number} y - Y coordinate in meters
 * @property {string} z - Zone identifier (e.g., "B", "C")
 * @property {number} c - Cleanliness percentage (0-100)
 */
export async function getMirrorFieldData() {
  return fetchAPI('/mirror-field/data');
}

/**
 * Get mirror field zones statistics
 * @returns {Promise<{success: boolean, zones: ZoneStat[]}>}
 *
 * @typedef {Object} ZoneStat
 * @property {string} zone - Zone identifier
 * @property {number} count - Number of mirrors in zone
 * @property {number} avg_cleanliness - Average cleanliness percentage
 */
export async function getMirrorFieldZones() {
  return fetchAPI('/mirror-field/zones');
}

/**
 * API Service object with all methods
 */
export const apiService = {
  checkHealth,
  classifyImage,
  fetchHistory,
  getMirrorImageUrl,
  getRandomImageUrl,
  getDashboardStats,
  refreshDashboard,
  getDroneStatus,
  startInspection,
  stopInspection,
  getZoneStats,
  getCleanlinessHistory,
  getAlerts,
  getInspectionRecords,
  filterInspectionRecords,
  getSettings,
  saveSettings,
  testModbusConnection,
  importData,
  getMirrorsByZone,
  getMirrorFieldData,
  getMirrorFieldZones,

  /**
   * Test backend connection and return status
   * @returns {Promise<{connected: boolean, message: string}>}
   */
  async testConnection() {
    try {
      const result = await checkHealth();
      return {
        connected: result.status === 'ok',
        message: 'Backend connected successfully',
      };
    } catch (error) {
      return {
        connected: false,
        message: error.message || 'Failed to connect to backend',
      };
    }
  },
};

export default apiService;