import { NextRequest } from 'next/server'

const QBITTORRENT_URL = process.env.QBITTORRENT_URL || 'http://qbittorrent:8080'

export async function GET() {
  try {
    // Use qBittorrent API directly through the configured URL
    const response = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/info`, {
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`qBittorrent proxy error: ${response.statusText}`)
    }

    const torrents = await response.json()

    // Transform qBittorrent data to expected format
    const downloads = torrents.map((torrent: any) => ({
      hash: torrent.hash,
      name: torrent.name,
      size: torrent.size,
      progress: torrent.progress,
      state: mapQBittorrentState(torrent.state),
      eta: torrent.eta > 8640000 ? -1 : torrent.eta, // qBittorrent returns 8640000 for infinity
      downloadSpeed: torrent.dlspeed || 0,
      uploadSpeed: torrent.upspeed || 0,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded,
      priority: torrent.priority || 1,
      seeds: torrent.num_seeds || 0,
      peers: torrent.num_leechs || 0,
      ratio: torrent.ratio || 0,
      addedOn: torrent.added_on,
      completedOn: torrent.completion_on,
      category: torrent.category || undefined,
    }))

    // Calculate stats in the format the frontend expects
    const stats = {
      totalSize: downloads.reduce((sum: number, d: any) => sum + (d.size || 0), 0),
      downloadSpeed: downloads.reduce((sum: number, d: any) => sum + (d.downloadSpeed || 0), 0),
      uploadSpeed: downloads.reduce((sum: number, d: any) => sum + (d.uploadSpeed || 0), 0),
      activeCount: downloads.filter((d: any) => d.state === 'downloading' || d.state === 'seeding').length,
    }

    return Response.json({
      downloads,
      stats,
    })
  } catch (error) {
    console.error('Error fetching downloads:', error)
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { magnet, category, priority } = await request.json()

    if (!magnet) {
      return Response.json({ error: 'Missing magnet URL' }, { status: 400 })
    }

    // Use the internal qBittorrent proxy route
    const formData = new URLSearchParams()
    formData.append('urls', magnet)
    if (category) formData.append('category', category)
    formData.append('paused', 'false')

    const response = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`qBittorrent proxy error: ${response.statusText}`)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error adding torrent:', error)
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

// Helper function to convert qBittorrent state strings to our expected format
function mapQBittorrentState(qbState: string): string {
  switch (qbState) {
    case 'downloading':
    case 'stalledDL':
    case 'metaDL':
      return 'downloading'
    case 'uploading':
    case 'stalledUP':
      return 'seeding'
    case 'pausedDL':
    case 'pausedUP':
      return 'paused'
    case 'queuedDL':
    case 'queuedUP':
      return 'queued'
    case 'error':
    case 'missingFiles':
      return 'error'
    case 'checkingDL':
    case 'checkingUP':
    case 'checkingResumeData':
      return 'checking'
    default:
      return 'unknown'
  }
}