/**
 * Detection Page Component
 * Provides image upload and YOLO-based heliostat detection functionality
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, Image, Download, Loader2, CheckCircle, AlertTriangle, RefreshCw, Trash2, ZoomIn } from 'lucide-react';
import { useToast } from './Toast';
import { classifyImage } from '../services/api';

const DetectionPage = () => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, or BMP images.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    // Clear previous state
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }, [previewUrl, toast]);

  // Handle file input change
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Perform classification
  const handleClassify = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const classificationResult = await classifyImage(selectedFile);
      setResult(classificationResult);

      if (classificationResult.cached) {
        toast.info('Result loaded from cache');
      } else {
        toast.success(`Detection complete: ${classificationResult.detections?.length || 0} mirrors found`);
      }
    } catch (err) {
      setError(err);
      toast.error(err.message || 'Classification failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Reset state
  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download annotated image
  const handleDownloadResult = () => {
    if (!result?.annotated_image) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${result.annotated_image}`;
    link.download = `detection_${selectedFile?.name || 'result'}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">定日镜检测</h2>
          <p className="text-slate-400 text-sm mt-1">上传定日镜图像进行AI检测</p>
        </div>
        {(selectedFile || result) && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} />
            重置
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Upload size={20} className="text-amber-400" />
            上传图像进行检测
          </h3>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-amber-500 bg-amber-500/10'
                : previewUrl
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/bmp"
              onChange={handleInputChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
                <p className="text-slate-400 text-sm">{selectedFile?.name}</p>
                <p className="text-slate-500 text-xs">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
                  <Camera size={28} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-medium">拖拽图像到此处或点击上传</p>
                  <p className="text-slate-500 text-sm mt-1">支持 JPG, PNG, BMP (最大 10MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleClassify}
              disabled={!selectedFile || loading}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Image size={18} />
                  开始检测
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-rose-400 font-medium">检测失败</p>
                  <p className="text-rose-300/70 text-sm mt-1">{error.message}</p>
                  <p className="text-slate-500 text-xs mt-2">确保后端服务器在端口 5000 上运行</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              检测结果
            </h3>
            {result?.annotated_image && (
              <button
                onClick={handleDownloadResult}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
              >
                <Download size={14} />
                下载图像
              </button>
            )}
          </div>

          {result ? (
            <div className="space-y-4">
              {/* Annotated Image */}
              {result.annotated_image && (
                <div className="relative bg-slate-950 rounded-xl overflow-hidden">
                  <img
                    src={`data:image/png;base64,${result.annotated_image}`}
                    alt="Detection result"
                    className="w-full h-auto"
                  />
                  {result.cached && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-cyan-500/90 text-white text-xs rounded-full">
                      缓存结果
                    </div>
                  )}
                </div>
              )}

              {/* Detection Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">定日镜数量</p>
                  <p className="text-2xl font-bold text-emerald-400">{result.detections?.length || 0}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">状态</p>
                  <p className="text-lg font-medium text-white">
                    {result.detections?.length > 0 ? 'Detected' : 'No Detection'}
                  </p>
                </div>
              </div>

              {/* Detection Details */}
              {result.detections?.length > 0 && (
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-3">检测详情</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.detections.map((det, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-white text-sm">{det.target}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 text-sm font-medium">
                            {(det.confidence * 100).toFixed(1)}%
                          </p>
                          <p className="text-slate-500 text-xs">
                            ({det.center?.[0]?.toFixed(0)}, {det.center?.[1]?.toFixed(0)})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Image size={28} className="text-slate-500" />
              </div>
              <p className="text-slate-400">暂无检测结果</p>
              <p className="text-slate-500 text-sm mt-1">上传图像并点击"开始检测"</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">如何使用</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-amber-400 font-bold">1</span>
            </div>
            <p className="text-slate-300 text-sm">上传图像</p>
            <p className="text-slate-500 text-xs mt-1">拖拽或点击选择</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-amber-400 font-bold">2</span>
            </div>
            <p className="text-slate-300 text-sm">开始检测</p>
            <p className="text-slate-500 text-xs mt-1">AI分析图像</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-amber-400 font-bold">3</span>
            </div>
            <p className="text-slate-300 text-sm">查看结果</p>
            <p className="text-slate-500 text-xs mt-1">查看检测到的定日镜</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-amber-400 font-bold">4</span>
            </div>
            <p className="text-slate-300 text-sm">下载</p>
            <p className="text-slate-500 text-xs mt-1">保存标注图像</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionPage;