import { Search, Download, Settings } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900">Torrent Manager</h1>
          <p className="text-gray-600 mt-2">Mobile-friendly torrent management</p>
        </header>

        {/* Navigation Cards */}
        <div className="space-y-4">
          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-100 rounded-full">
                <Search className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Search</h2>
                <p className="text-gray-500">Find and add torrents</p>
              </div>
            </div>
          </div>

          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-success-100 rounded-full">
                <Download className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Downloads</h2>
                <p className="text-gray-500">Manage active downloads</p>
              </div>
            </div>
          </div>

          <div className="card hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Settings</h2>
                <p className="text-gray-500">Configure preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}