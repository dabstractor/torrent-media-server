import { NextRequest, NextResponse } from 'next/server'

interface MagnetProxyResponse {
  magnetUrl: string
  isValid: boolean
  torrentName?: string
  infoHash?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const magnetId = params.id
    if (!magnetId) {
      return NextResponse.json(
        { error: 'Magnet ID is required' },
        { status: 400 }
      )
    }

    // Decode the magnet ID (it's base64 encoded for URL safety)
    let decodedMagnetUrl: string
    try {
      // First try base64 decoding (new format)
      decodedMagnetUrl = atob(magnetId)
    } catch (error) {
      // Fallback to URL decoding for backwards compatibility
      try {
        decodedMagnetUrl = decodeURIComponent(magnetId)
      } catch (fallbackError) {
        console.error('Error decoding magnet ID:', fallbackError)
        return NextResponse.json(
          { error: 'Invalid magnet ID format' },
          { status: 400 }
        )
      }
    }

    // Validate that this is a legitimate magnet URL
    if (!decodedMagnetUrl.startsWith('magnet:?')) {
      return NextResponse.json(
        { error: 'Invalid magnet URL format' },
        { status: 400 }
      )
    }

    // Parse and validate the magnet URL
    const magnetValidation = validateMagnetUrl(decodedMagnetUrl)
    if (!magnetValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid magnet URL', details: magnetValidation.error },
        { status: 400 }
      )
    }

    // For magnet links, we typically redirect or provide the URL directly
    // since they're handled by the client's torrent application
    
    // Check if this is a request for JSON response (API usage)
    const acceptHeader = request.headers.get('accept')
    if (acceptHeader?.includes('application/json')) {
      const response: MagnetProxyResponse = {
        magnetUrl: decodedMagnetUrl,
        isValid: true,
        torrentName: magnetValidation.torrentName,
        infoHash: magnetValidation.infoHash
      }

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
          'X-Download-Source': 'magnet-proxy',
        }
      })
    }

    // For direct navigation (browser request), redirect to the magnet URL
    // This allows the user's default torrent application to handle it
    return NextResponse.redirect(decodedMagnetUrl, 302)

  } catch (error) {
    console.error('Magnet download proxy error:', error)
    
    return NextResponse.json(
      { error: 'Magnet processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Alternative endpoint for getting magnet info without redirect
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const magnetId = params.id
    if (!magnetId) {
      return NextResponse.json(
        { error: 'Magnet ID is required' },
        { status: 400 }
      )
    }

    let decodedMagnetUrl: string
    try {
      // First try base64 decoding (new format)
      decodedMagnetUrl = atob(magnetId)
    } catch (error) {
      // Fallback to URL decoding for backwards compatibility
      try {
        decodedMagnetUrl = decodeURIComponent(magnetId)
      } catch (fallbackError) {
        return NextResponse.json(
          { error: 'Invalid magnet ID format' },
          { status: 400 }
        )
      }
    }

    const magnetValidation = validateMagnetUrl(decodedMagnetUrl)
    if (!magnetValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid magnet URL', details: magnetValidation.error },
        { status: 400 }
      )
    }

    const response: MagnetProxyResponse = {
      magnetUrl: decodedMagnetUrl,
      isValid: true,
      torrentName: magnetValidation.torrentName,
      infoHash: magnetValidation.infoHash
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Download-Source': 'magnet-proxy',
      }
    })

  } catch (err) {
    console.error('Magnet info proxy error:', err)
    return NextResponse.json(
      { error: 'Magnet info processing failed' },
      { status: 500 }
    )
  }
}

interface MagnetValidation {
  isValid: boolean
  error?: string
  torrentName?: string
  infoHash?: string
  trackers?: string[]
}

/**
 * Validate and parse magnet URL
 */
function validateMagnetUrl(magnetUrl: string): MagnetValidation {
  try {
    // Basic format validation
    if (!magnetUrl.startsWith('magnet:?')) {
      return { isValid: false, error: 'Must start with magnet:?' }
    }

    // Parse the URL parameters
    const url = new URL(magnetUrl)
    const params = url.searchParams

    // Check for required xt (exact topic) parameter with info hash
    const xt = params.get('xt')
    if (!xt || !xt.startsWith('urn:btih:')) {
      return { isValid: false, error: 'Missing or invalid info hash (xt parameter)' }
    }

    // Extract info hash
    const infoHash = xt.replace('urn:btih:', '')
    if (!/^[a-fA-F0-9]{40}$/.test(infoHash) && !/^[a-zA-Z2-7]{32}$/.test(infoHash)) {
      return { isValid: false, error: 'Invalid info hash format' }
    }

    // Extract display name (dn parameter)
    const torrentName = params.get('dn') || undefined

    // Extract trackers (tr parameters)
    const trackers = params.getAll('tr')

    // Validate that there's at least one tracker or it's a DHT-only torrent
    if (trackers.length === 0) {
      console.warn('Magnet URL has no trackers - DHT-only torrent')
    }

    return {
      isValid: true,
      torrentName: torrentName ? decodeURIComponent(torrentName) : undefined,
      infoHash,
      trackers: trackers.length > 0 ? trackers : undefined
    }

  } catch (err) {
    return { 
      isValid: false, 
      error: `URL parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}` 
    }
  }
}

