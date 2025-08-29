import Link from 'next/link';
import { Search, Download, Settings } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 bg-white dark:bg-gray-900">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Torrent Manager</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Mobile-friendly torrent management</p>
        </header>

        {/* Navigation Cards */}
        <div className="space-y-4">
          <Link href="/search">
            <div className="card hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
                  <Search className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Search</h2>
                  <p className="text-gray-500 dark:text-gray-400">Find and add torrents</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/downloads">
            <div className="card hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-success-100 dark:bg-success-900 rounded-full">
                  <Download className="h-6 w-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Downloads</h2>
                  <p className="text-gray-500 dark:text-gray-400">Manage active downloads</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/settings">
            <div className="card hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Settings className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Settings</h2>
                  <p className="text-gray-500 dark:text-gray-400">Configure preferences</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}