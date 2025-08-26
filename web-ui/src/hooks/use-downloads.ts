import useSWR from 'swr'
import { useCallback } from 'react'
import { getDownloads, controlDownload } from '@/lib/api/torrents'
import type { DownloadsResponse } from '@/types'

const DOWNLOADS_KEY = '/api/downloads'
const REFRESH_INTERVAL = 5000 // 5 seconds

export function useDownloads() {
  const { data, error, mutate, isLoading } = useSWR<DownloadsResponse>(
    DOWNLOADS_KEY,
    getDownloads,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: true,
      errorRetryInterval: 10000,
    }
  )

  const pauseDownload = useCallback(async (hash: string) => {
    const success = await controlDownload(hash, 'pause')
    if (success) {
      mutate() // Revalidate data
    }
    return success
  }, [mutate])

  const resumeDownload = useCallback(async (hash: string) => {
    const success = await controlDownload(hash, 'resume')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  const deleteDownload = useCallback(async (hash: string) => {
    const success = await controlDownload(hash, 'delete')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  return {
    downloads: data?.downloads || [],
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
    pauseDownload,
    resumeDownload,
    deleteDownload,
  }
}