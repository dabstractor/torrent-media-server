import React, { useState, useEffect } from 'react'
import type { Download } from '@/lib/types'

interface DownloadModalProps {
  isOpen: boolean
  download: Download | null
  onClose: () => void
  onSave: (hash: string, config: DownloadConfig) => Promise<boolean>
}

interface DownloadConfig {
  category: string
  priority: number
  downloadSpeedLimit?: number
  uploadSpeedLimit?: number
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  download,
  onClose,
  onSave
}) => {
  const [config, setConfig] = useState<DownloadConfig>({
    category: '',
    priority: 1,
    downloadSpeedLimit: undefined,
    uploadSpeedLimit: undefined
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>('')

  // Common category options
  const categoryOptions = [
    'Movies',
    'TV Shows', 
    'Music',
    'Software',
    'Books',
    'Games',
    'Other'
  ]

  // Priority options
  const priorityOptions = [
    { value: 0, label: 'Do not download' },
    { value: 1, label: 'Normal' },
    { value: 6, label: 'High' },
    { value: 7, label: 'Maximum' }
  ]

  // Initialize config when download changes
  useEffect(() => {
    if (download) {
      setConfig({
        category: download.category || '',
        priority: download.priority || 1,
        downloadSpeedLimit: undefined,
        uploadSpeedLimit: undefined
      })
      setError('')
    }
  }, [download])

  // Handle modal close
  const handleClose = () => {
    if (!isSaving) {
      setError('')
      onClose()
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!download) return
    
    setIsSaving(true)
    setError('')

    try {
      const success = await onSave(download.hash, config)
      if (success) {
        handleClose()
      } else {
        setError('Failed to save download configuration')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle input changes
  const handleConfigChange = (key: keyof DownloadConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  if (!isOpen || !download) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Download Configuration
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close modal"
          >
            ✖️
          </button>
        </div>

        {/* Download info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-medium text-sm mb-2 line-clamp-2">
            {download.name}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>Size: {formatBytes(download.size)}</div>
            <div>Progress: {download.progress.toFixed(1)}%</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={config.category}
              onChange={(e) => handleConfigChange('category', e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No category</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={config.priority}
              onChange={(e) => handleConfigChange('priority', parseInt(e.target.value))}
              className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="downloadSpeedLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Download Limit (KB/s)
              </label>
              <input
                id="downloadSpeedLimit"
                type="number"
                min="0"
                placeholder="Unlimited"
                value={config.downloadSpeedLimit || ''}
                onChange={(e) => handleConfigChange('downloadSpeedLimit', 
                  e.target.value ? parseInt(e.target.value) * 1024 : 0
                )}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="uploadSpeedLimit" className="block text-sm font-medium text-gray-700 mb-1">
                Upload Limit (KB/s)
              </label>
              <input
                id="uploadSpeedLimit"
                type="number"
                min="0"
                placeholder="Unlimited"
                value={config.uploadSpeedLimit || ''}
                onChange={(e) => handleConfigChange('uploadSpeedLimit', 
                  e.target.value ? parseInt(e.target.value) * 1024 : 0
                )}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 btn btn-secondary min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 btn btn-primary min-h-[44px] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DownloadModal