import { transformDownloadUrls } from '@/lib/utils/download-url-utils'

describe('Magnet Link Fix Integration Test', () => {
  test('should handle magnet links in downloadUrl field correctly', () => {
    // This simulates the problematic case where a magnet link is in the downloadUrl field
    const magnetLink = 'magnet:?xt=urn:btih:TEST1234567890&dn=Test+Torrent'
    const result = transformDownloadUrls(magnetLink, null, 'test-id')
    
    // The magnet link should be moved to the magnetUrl field
    expect(result.magnetUrl).toBe(magnetLink)
    // The downloadUrl should be cleared since it's not actually a torrent file
    expect(result.downloadUrl).toBe('')
    // Original values should be preserved
    expect(result.originalDownloadUrl).toBe(magnetLink)
    expect(result.originalMagnetUrl).toBe(null)
  })

  test('should handle normal torrent URLs correctly', () => {
    // This simulates the normal case with an actual torrent file URL
    const torrentUrl = 'https://example.com/test.torrent'
    const magnetUrl = 'magnet:?xt=urn:btih:TEST1234567890&dn=Test+Torrent'
    const result = transformDownloadUrls(torrentUrl, magnetUrl, 'test-id')
    
    // The torrent URL should be transformed to a secure endpoint
    expect(result.downloadUrl).toBe('/api/download/torrent/test-id')
    // The magnet URL should remain unchanged
    expect(result.magnetUrl).toBe(magnetUrl)
    // Original values should be preserved
    expect(result.originalDownloadUrl).toBe(torrentUrl)
    expect(result.originalMagnetUrl).toBe(magnetUrl)
  })

  test('should handle mixed scenarios correctly', () => {
    // This simulates a case where both fields have magnet links (edge case)
    const magnetInDownloadUrl = 'magnet:?xt=urn:btih:DOWNLOAD123&dn=Download+Torrent'
    const separateMagnetUrl = 'magnet:?xt=urn:btih:SEPARATE456&dn=Separate+Torrent'
    const result = transformDownloadUrls(magnetInDownloadUrl, separateMagnetUrl, 'test-id')
    
    // The downloadUrl magnet should take precedence and move to magnetUrl
    expect(result.magnetUrl).toBe(magnetInDownloadUrl)
    expect(result.downloadUrl).toBe('')
    expect(result.originalDownloadUrl).toBe(magnetInDownloadUrl)
    expect(result.originalMagnetUrl).toBe(separateMagnetUrl)
  })
})