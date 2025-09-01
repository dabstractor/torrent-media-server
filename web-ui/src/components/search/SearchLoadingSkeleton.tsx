import React from 'react'

const SearchLoadingSkeleton: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
      {/* Page header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
      </div>

      {/* Search form skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search input skeleton */}
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          
          {/* Filter row skeleton */}
          <div className="flex flex-wrap gap-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
          </div>
          
          {/* Search button skeleton */}
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
        </div>
      </div>

      {/* Search results skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              {/* Title and category skeleton */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </div>
              
              {/* Metadata skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, metaIndex) => (
                  <div key={metaIndex} className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
              
              {/* Date and ID skeleton */}
              <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </div>
              
              {/* Action buttons skeleton */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                <div className="flex-1 flex gap-2">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchLoadingSkeleton