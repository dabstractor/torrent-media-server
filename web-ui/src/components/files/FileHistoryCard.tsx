"use client";

import React, { useCallback, useState } from "react";
import type { DownloadHistoryEntry } from "@/lib/types/file-history";
import {
  formatFileSize,
  formatDate,
  formatDuration,
  formatSpeed,
} from "@/lib/api/files";

interface FileHistoryCardProps {
  entry: DownloadHistoryEntry;
  onRedownload: (entry: DownloadHistoryEntry) => void;
  onDelete: (id: string) => void;
  onViewFiles?: (entry: DownloadHistoryEntry) => void;
}

const FileHistoryCard: React.FC<FileHistoryCardProps> = ({
  entry,
  onRedownload,
  onDelete,
  onViewFiles,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRedownload = useCallback(() => {
    onRedownload(entry);
  }, [entry, onRedownload]);

  const handleDelete = useCallback(() => {
    if (
      confirm(
        "Are you sure you want to remove this entry from history? This cannot be undone.",
      )
    ) {
      onDelete(entry.id);
    }
  }, [entry.id, onDelete]);

  const handleViewFiles = useCallback(() => {
    if (onViewFiles) {
      onViewFiles(entry);
    }
  }, [entry, onViewFiles]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "error":
        return "text-red-600 bg-red-100";
      case "deleted":
        return "text-orange-600 bg-orange-100";
      case "moved":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case "completed":
        return "✅";
      case "error":
        return "❌";
      case "deleted":
        return "🗑️";
      case "moved":
        return "📁";
      default:
        return "❓";
    }
  };

  const calculateProgress = (): number => {
    return entry.originalSize > 0
      ? (entry.downloadedSize / entry.originalSize) * 100
      : 0;
  };

  const progress = calculateProgress();
  const hasFiles = entry.status !== "deleted" && entry.status !== "error";
  const canRedownload = entry.torrentFile || entry.magnetUrl;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={toggleExpanded}
            className="mt-1 p-1 rounded hover:bg-gray-100 transition-colors"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? "🔽" : "▶️"}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm sm:text-base line-clamp-2 leading-5">
              {entry.name}
            </h3>

            {/* Status and category badges */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(entry.status)}`}
              >
                <span className="mr-1">{getStatusIcon(entry.status)}</span>
                {entry.status.toUpperCase()}
              </span>
              {entry.category && (
                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                  {entry.category}
                </span>
              )}
              {entry.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar for incomplete downloads */}
        {progress < 100 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Basic stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">📦</span>
            <span>{formatFileSize(entry.originalSize)}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-green-400">⚡</span>
            <span>{formatSpeed(entry.averageSpeed)}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-blue-400">⏱️</span>
            <span>{formatDuration(entry.downloadTime)}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-purple-400">🔄</span>
            <span>{entry.ratio.toFixed(2)}</span>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Started:</span>
                <p className="text-gray-900">{formatDate(entry.startedAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">Completed:</span>
                <p className="text-gray-900">{formatDate(entry.completedAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">Seeders:</span>
                <p className="text-gray-900">{entry.seeders}</p>
              </div>
              <div>
                <span className="text-gray-500">Leechers:</span>
                <p className="text-gray-900">{entry.leechers}</p>
              </div>
            </div>

            {entry.downloadPath && (
              <div>
                <span className="text-gray-500">Path:</span>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-1 rounded truncate">
                  {entry.downloadPath}
                </p>
              </div>
            )}

            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <div>
                <span className="text-gray-500">Additional Info:</span>
                <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {/* Primary actions */}
          <div className="flex gap-2 flex-1">
            {canRedownload && (
              <button
                onClick={handleRedownload}
                className="btn btn-primary flex-1 min-h-[44px] text-xs"
                title="Re-download from stored torrent"
              >
                📥 Re-download
              </button>
            )}

            {hasFiles && onViewFiles && (
              <button
                onClick={handleViewFiles}
                className="btn btn-secondary flex-1 min-h-[44px] text-xs"
                title="Browse downloaded files"
              >
                📁 View Files
              </button>
            )}

            {!hasFiles && entry.status !== "deleted" && (
              <button
                className="btn btn-secondary flex-1 min-h-[44px] text-xs opacity-50 cursor-not-allowed"
                title="Files not available"
                disabled
              >
                📁 Files N/A
              </button>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="btn btn-secondary min-h-[44px] px-4 text-xs hover:bg-red-50 hover:text-red-600"
            title="Remove from history"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileHistoryCard;
