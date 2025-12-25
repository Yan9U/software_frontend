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
 * API Service object with all methods
 */
export const apiService = {
  checkHealth,
  classifyImage,
  fetchHistory,

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