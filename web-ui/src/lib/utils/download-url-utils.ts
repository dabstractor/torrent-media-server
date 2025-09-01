/**
 * Utilities for converting container URLs to secure public API endpoints
 * Addresses the security issue where direct container URLs are exposed in torrent results
 */

export interface SecureDownloadUrls {
  downloadUrl: string
  magnetUrl?: string
  originalDownloadUrl?: string
  originalMagnetUrl?: string
}

/**
 * Transform download URLs to use secure public endpoints
 * Replaces direct container references with proxy API endpoints
 * Handles the distinction between actual torrent files and magnet links
 */
export function transformDownloadUrls(
  originalDownloadUrl: string,
  originalMagnetUrl?: string,
  torrentId?: string
): SecureDownloadUrls {
  const result: SecureDownloadUrls = {
    downloadUrl: originalDownloadUrl,
    magnetUrl: originalMagnetUrl,
    originalDownloadUrl,
    originalMagnetUrl: originalMagnetUrl
  }

  // Handle download URL - check if it's actually a magnet link
  if (originalDownloadUrl) {
    // If the downloadUrl is actually a magnet link, move it to magnetUrl
    if (originalDownloadUrl.startsWith('magnet:?')) {
      // This is a magnet link in the downloadUrl field - move it to magnetUrl
      result.magnetUrl = originalDownloadUrl
      result.downloadUrl = '' // Clear the downloadUrl since it's not actually a torrent file
    } else {
      // This is a proper torrent file URL - transform it
      const secureDownloadUrl = generateSecureTorrentEndpoint(originalDownloadUrl, torrentId)
      if (secureDownloadUrl) {
        result.downloadUrl = secureDownloadUrl
      }
    }
  }

  // Transform magnet URL if it needs proxying
  if (result.magnetUrl && shouldProxyMagnetUrl(result.magnetUrl)) {
    const secureMagnetUrl = generateSecureMagnetEndpoint(result.magnetUrl)
    if (secureMagnetUrl) {
      result.magnetUrl = secureMagnetUrl
    }
  }

  return result
}

/**
 * Check if URL contains internal container references that need to be proxied
 */
export function isContainerUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  const containerIndicators = [
    'vpn:9696',           // VPN container reference
    'prowlarr:9696',      // Prowlarr container reference
    'localhost:9696',     // Localhost development
    '127.0.0.1:9696',     // Local IP
    'http://vpn',         // Docker compose service names
    'http://prowlarr',    // Docker compose service names
  ]

  return containerIndicators.some(indicator => 
    url.toLowerCase().includes(indicator.toLowerCase())
  )
}

/**
 * Check if magnet URL should be proxied for security/tracking
 */
export function shouldProxyMagnetUrl(magnetUrl: string): boolean {
  if (!magnetUrl) return false
  
  // If it's a real magnet URL, don't proxy it
  if (magnetUrl.startsWith('magnet:?')) return false
  
  // If it contains container indicators, it needs proxying
  return isContainerUrl(magnetUrl)
}

/**
 * Generate secure torrent download endpoint
 */
export function generateSecureTorrentEndpoint(
  originalUrl: string, 
  torrentId?: string
): string | null {
  try {
    // For container URLs (vpn:9696), rewrite to use host-accessible endpoint
    // This avoids Docker networking issues with Next.js fetch
    if (originalUrl.includes('vpn:9696')) {
      // Replace vpn:9696 with localhost:9696 for direct browser access
      // Use localhost since the container exposes port 9696 to host
      const hostUrl = originalUrl.replace('vpn:9696', 'localhost:9696')
      return hostUrl
    }
    
    // If torrentId is provided, use it directly (more readable URLs)
    if (torrentId) {
      return `/api/download/torrent/${torrentId}`
    }
    
    // For external URLs without torrentId, use URL-safe base64 encoding
    const downloadId = btoa(originalUrl)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    // Return the secure proxy endpoint
    return `/api/download/torrent/${downloadId}`
  } catch (err) {
    console.error('Error generating secure torrent endpoint:', err)
    return null
  }
}

/**
 * Generate secure magnet link endpoint
 */
export function generateSecureMagnetEndpoint(magnetUrl: string): string | null {
  try {
    // Use URL-safe base64 encoding to avoid Next.js trailing slash issues
    // Replace + with -, / with _, and remove padding = characters
    const encodedMagnetUrl = btoa(magnetUrl)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    // Return the secure proxy endpoint
    return `/api/download/magnet/${encodedMagnetUrl}`
  } catch (err) {
    console.error('Error generating secure magnet endpoint:', err)
    return null
  }
}

/**
 * Extract container hostname from URL for validation
 */
export function extractContainerHostname(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname
  } catch (error) {
    // If URL parsing fails, try to extract hostname with regex
    const match = url.match(/https?:\/\/([^:/]+)/i)
    return match ? match[1] : null
  }
}

/**
 * Validate that a download URL is safe and properly formatted
 */
export function validateDownloadUrl(url: string): {
  isValid: boolean
  error?: string
  isSecure?: boolean
} {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required and must be a string' }
  }

  // Check if URL is properly formatted
  try {
    new URL(url)
  } catch (error) {
    // If full URL parsing fails, check if it's a valid relative path
    if (!url.startsWith('/api/download/')) {
      return { isValid: false, error: 'Invalid URL format' }
    }
  }

  // Check if it's a secure endpoint (our API routes)
  const isSecure = url.startsWith('/api/download/') || url.startsWith('/api/secure/')

  // Check for potentially dangerous URLs
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
  ]

  if (dangerousPatterns.some(pattern => pattern.test(url))) {
    return { isValid: false, error: 'Potentially dangerous URL detected' }
  }

  return { isValid: true, isSecure }
}

/**
 * Generate expiring download token for additional security
 * This can be used for temporary download links that expire
 */
export function generateDownloadToken(
  torrentId: string,
  expirationMinutes: number = 60
): {
  token: string
  expiresAt: Date
} {
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)
  
  // Simple token generation - in production, use proper JWT or similar
  const payload = {
    torrentId,
    expiresAt: expiresAt.getTime(),
    timestamp: Date.now()
  }
  
  const token = btoa(JSON.stringify(payload))
  
  return { token, expiresAt }
}

/**
 * Validate download token
 */
export function validateDownloadToken(token: string): {
  isValid: boolean
  torrentId?: string
  error?: string
} {
  try {
    const payload = JSON.parse(atob(token))
    
    if (!payload.torrentId || !payload.expiresAt) {
      return { isValid: false, error: 'Invalid token format' }
    }
    
    if (Date.now() > payload.expiresAt) {
      return { isValid: false, error: 'Token has expired' }
    }
    
    return { isValid: true, torrentId: payload.torrentId }
  } catch (err) {
    return { isValid: false, error: 'Token validation failed' }
  }
}

/**
 * Utility to safely extract download information from torrent objects
 */
export function extractDownloadInfo(torrent: unknown): {
  id: string
  downloadUrl: string
  magnetUrl?: string
  title?: string
} {
  // Type-safe property extraction with fallbacks
  const torrentObj = torrent as Record<string, any>
  const id = torrentObj?.id || torrentObj?.guid || `torrent-${Date.now()}`
  const downloadUrl = torrentObj?.downloadUrl || torrentObj?.link || ''
  const magnetUrl = torrentObj?.magnetUrl || torrentObj?.magnet || undefined
  const title = torrentObj?.title || torrentObj?.name || 'Unknown Torrent'
  
  return { id, downloadUrl, magnetUrl, title }
}

/**
 * Create shareable download links that are safe for public use
 */
export function createShareableDownloadUrls(torrent: unknown): SecureDownloadUrls {
  const downloadInfo = extractDownloadInfo(torrent)
  return transformDownloadUrls(
    downloadInfo.downloadUrl,
    downloadInfo.magnetUrl,
    downloadInfo.id
  )
}