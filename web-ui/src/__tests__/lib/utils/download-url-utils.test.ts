import { 
  transformDownloadUrls, 
  generateSecureTorrentEndpoint, 
  generateSecureMagnetEndpoint,
  isContainerUrl,
  shouldProxyMagnetUrl,
  validateDownloadUrl
} from '@/lib/utils/download-url-utils'

describe('Download URL Utilities', () => {
  describe('transformDownloadUrls', () => {
    test('should transform torrent download URLs to secure endpoints', () => {
      const originalUrl = 'https://example.com/torrent/test.torrent'
      const result = transformDownloadUrls(originalUrl, undefined, 'test-id')
      
      expect(result.downloadUrl).toMatch(/^\/api\/download\/torrent\//)
      expect(result.originalDownloadUrl).toBe(originalUrl)
    })

    test('should transform magnet URLs to secure endpoints when needed', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test123&dn=Test'
      const result = transformDownloadUrls('', magnetUrl, 'test-id')
      
      // Currently magnet URLs are not proxied by default
      expect(result.magnetUrl).toBe(magnetUrl)
      expect(result.originalMagnetUrl).toBe(magnetUrl)
    })

    test('should handle both URLs simultaneously', () => {
      const torrentUrl = 'https://example.com/test.torrent'
      const magnetUrl = 'magnet:?xt=urn:btih:test123&dn=Test'
      const result = transformDownloadUrls(torrentUrl, magnetUrl, 'test-id')
      
      expect(result.downloadUrl).toMatch(/^\/api\/download\/torrent\//)
      expect(result.magnetUrl).toBe(magnetUrl) // Not proxied by default
      expect(result.originalDownloadUrl).toBe(torrentUrl)
      expect(result.originalMagnetUrl).toBe(magnetUrl)
    })

    test('should handle magnet links in downloadUrl field by moving them to magnetUrl', () => {
      const magnetInDownloadUrl = 'magnet:?xt=urn:btih:test123&dn=Test'
      const result = transformDownloadUrls(magnetInDownloadUrl, null, 'test-id')
      
      // The magnet link should be moved to magnetUrl
      expect(result.magnetUrl).toBe(magnetInDownloadUrl)
      // downloadUrl should be cleared since it's not actually a torrent file
      expect(result.downloadUrl).toBe('')
      expect(result.originalDownloadUrl).toBe(magnetInDownloadUrl)
    })

    test('should handle mixed scenarios with magnet link in downloadUrl', () => {
      const magnetInDownloadUrl = 'magnet:?xt=urn:btih:test123&dn=Test'
      const separateMagnetUrl = 'magnet:?xt=urn:btih:different123&dn=Different'
      const result = transformDownloadUrls(magnetInDownloadUrl, separateMagnetUrl, 'test-id')
      
      // The downloadUrl magnet should take precedence and move to magnetUrl
      expect(result.magnetUrl).toBe(magnetInDownloadUrl)
      expect(result.downloadUrl).toBe('')
      expect(result.originalDownloadUrl).toBe(magnetInDownloadUrl)
      expect(result.originalMagnetUrl).toBe(separateMagnetUrl)
    })
  })

  describe('generateSecureTorrentEndpoint', () => {
    test('should generate secure endpoint with torrent ID', () => {
      const result = generateSecureTorrentEndpoint('https://example.com/test.torrent', 'test-id')
      expect(result).toBe('/api/download/torrent/test-id')
    })

    test('should generate base64 encoded endpoint when no ID provided', () => {
      const originalUrl = 'https://example.com/test.torrent'
      const result = generateSecureTorrentEndpoint(originalUrl)
      
      expect(result).toMatch(/^\/api\/download\/torrent\//)
      const encodedPart = result?.split('/').pop()
      const decoded = atob(encodedPart || '')
      expect(decoded).toBe(originalUrl)
    })
  })

  describe('generateSecureMagnetEndpoint', () => {
    test('should generate secure magnet endpoint', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test123&dn=Test'
      const result = generateSecureMagnetEndpoint(magnetUrl)
      
      expect(result).toMatch(/^\/api\/download\/magnet\//)
      const encodedPart = result?.split('/').pop()
      const decoded = atob(encodedPart || '')
      expect(decoded).toBe(magnetUrl)
    })
  })

  describe('isContainerUrl', () => {
    test('should detect container URLs', () => {
      expect(isContainerUrl('http://vpn:9696/api')).toBe(true)
      expect(isContainerUrl('http://prowlarr:9696/api')).toBe(true)
      expect(isContainerUrl('http://localhost:9696/api')).toBe(true)
      expect(isContainerUrl('http://127.0.0.1:9696/api')).toBe(true)
    })

    test('should return false for external URLs', () => {
      expect(isContainerUrl('https://torrentgalaxy.one/torrent')).toBe(false)
      expect(isContainerUrl('https://example.com/torrent')).toBe(false)
    })
  })

  describe('validateDownloadUrl', () => {
    test('should validate secure API endpoints', () => {
      const result = validateDownloadUrl('/api/download/torrent/test123')
      expect(result.isValid).toBe(true)
      expect(result.isSecure).toBe(true)
    })

    test('should reject dangerous URLs', () => {
      const result = validateDownloadUrl('javascript:alert(1)')
      expect(result.isValid).toBe(false)
    })

    test('should accept relative API paths', () => {
      const result = validateDownloadUrl('/api/download/magnet/test123')
      expect(result.isValid).toBe(true)
      expect(result.isSecure).toBe(true)
    })
  })
})