/**
 * Excel Export Utility for Heliostat Cleanliness Measurement System
 *
 * Provides functions to export cleanliness analysis and history data to .xlsx files
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export cleanliness analysis data to Excel
 * @param {Array} data - Array of mirror/zone data objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportCleanlinessAnalysis(data, filename = 'cleanliness-analysis') {
  const headers = [
    'Heliostat ID',
    'Zone',
    'Cleanliness %',
    'Status',
    'Timestamp'
  ];

  const rows = data.map(item => [
    item.id || item.heliostatId || '-',
    item.zone || item.z || '-',
    typeof item.cleanliness === 'number' ? item.cleanliness.toFixed(1) : (item.c || '-'),
    getStatusLabel(item.cleanliness || item.c),
    item.timestamp || new Date().toISOString()
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Heliostat ID
    { wch: 10 }, // Zone
    { wch: 15 }, // Cleanliness %
    { wch: 12 }, // Status
    { wch: 22 }  // Timestamp
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleanliness Analysis');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  saveAs(blob, `${filename}_${formatDate(new Date())}.xlsx`);
}

/**
 * Export zone summary data to Excel
 * @param {Array} zoneData - Array of zone summary objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportZoneSummary(zoneData, filename = 'zone-summary') {
  const headers = [
    'Zone',
    'Heliostat Count',
    'Average Cleanliness %',
    'Status',
    'Export Timestamp'
  ];

  const rows = zoneData.map(zone => [
    zone.zone,
    zone.count,
    zone.cleanliness.toFixed(1),
    getStatusLabel(zone.cleanliness),
    new Date().toISOString()
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zone Summary');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  saveAs(blob, `${filename}_${formatDate(new Date())}.xlsx`);
}

/**
 * Export inspection history records to Excel
 * @param {Array} historyData - Array of history record objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportHistoryRecords(historyData, filename = 'inspection-history') {
  const headers = [
    'Inspection ID',
    'Date',
    'Zones Inspected',
    'Mirrors Inspected',
    'Average Cleanliness %',
    'Status',
    'Duration'
  ];

  const rows = historyData.map(record => [
    record.id,
    record.date,
    record.zones,
    record.mirrors,
    record.avgCleanliness.toFixed(1),
    record.status === 'completed' ? 'Completed' : record.status,
    record.duration
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection History');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  saveAs(blob, `${filename}_${formatDate(new Date())}.xlsx`);
}

/**
 * Export full mirror field data to Excel
 * @param {Array} mirrorData - Array of all mirror data objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportMirrorFieldData(mirrorData, filename = 'mirror-field-data') {
  const headers = [
    'Heliostat ID',
    'Zone',
    'X Coordinate (m)',
    'Y Coordinate (m)',
    'Cleanliness %',
    'Status',
    'Timestamp'
  ];

  const rows = mirrorData.map(mirror => [
    mirror.id,
    mirror.z + '区',
    mirror.x.toFixed(1),
    mirror.y.toFixed(1),
    mirror.c.toFixed(1),
    getStatusLabel(mirror.c),
    new Date().toISOString()
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 12 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mirror Field Data');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  saveAs(blob, `${filename}_${formatDate(new Date())}.xlsx`);
}

/**
 * Get status label based on cleanliness percentage
 * @param {number} cleanliness - Cleanliness percentage
 * @returns {string} Status label
 */
function getStatusLabel(cleanliness) {
  if (cleanliness >= 90) return 'Good';
  if (cleanliness >= 80) return 'Warning';
  return 'Critical';
}

/**
 * Format date for filename
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYYMMDD_HHmmss)
 */
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
