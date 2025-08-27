'use client'

import React from 'react'
import DownloadsDashboard from '@/components/downloads/DownloadsDashboard'

const DownloadsPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Downloads
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your active downloads and queue
          </p>
        </div>
      </div>

      {/* Downloads dashboard */}
      <DownloadsDashboard />
    </div>
  )
}

export default DownloadsPage
