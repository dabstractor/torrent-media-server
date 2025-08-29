'use client'

import React from 'react'
import FileHistoryDashboard from '@/components/files/FileHistoryDashboard'

const FilesPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            File History
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Browse your download history and manage completed files
          </p>
        </div>
        
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            📁 Browse Files
          </button>
          <button className="btn btn-secondary">
            📊 Statistics
          </button>
          <button className="btn btn-secondary">
            🔧 Maintenance
          </button>
        </div>
      </div>

      {/* File history dashboard */}
      <FileHistoryDashboard />
    </div>
  )
}

export default FilesPage