/**
 * Content Detection Utilities
 *
 * Provides robust detection of movie vs TV series content based on:
 * - Title patterns (season/episode indicators)
 * - Category hints from indexers
 * - Year patterns and title structure
 */

export interface ContentDetectionResult {
  type: 'movie' | 'series' | 'unknown'
  confidence: number // 0-1 score indicating detection confidence
  qbittorrentCategory: 'radarr' | 'sonarr' | null
  hints: string[] // Array of detection clues for debugging
}

/**
 * Comprehensive patterns for TV series detection
 */
const TV_PATTERNS = {
  // Standard season/episode patterns
  seasonEpisode: [
    /S\d{1,2}E\d{1,2}/i,           // S01E01, S1E1
    /Season\s*\d+/i,               // Season 1, Season 01
    /Episode\s*\d+/i,              // Episode 1, Episode 01
    /\b\d{1,2}x\d{1,2}\b/i,       // 1x01, 12x34
    /S\d{1,2}\s*-\s*E\d{1,2}/i,   // S01 - E01
    /S\d{1,2}\.\d{1,2}/i,         // S01.01
  ],

  // Series-specific keywords
  keywords: [
    /\bseason\b/i,
    /\bepisode\b/i,
    /\bseries\b/i,
    /\bcomplete\s+series\b/i,
    /\btv\s+show\b/i,
    /\bmini\s*series\b/i,
    /\blimited\s+series\b/i,
    /\btv\s+rip\b/i,
    /\bhdtv\b/i,
  ],

  // Category indicators
  categories: [
    /tv/i,
    /television/i,
    /show/i,
    /series/i,
    /episode/i,
  ]
}

/**
 * Patterns that indicate movie content
 */
const MOVIE_PATTERNS = {
  // Year patterns typical for movies
  yearPattern: [
    /\(\d{4}\)/,                   // (2023)
    /\b\d{4}\b(?!\s*-\s*\d{4})/,  // 2023 (but not year ranges like 2020-2023)
  ],

  // Movie-specific keywords
  keywords: [
    /\bmovie\b/i,
    /\bfilm\b/i,
    /\bcinema\b/i,
    /\bfeature\b/i,
    /\bbluray\b/i,
    /\bdvdrip\b/i,
    /\bwebrip\b/i,
    /\bcam\b/i,
    /\bts\b/i,
    /\bhdrip\b/i,
  ],

  // Category indicators
  categories: [
    /movie/i,
    /film/i,
    /cinema/i,
    /dvd/i,
    /bluray/i,
    /theatrical/i,
  ],

  // Quality indicators more common in movies
  quality: [
    /\b4k\b/i,
    /\buhd\b/i,
    /\bimax\b/i,
    /\bdolby\b/i,
    /\batmos\b/i,
    /\bhdr\b/i,
    /\btruehd\b/i,
    /\bdts\b/i,
  ]
}

/**
 * Anti-patterns that reduce confidence
 */
const ANTI_PATTERNS = {
  // Patterns that make series detection less likely
  antiSeries: [
    /\bdocumentary\b/i,
    /\bsoundtrack\b/i,
    /\bgame\b/i,
    /\bsoftware\b/i,
    /\book\b/i,
    /\bmusic\b/i,
    /\baudio\b/i,
  ],

  // Patterns that make movie detection less likely
  antiMovie: [
    /\bpack\b/i,              // TV show packs
    /\bcollection\b/i,        // Could be series collection
    /\bvol\b/i,              // Volume indicator
    /\bpart\s*\d+/i,         // Multi-part series
  ]
}

/**
 * Detect content type based on title and category
 */
export function detectContentType(title: string, category?: string): ContentDetectionResult {
  const hints: string[] = []
  let movieScore = 0
  let seriesScore = 0

  // Normalize inputs
  const normalizedTitle = title.toLowerCase()
  const normalizedCategory = category?.toLowerCase() || ''

  // Check for TV patterns
  TV_PATTERNS.seasonEpisode.forEach(pattern => {
    if (pattern.test(title)) {
      seriesScore += 3
      hints.push(`TV pattern: ${pattern.source}`)
    }
  })

  TV_PATTERNS.keywords.forEach(pattern => {
    if (pattern.test(normalizedTitle)) {
      seriesScore += 2
      hints.push(`TV keyword: ${pattern.source}`)
    }
  })

  TV_PATTERNS.categories.forEach(pattern => {
    if (pattern.test(normalizedCategory)) {
      seriesScore += 2
      hints.push(`TV category: ${pattern.source}`)
    }
  })

  // Check for movie patterns
  MOVIE_PATTERNS.yearPattern.forEach(pattern => {
    if (pattern.test(title)) {
      movieScore += 2
      hints.push(`Movie year: ${pattern.source}`)
    }
  })

  MOVIE_PATTERNS.keywords.forEach(pattern => {
    if (pattern.test(normalizedTitle)) {
      movieScore += 2
      hints.push(`Movie keyword: ${pattern.source}`)
    }
  })

  MOVIE_PATTERNS.categories.forEach(pattern => {
    if (pattern.test(normalizedCategory)) {
      movieScore += 2
      hints.push(`Movie category: ${pattern.source}`)
    }
  })

  MOVIE_PATTERNS.quality.forEach(pattern => {
    if (pattern.test(normalizedTitle)) {
      movieScore += 1
      hints.push(`Movie quality: ${pattern.source}`)
    }
  })

  // Apply anti-patterns
  ANTI_PATTERNS.antiSeries.forEach(pattern => {
    if (pattern.test(normalizedTitle)) {
      seriesScore -= 1
      hints.push(`Anti-series: ${pattern.source}`)
    }
  })

  ANTI_PATTERNS.antiMovie.forEach(pattern => {
    if (pattern.test(normalizedTitle)) {
      movieScore -= 1
      hints.push(`Anti-movie: ${pattern.source}`)
    }
  })

  // Calculate result
  const totalScore = Math.max(movieScore + seriesScore, 1) // Avoid division by zero
  const movieConfidence = movieScore / totalScore
  const seriesConfidence = seriesScore / totalScore

  // Determine type and category
  let type: 'movie' | 'series' | 'unknown'
  let qbittorrentCategory: 'radarr' | 'sonarr' | null
  let confidence: number

  if (seriesScore > movieScore && seriesScore >= 2) {
    type = 'series'
    qbittorrentCategory = 'sonarr'
    confidence = seriesConfidence
    hints.push(`Detected as series (score: ${seriesScore} vs ${movieScore})`)
  } else if (movieScore > seriesScore && movieScore >= 2) {
    type = 'movie'
    qbittorrentCategory = 'radarr'
    confidence = movieConfidence
    hints.push(`Detected as movie (score: ${movieScore} vs ${seriesScore})`)
  } else {
    type = 'unknown'
    qbittorrentCategory = null
    confidence = 0
    hints.push(`Unable to determine type (movie: ${movieScore}, series: ${seriesScore})`)
  }

  return {
    type,
    confidence,
    qbittorrentCategory,
    hints
  }
}

/**
 * Legacy compatibility function for existing TorrentCard usage
 */
export function isMovie(title: string, category?: string): boolean {
  const result = detectContentType(title, category)
  return result.type === 'movie'
}

/**
 * Legacy compatibility function for existing TorrentCard usage
 */
export function isSeries(title: string, category?: string): boolean {
  const result = detectContentType(title, category)
  return result.type === 'series'
}

/**
 * Get appropriate qBittorrent category for a torrent
 */
export function getQBittorrentCategory(title: string, category?: string): 'radarr' | 'sonarr' | null {
  const result = detectContentType(title, category)

  // Only return category if we have reasonable confidence
  if (result.confidence >= 0.6) {
    return result.qbittorrentCategory
  }

  return null
}

/**
 * Debug function to get detailed detection information
 */
export function debugContentDetection(title: string, category?: string): ContentDetectionResult {
  return detectContentType(title, category)
}