import React, { useState } from 'react'
import { useTorrents } from '@/hooks/use-torrents'

interface BatchControlsProps {
  selectedIds: string[]
  onBatchComplete?: () => void
}

const BatchControls: React.FC<BatchControlsProps> = ({
  selectedIds,
  onBatchComplete
}) => {
  const { pauseTorrent, resumeTorrent, deleteTorrent } = useTorrents()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingAction, setProcessingAction] = useState<string>('')

  const handleBatchOperation = async (
    action: 'pause' | 'resume' | 'delete',
    requiresConfirmation = false
  ) => {
    if (selectedIds.length === 0) return

    // Show confirmation for destructive actions
    if (requiresConfirmation) {
      const confirmMessage = action === 'delete' 
        ? `Are you sure you want to delete ${selectedIds.length} download(s)? This cannot be undone.`
        : `Are you sure you want to ${action} ${selectedIds.length} download(s)?`
      
      if (!confirm(confirmMessage)) {
        return
      }
    }

    setIsProcessing(true)
    setProcessingAction(action)

    try {
      // Process operations sequentially to avoid overwhelming the API
      const results = []
      for (const id of selectedIds) {
        try {
          let result = false
          
          switch (action) {
            case 'pause':
              result = await pauseTorrent(id)
              break
            case 'resume':
              result = await resumeTorrent(id)
              break
            case 'delete':
              result = await deleteTorrent(id)
              break
          }
          
          results.push({ id, success: result })
        } catch (error) {
          console.error(`Failed to ${action} torrent ${id}:`, error)
          results.push({ id, success: false, error })
        }
      }

      // Calculate results
      const successful = results.filter(r => r.success).length
      const failed = results.length - successful

      if (failed > 0) {
        alert(`${action} completed with some failures: ${successful} successful, ${failed} failed`)
      }

      // Clear selection after successful batch operation
      if (onBatchComplete) {
        onBatchComplete()
      }
    } catch (error) {
      console.error(`Batch ${action} operation failed:`, error)
      alert(`Failed to ${action} selected downloads. Please try again.`)
    } finally {
      setIsProcessing(false)
      setProcessingAction('')
    }
  }

  const handlePauseAll = () => handleBatchOperation('pause')
  const handleResumeAll = () => handleBatchOperation('resume')
  const handleDeleteAll = () => handleBatchOperation('delete', true)

  if (selectedIds.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Selection info */}
        <div className="flex items-center space-x-3">
          <div className="text-sm font-medium text-blue-900">
            {selectedIds.length} download{selectedIds.length !== 1 ? 's' : ''} selected
          </div>
          
          {isProcessing && (
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <div className="inline-block animate-spin">⏳</div>
              <span>Processing {processingAction}...</span>
            </div>
          )}
        </div>

        {/* Batch action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePauseAll}
            disabled={isProcessing}
            className="btn btn-secondary min-h-[44px] px-4 text-sm disabled:opacity-50"
            title="Pause selected downloads"
          >
            ⏸️ Pause All
          </button>
          
          <button
            onClick={handleResumeAll}
            disabled={isProcessing}
            className="btn btn-primary min-h-[44px] px-4 text-sm disabled:opacity-50"
            title="Resume selected downloads"
          >
            ▶️ Resume All
          </button>
          
          <button
            onClick={handleDeleteAll}
            disabled={isProcessing}
            className="btn btn-secondary min-h-[44px] px-4 text-sm hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Delete selected downloads"
          >
            🗑️ Delete All
          </button>

          {/* Clear selection */}
          <button
            onClick={onBatchComplete}
            disabled={isProcessing}
            className="btn btn-secondary min-h-[44px] px-4 text-sm disabled:opacity-50"
            title="Clear selection"
          >
            ✖️ Clear
          </button>
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-blue-700">
          <span>Batch Operations:</span>
          <div className="flex items-center space-x-4">
            <span>• Pause/Resume: Immediate</span>
            <span>• Delete: Requires confirmation</span>
            <span>• Operations process sequentially</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BatchControls