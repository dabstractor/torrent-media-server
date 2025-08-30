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

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    // Convert hash back to torrent ID (Transmission uses numeric IDs)
    const torrentId = parseInt(params.hash)
    
    if (isNaN(torrentId)) {
      return Response.json({ error: 'Invalid torrent ID' }, { status: 400 })
    }
    
    // Get specific torrent info from Transmission
    const response = await makeTransmissionRequest('torrent-get', {
      ids: [torrentId],
      fields: [
        'id', 'name', 'totalSize', 'percentDone', 'status',
        'rateDownload', 'rateUpload', 'eta', 'downloadedEver',
        'uploadedEver', 'uploadRatio', 'addedDate', 'doneDate',
        'seedRatioLimit', 'peersSendingToUs', 'peersGettingFromUs'
      ]
    })

    if (!response.arguments || !response.arguments.torrents || response.arguments.torrents.length === 0) {
      return Response.json({ error: 'Torrent not found' }, { status: 404 })
    }
    
    const torrent = response.arguments.torrents[0]
    
    // Transform Transmission data to expected format
    const download = {
      hash: torrent.id.toString(),
      name: torrent.name,
      size: torrent.totalSize,
      progress: torrent.percentDone,
      state: getStateString(torrent.status),
      eta: torrent.eta > 0 ? torrent.eta : -1,
      downloaded: torrent.downloadedEver,
      uploaded: torrent.uploadedEver,
      priority: 'normal',
      seeds: torrent.peersSendingToUs || 0,
      peers: torrent.peersGettingFromUs || 0,
      ratio: torrent.uploadRatio,
      addedOn: torrent.addedDate,
      completedOn: torrent.doneDate,
    }
    
    return Response.json(download)
  } catch (error) {
    console.error('Error fetching torrent details:', error)
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