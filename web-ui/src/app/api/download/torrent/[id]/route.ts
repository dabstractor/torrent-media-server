import { NextRequest, NextResponse } from 'next/server'
import http from 'http'
import https from 'https'

const PROWLARR_URL = process.env.PROWLARR_URL || 'http://vpn:9696'
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Validate API key is configured
    if (!PROWLARR_API_KEY) {
      console.error('PROWLARR_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Download service not configured' },
        { status: 500 }
      )
    }

    const torrentId = params.id
    if (!torrentId) {
      return NextResponse.json(
        { error: 'Torrent ID is required' },
        { status: 400 }
      )
    }

    // Decode the torrent ID (it's URL-safe base64 encoded)
    let decodedId: string
    try {
      // Convert URL-safe base64 back to standard base64 and decode
      const standardBase64 = torrentId
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        // Add padding if needed
        + '='.repeat((4 - torrentId.length % 4) % 4)
      
      decodedId = atob(standardBase64)
    } catch (error) {
      // Fallback to URL decoding for backwards compatibility
      try {
        decodedId = decodeURIComponent(torrentId)
      } catch (fallbackError) {
        console.error('Error decoding torrent ID:', fallbackError)
        return NextResponse.json(
          { error: 'Invalid torrent ID format' },
          { status: 400 }
        )
      }
    }

    // Parse the original download URL from the torrent ID
    // The ID contains the original download path and parameters
    const originalUrl = decodedId.startsWith('http') 
      ? decodedId 
      : `${PROWLARR_URL}${decodedId.startsWith('/') ? decodedId : `/${decodedId}`}`

    // Validate that this is a legitimate torrent download URL
    // Allow both internal Prowlarr URLs and external torrent site URLs
    const prowlarrHost = PROWLARR_URL.replace('http://', '').replace('https://', '')
    const isInternalUrl = originalUrl.includes(prowlarrHost)
    const isExternalTorrentUrl = originalUrl.startsWith('http') && 
      (originalUrl.includes('.torrent') || 
       originalUrl.includes('torrent') || 
       originalUrl.includes('download'))

    if (!isInternalUrl && !isExternalTorrentUrl) {
      return NextResponse.json(
        { error: 'Invalid download source' },
        { status: 403 }
      )
    }

    // Set up headers for the proxy request
    const headers = new Headers()
    headers.set('User-Agent', 'TorrentUI-Proxy/1.0')
    
    // Only add API key for internal Prowlarr requests
    if (isInternalUrl) {
      headers.set('X-Api-Key', PROWLARR_API_KEY)
    }

    // Make the request to the original URL through our secure proxy
    // Use Node.js fetch with explicit URL validation
    let response: Response
    try {
      // Validate URL format
      const url = new URL(originalUrl)
      
      response = await fetch(url.href, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
    } catch (urlError) {
      throw new Error(`Invalid URL or fetch failed: ${urlError instanceof Error ? urlError.message : urlError}`)
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Download failed', status: response.status },
        { status: response.status }
      )
    }

    // Get the content type and filename from response headers
    const contentType = response.headers.get('Content-Type') || 'application/x-bittorrent'
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = extractFilename(contentDisposition) || `torrent-${Date.now()}.torrent`

    // Stream the torrent file content directly to the client
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', contentType)
    responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`)
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    responseHeaders.set('X-Download-Source', 'torrent-proxy')

    return new Response(response.body, {
      status: 200,
      headers: responseHeaders,
    })

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Download service unavailable', details: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Download failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Extract filename from Content-Disposition header
 */
function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null

  // Parse filename from Content-Disposition header
  // Handles both filename="file.torrent" and filename*=UTF-8''file.torrent formats
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (filenameMatch && filenameMatch[1]) {
    let filename = filenameMatch[1].replace(/['"]/g, '')
    
    // Handle RFC 5987 encoded filenames (filename*=UTF-8''file.torrent)
    if (filename.startsWith('UTF-8\'\'')) {
      filename = decodeURIComponent(filename.substring(7))
    }
    
    // Sanitize filename for security
    return sanitizeFilename(filename)
  }

  return null
}

/**
 * Sanitize filename to prevent path traversal and invalid characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[/\\?%*:|"<>]/g, '_')  // Replace dangerous characters
    .replace(/^\.+/, '')             // Remove leading dots
    .substring(0, 255)               // Limit length
    .trim() || 'download.torrent'    // Fallback if empty
}