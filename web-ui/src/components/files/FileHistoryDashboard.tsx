"use client";

import React, { useState, useCallback } from "react";
import { useFileHistory, useFileStats } from "@/hooks/use-file-history";
import FileHistoryCard from "./FileHistoryCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import type {
  DownloadHistoryEntry,
  HistoryFilters,
} from "@/lib/types/file-history";
import { formatFileSize, formatSpeed } from "@/lib/api/files";

const FileHistoryDashboard: React.FC = () => {
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    DownloadHistoryEntry["status"][]
  >([]);

  const { history, total, isLoading, error, refresh, deleteEntry } =
    useFileHistory({ filters });

  const { stats: globalStats } = useFileStats();

  // Handle search
  const handleSearch = useCallback(() => {
    const newFilters: HistoryFilters = {};

    if (searchTerm.trim()) {
      newFilters.searchTerm = searchTerm.trim();
    }

    if (selectedCategory) {
      newFilters.category = selectedCategory;
    }

    if (selectedStatus.length > 0) {
      newFilters.status = selectedStatus;
    }

    setFilters(newFilters);
  }, [searchTerm, selectedCategory, selectedStatus]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus([]);
  }, []);

  const handleRedownload = useCallback((entry: DownloadHistoryEntry) => {
    // TODO: Implement redownload functionality
    // eslint-disable-next-line no-console
    console.log("Redownload:", entry.name);
    alert("Redownload functionality will be implemented in a future update");
  }, []);

  const handleViewFiles = useCallback((entry: DownloadHistoryEntry) => {
    // TODO: Implement file browser navigation
    // eslint-disable-next-line no-console
    console.log("View files for:", entry.name);
    alert("File browsing will be implemented in a future update");
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const success = await deleteEntry(id);
      if (!success) {
        alert("Failed to remove entry from history");
      }
    },
    [deleteEntry],
  );

  const handleStatusToggle = useCallback(
    (status: DownloadHistoryEntry["status"]) => {
      setSelectedStatus((prev) =>
        prev.includes(status)
          ? prev.filter((s) => s !== status)
          : [...prev, status],
      );
    },
    [],
  );

  // Get unique categories from history
  const availableCategories = React.useMemo(() => {
    const categories = new Set(history.map((entry) => entry.category));
    return Array.from(categories).sort();
  }, [history]);

  if (error) {
    return <ErrorMessage message="Failed to load file history" />;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      {globalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {globalStats.totalDownloads}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Downloads</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatFileSize(globalStats.totalSize)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Size</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatSpeed(globalStats.averageSpeed)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Speed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.round(globalStats.totalTime / (1000 * 60 * 60))}h
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Time</div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search downloads..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button onClick={handleSearch} className="btn btn-primary px-6">
                Search
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap lg:w-auto">
            {(["completed", "error", "deleted", "moved"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedStatus.includes(status)
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedStatus.length > 0) && (
            <button
              onClick={clearFilters}
              className="btn btn-secondary px-4 whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {history.length} of {total} downloads
        </div>
        <button
          onClick={refresh}
          className="btn btn-secondary px-4 py-2 text-sm"
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {isLoading && history.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {Object.keys(filters).length > 0
              ? "No downloads found matching your filters"
              : "No download history found"}
          </div>
        ) : (
          history.map((entry) => (
            <FileHistoryCard
              key={entry.id}
              entry={entry}
              onRedownload={handleRedownload}
              onDelete={handleDelete}
              onViewFiles={handleViewFiles}
            />
          ))
        )}
      </div>

      {/* Load More / Pagination placeholder */}
      {history.length > 0 && history.length < total && (
        <div className="text-center py-4">
          <button className="btn btn-secondary">Load More Downloads</button>
        </div>
      )}
    </div>
  );
};

export default FileHistoryDashboard;
