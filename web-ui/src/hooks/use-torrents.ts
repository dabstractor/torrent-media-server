import useSWR from 'swr'
import { useCallback } from 'react'
import { getTorrents, controlTorrent } from '@/lib/api/torrents'
import type { DownloadsResponse } from '@/lib/types';

const TORRENTS_KEY = '/api/torrents'
const REFRESH_INTERVAL = 5000 // 5 seconds

export function useTorrents() {
  const { data, error, mutate, isLoading } = useSWR<DownloadsResponse>(
    TORRENTS_KEY,
    getTorrents,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: true,
      errorRetryInterval: 10000,
    }
  )

  const pauseTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'pause')
    if (success) {
      mutate() // Revalidate data
    }
    return success
  }, [mutate])

  const resumeTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'resume')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  const deleteTorrent = useCallback(async (hash: string) => {
    const success = await controlTorrent(hash, 'delete')
    if (success) {
      mutate()
    }
    return success
  }, [mutate])

  return {
    torrents: data?.downloads || [],
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
    pauseTorrent,
    resumeTorrent,
    deleteTorrent,
  }
}