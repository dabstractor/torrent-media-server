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

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string; action: string } }
) {
  try {
    const { hash, action } = params
    
    // Convert hash to torrent ID (Transmission uses numeric IDs)
    const torrentId = parseInt(hash)
    
    if (isNaN(torrentId)) {
      return Response.json({ error: 'Invalid torrent ID' }, { status: 400 })
    }
    
    if (!['pause', 'resume', 'delete'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    // Map actions to Transmission RPC methods
    let method = ''
    let args: any = { ids: [torrentId] }
    
    switch (action) {
      case 'pause':
        method = 'torrent-stop'
        break
      case 'resume':
        method = 'torrent-start'
        break
      case 'delete':
        method = 'torrent-remove'
        // Don't delete files by default - client can specify this
        const body = await request.json().catch(() => ({}))
        args.delete_local_data = body.deleteFiles === true
        break
    }
    
    const response = await makeTransmissionRequest(method, args)
    
    if (response.result !== 'success') {
      return Response.json({ error: `Failed to ${action} torrent` }, { status: 503 })
    }
    
    return Response.json({ success: true })
  } catch (error) {
    console.error(`Error performing torrent action:`, error)
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
}