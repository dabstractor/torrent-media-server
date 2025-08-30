import { NextRequest } from 'next/server'

const TRANSMISSION_URL = process.env.TRANSMISSION_URL || 'http://transmission:9091'
const TRANSMISSION_USER = process.env.TRANSMISSION_USERNAME || 'admin'
const TRANSMISSION_PASSWORD = process.env.TRANSMISSION_PASSWORD || 'adminpass123'

let cachedSessionId: string | null = null
let sessionTimestamp = 0
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

async function makeTransmissionRequest(method: string, args: any = {}) {
  const now = Date.now()
  
  // Check if we need to refresh session
  if (!cachedSessionId || (now - sessionTimestamp) > SESSION_TIMEOUT) {
    cachedSessionId = null
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  // Add authentication
  if (TRANSMISSION_USER && TRANSMISSION_PASSWORD) {
    headers['Authorization'] = `Basic ${btoa(`${TRANSMISSION_USER}:${TRANSMISSION_PASSWORD}`)}`
  }

  // Add session ID if we have one
  if (cachedSessionId) {
    headers['X-Transmission-Session-Id'] = cachedSessionId
  }

  const requestBody = {
    method,
    arguments: args
  }

  const response = await fetch(`${TRANSMISSION_URL}/transmission/rpc`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000)
  })

  // Handle session ID requirement
  if (response.status === 409) {
    const newSessionId = response.headers.get('X-Transmission-Session-Id')
    if (newSessionId) {
      cachedSessionId = newSessionId
      sessionTimestamp = now
      
      // Retry with new session ID
      const retryHeaders = {
        ...headers,
        'X-Transmission-Session-Id': newSessionId
      }

      const retryResponse = await fetch(`${TRANSMISSION_URL}/transmission/rpc`, {
        method: 'POST',
        headers: retryHeaders,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000)
      })

      if (!retryResponse.ok) {
        throw new Error(`Transmission RPC error: ${retryResponse.statusText}`)
      }

      return await retryResponse.json()
    } else {
      throw new Error('Failed to obtain session ID from Transmission')
    }
  }

  if (!response.ok) {
    throw new Error(`Transmission RPC error: ${response.statusText}`)
  }

  return await response.json()
}

export async function GET() {
  try {
    // Get torrent list from Transmission
    const response = await makeTransmissionRequest('torrent-get', {
      fields: [
        'id', 'name', 'totalSize', 'percentDone', 'status',
        'rateDownload', 'rateUpload', 'eta', 'downloadedEver',
        'uploadedEver', 'uploadRatio', 'addedDate', 'doneDate',
        'seedRatioLimit', 'peersSendingToUs', 'peersGettingFromUs'
      ]
    })

    if (!response.arguments || !response.arguments.torrents) {
      return Response.json({ error: 'Invalid response from Transmission' }, { status: 503 })
    }

    const torrents = response.arguments.torrents

    // Transform Transmission data to expected format
    const downloads = torrents.map((torrent: any) => ({
      hash: torrent.id.toString(), // Transmission uses numeric IDs
      name: torrent.name,
      size: torrent.totalSize,
      progress: torrent.percentDone,
      state: getStateString(torrent.status),
      eta: torrent.eta > 0 ? torrent.eta : -1,
      downloaded: torrent.downloadedEver,
      uploaded: torrent.uploadedEver,
      priority: 'normal', // Transmission doesn't have global priority like qBittorrent
      seeds: torrent.peersSendingToUs || 0,
      peers: torrent.peersGettingFromUs || 0,
      ratio: torrent.uploadRatio,
      addedOn: torrent.addedDate,
      completedOn: torrent.doneDate,
    }))

    // Calculate stats based on Transmission status codes
    const stats = {
      downloading: downloads.filter((d: any) => d.state === 'downloading').length,
      seeding: downloads.filter((d: any) => d.state === 'seeding').length,
      paused: downloads.filter((d: any) => d.state === 'stopped').length,
      completed: downloads.filter((d: any) => d.progress >= 1).length,
      total: downloads.length,
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
    
    // Add torrent to Transmission
    const response = await makeTransmissionRequest('torrent-add', {
      filename: magnet,
      // Transmission doesn't have categories like qBittorrent, but we can use labels
      labels: category ? [category] : undefined
    })

    if (response.result !== 'success') {
      return Response.json({ error: 'Failed to add torrent' }, { status: 503 })
    }
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Error adding torrent:', error)
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

// Helper function to convert Transmission status codes to readable strings
function getStateString(status: number): string {
  switch (status) {
    case 0: return 'stopped'
    case 1: return 'checking'
    case 2: return 'checking'  
    case 3: return 'downloading'
    case 4: return 'downloading'
    case 5: return 'seeding'
    case 6: return 'seeding'
    default: return 'unknown'
  }
}