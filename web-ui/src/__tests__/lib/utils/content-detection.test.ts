import {
  detectContentType,
  isMovie,
  isSeries,
  getQBittorrentCategory,
  debugContentDetection
} from '@/lib/utils/content-detection'

describe('Content Detection', () => {
  describe('detectContentType', () => {
    it('should detect TV series from season/episode patterns', () => {
      const testCases = [
        'Game of Thrones S01E01 1080p',
        'Breaking Bad S05E14 HDTV',
        'The Office Season 1 Complete',
        'Friends 1x01 The Pilot',
        'Stranger Things S4.E9 Final Episode',
        'The Crown S01 - E05 Royal Wedding'
      ]

      testCases.forEach(title => {
        const result = detectContentType(title)
        expect(result.type).toBe('series')
        expect(result.qbittorrentCategory).toBe('sonarr')
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })

    it('should detect movies from year patterns and movie keywords', () => {
      const testCases = [
        'Avengers Endgame (2019) 4K UHD BluRay',
        'The Matrix 1999 1080p BluRay',
        'Dune 2021 IMAX HDR10',
        'Top Gun Maverick 2022 WEBRip',
        'Interstellar (2014) TrueHD Atmos'
      ]

      testCases.forEach(title => {
        const result = detectContentType(title)
        expect(result.type).toBe('movie')
        expect(result.qbittorrentCategory).toBe('radarr')
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })

    it('should use category hints for detection', () => {
      const movieResult = detectContentType('Unknown Title', 'Movie HD')
      expect(movieResult.type).toBe('movie')
      expect(movieResult.qbittorrentCategory).toBe('radarr')

      const tvResult = detectContentType('Unknown Title', 'TV Show')
      expect(tvResult.type).toBe('series')
      expect(tvResult.qbittorrentCategory).toBe('sonarr')
    })

    it('should handle ambiguous content gracefully', () => {
      const result = detectContentType('Random Software Package', 'PC/Software')
      expect(result.type).toBe('unknown')
      expect(result.qbittorrentCategory).toBeNull()
      expect(result.confidence).toBeLessThan(0.6)
    })

    it('should apply anti-patterns correctly', () => {
      const result = detectContentType('Music Album Collection Pack', 'Audio')
      expect(result.type).toBe('unknown')
      expect(result.qbittorrentCategory).toBeNull()
    })

    it('should provide detailed detection hints', () => {
      const result = debugContentDetection('Game of Thrones S01E01 (2011) Complete Series', 'TV Show')
      expect(result.hints.length).toBeGreaterThan(0)
      expect(result.hints.some(hint => hint.includes('TV pattern'))).toBe(true)
      expect(result.hints.some(hint => hint.includes('TV category'))).toBe(true)
    })
  })

  describe('isMovie', () => {
    it('should return true for movie titles', () => {
      expect(isMovie('Avengers Endgame (2019) 4K')).toBe(true)
      expect(isMovie('The Matrix 1999 BluRay')).toBe(true)
      expect(isMovie('Unknown Title', 'Movie HD')).toBe(true)
    })

    it('should return false for TV series titles', () => {
      expect(isMovie('Game of Thrones S01E01')).toBe(false)
      expect(isMovie('Breaking Bad Season 1')).toBe(false)
      expect(isMovie('Friends 1x01')).toBe(false)
    })
  })

  describe('isSeries', () => {
    it('should return true for TV series titles', () => {
      expect(isSeries('Game of Thrones S01E01')).toBe(true)
      expect(isSeries('Breaking Bad Season 1')).toBe(true)
      expect(isSeries('The Office Complete Series')).toBe(true)
    })

    it('should return false for movie titles', () => {
      expect(isSeries('Avengers Endgame (2019)')).toBe(false)
      expect(isSeries('The Matrix 1999')).toBe(false)
    })
  })

  describe('getQBittorrentCategory', () => {
    it('should return appropriate categories for high confidence detections', () => {
      expect(getQBittorrentCategory('Game of Thrones S01E01')).toBe('sonarr')
      expect(getQBittorrentCategory('Avengers Endgame (2019)')).toBe('radarr')
    })

    it('should return null for low confidence detections', () => {
      expect(getQBittorrentCategory('Random Software Package')).toBeNull()
      expect(getQBittorrentCategory('Ambiguous Title')).toBeNull()
    })

    it('should consider both title and category', () => {
      expect(getQBittorrentCategory('Unknown Title', 'Movie HD')).toBe('radarr')
      expect(getQBittorrentCategory('Unknown Title', 'TV Show')).toBe('sonarr')
    })
  })

  describe('Real-world test cases', () => {
    it('should handle complex movie titles correctly', () => {
      const testCases = [
        {
          title: 'Spider-Man.No.Way.Home.2021.2160p.4K.WEB.x265-NAISU',
          expectedType: 'movie',
          expectedCategory: 'radarr'
        },
        {
          title: 'The.Batman.2022.IMAX.1080p.WEBRip.x264-RARBG',
          expectedType: 'movie',
          expectedCategory: 'radarr'
        },
        {
          title: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265-TERMINAL',
          expectedType: 'movie',
          expectedCategory: 'radarr'
        }
      ]

      testCases.forEach(({ title, expectedType, expectedCategory }) => {
        const result = detectContentType(title)
        expect(result.type).toBe(expectedType)
        expect(result.qbittorrentCategory).toBe(expectedCategory)
      })
    })

    it('should handle complex TV series titles correctly', () => {
      const testCases = [
        {
          title: 'The.Last.of.Us.S01E01.2160p.HBO.WEB-DL.x265-GGEZ',
          expectedType: 'series',
          expectedCategory: 'sonarr'
        },
        {
          title: 'House.of.the.Dragon.S01.Complete.2160p.HMAX.WEB-DL.x265-GGEZ',
          expectedType: 'series',
          expectedCategory: 'sonarr'
        },
        {
          title: 'Wednesday.2022.S01E08.A.Murder.of.Woes.1080p.NF.WEB-DL.x264-GGEZ',
          expectedType: 'series',
          expectedCategory: 'sonarr'
        },
        {
          title: 'Stranger Things Season 4 Complete 2160p Netflix WEBRip',
          expectedType: 'series',
          expectedCategory: 'sonarr'
        }
      ]

      testCases.forEach(({ title, expectedType, expectedCategory }) => {
        const result = detectContentType(title)
        expect(result.type).toBe(expectedType)
        expect(result.qbittorrentCategory).toBe(expectedCategory)
      })
    })

    it('should handle edge cases appropriately', () => {
      // Documentary series
      const docSeries = detectContentType('Planet Earth S02E01 Documentary')
      expect(docSeries.type).toBe('series') // Should still detect as series despite documentary keyword

      // Movie collection/pack (should not be movie)
      const moviePack = detectContentType('Marvel Movies Collection Pack (2008-2023)')
      expect(moviePack.type).not.toBe('movie') // Pack should reduce movie confidence

      // Software with version numbers
      const software = detectContentType('Adobe Photoshop 2023 v24.0', 'PC/Software')
      expect(software.type).toBe('unknown')
      expect(software.qbittorrentCategory).toBeNull()
    })
  })
})