/**
 * PriceChartUpload component
 * Handles optional price chart file upload with drag-and-drop
 */

import React, { useState, useCallback, useRef } from 'react';
import { DocumentArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';

// =============================================================================
// PROPS
// =============================================================================

interface PriceChartUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// =============================================================================
// COMPONENT
// =============================================================================

export const PriceChartUpload: React.FC<PriceChartUploadProps> = ({
  file,
  onFileChange,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file
   */
  const validateFile = (file: File): string => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10 MB (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }

    // Check file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Please upload PDF, Excel, CSV, or image files.`;
    }

    return '';
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) {
        onFileChange(null);
        setLocalError('');
        return;
      }

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setLocalError(validationError);
        onFileChange(null);
        return;
      }

      setLocalError('');
      onFileChange(selectedFile);
    },
    [onFileChange]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        handleFileSelect(droppedFiles[0]);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFileSelect(selectedFiles[0]);
      }
    },
    [handleFileSelect]
  );

  /**
   * Remove file
   */
  const handleRemove = useCallback(() => {
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const displayError = error || localError;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <DocumentArrowUpIcon className="w-5 h-5 text-blue-500" />
        Price Chart Upload (Optional)
      </h2>

      {/* File uploaded state */}
      {file ? (
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <DocumentIcon className="w-10 h-10 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-600">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-shrink-0 p-2 text-slate-600 hover:text-red-600 transition-colors"
            title="Remove file"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Drag-and-drop zone */
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                     ${
                       isDragging
                         ? 'border-blue-500 bg-blue-50'
                         : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/50'
                     }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            onChange={handleInputChange}
          />

          <DocumentArrowUpIcon
            className={`w-12 h-12 mx-auto mb-4 transition-colors
                       ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
          />

          <p className="text-sm font-medium text-slate-700 mb-1">
            {isDragging ? 'Drop file here' : 'Drag and drop file here, or click to browse'}
          </p>
          <p className="text-xs text-slate-500">
            PDF, Excel, CSV, or image files (max 10 MB)
          </p>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{displayError}</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> The price chart is optional. Upload a detailed rate chart if you have
          specific pricing documentation. Accepted formats: PDF, Excel (.xls, .xlsx), CSV, JPEG, PNG.
        </p>
      </div>
    </div>
  );
};
