import React, { Suspense } from 'react'
import ServicesPage from '@/components/services/ServicesPage'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Loading component for Suspense boundary
const ServicesPageLoading: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-screen bg-white dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading services dashboard...
          </p>
        </div>
      </div>
    </div>
  )
}

// Main Services page component with required Suspense boundary
export default function ServicesPageWrapper() {
  return (
    <Suspense fallback={<ServicesPageLoading />}>
      <ServicesPage />
    </Suspense>
  )
}