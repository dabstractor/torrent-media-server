// TMDB API types based on PRPs/ai_docs/tmdb_tvdb_integration.md
export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  popularity: number
  genre_ids: number[]
  adult: boolean
  original_language: string
  video: boolean
}

export interface TMDBMovieDetails extends TMDBMovie {
  belongs_to_collection: Collection | null
  budget: number
  genres: Genre[]
  homepage: string
  imdb_id: string
  production_companies: ProductionCompany[]
  production_countries: Country[]
  revenue: number
  runtime: number
  spoken_languages: Language[]
  status: string
  tagline: string
}

export interface Genre {
  id: number
  name: string
}

export interface Collection {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
}

export interface ProductionCompany {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

export interface Country {
  iso_3166_1: string
  name: string
}

export interface Language {
  english_name: string
  iso_639_1: string
  name: string
}

// TVDB API types based on PRPs/ai_docs/tmdb_tvdb_integration.md
export interface TVDBSeries {
  id: number
  name: string
  slug: string
  image: string
  firstAired: string
  lastAired: string
  nextAired: string
  status: {
    id: number
    name: string
  }
  originalCountry: string
  originalLanguage: string
  overview: string
  year: string
  averageRuntime: number
  score: number
  genres: Array<{
    id: number
    name: string
  }>
  networks: Array<{
    id: number
    name: string
  }>
}

export interface TVDBEpisode {
  id: number
  seriesId: number
  name: string
  aired: string
  runtime: number
  nameTranslations: string[]
  overviewTranslations: string[]
  overview: string
  image: string
  imageType: number
  isMovie: number
  seasons: Array<{
    id: number
    seriesId: number
    type: {
      id: number
      name: string
      type: string
    }
    number: number
    nameTranslations: string[]
    overviewTranslations: string[]
  }>
  number: number
  seasonNumber: number
  lastUpdated: string
  finaleType: string
}

// Radarr API types based on PRPs/ai_docs/radarr_sonarr_api_reference.md
export interface RadarrMovie {
  id: number
  title: string
  tmdbId: number
  imdbId: string
  year: number
  path: string
  monitored: boolean
  qualityProfileId: number
  minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'preDB'
  status: 'tba' | 'announced' | 'inCinemas' | 'released' | 'deleted'
  downloaded: boolean
  hasFile: boolean
  images: Array<{
    coverType: 'poster' | 'fanart' | 'banner'
    url: string
  }>
  ratings: {
    imdb: { value: number, votes: number }
    tmdb: { value: number, votes: number }
  }
}

export interface AddMovieRequest {
  tmdbId: number
  rootFolderPath: string
  qualityProfileId: number
  monitored: boolean
  minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'preDB'
  addOptions: {
    searchForMovie: boolean
    monitor: 'movieOnly'
  }
}

// Sonarr API types based on PRPs/ai_docs/radarr_sonarr_api_reference.md
export interface SonarrSeries {
  id: number
  title: string
  tvdbId: number
  imdbId: string
  year: number
  path: string
  monitored: boolean
  qualityProfileId: number
  languageProfileId: number
  seriesType: 'standard' | 'daily' | 'anime'
  status: 'continuing' | 'ended' | 'upcoming' | 'deleted'
  seasons: Array<{
    seasonNumber: number
    monitored: boolean
    statistics: {
      episodeFileCount: number
      episodeCount: number
      totalEpisodeCount: number
    }
  }>
  statistics: {
    seasonCount: number
    episodeFileCount: number
    episodeCount: number
    totalEpisodeCount: number
  }
}

export interface AddSeriesRequest {
  tvdbId: number
  title: string
  rootFolderPath: string
  qualityProfileId: number
  languageProfileId: number
  monitored: boolean
  seasonFolder: boolean
  seriesType: 'standard' | 'daily' | 'anime'
  addOptions: {
    searchForMissingEpisodes: boolean
    monitor: 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'latestSeason' | 'none'
  }
}

// Quality Profile types for both Radarr and Sonarr
export interface QualityProfile {
  id: number
  name: string
  upgradeAllowed: boolean
  cutoff: number
  items: Array<{
    quality: {
      id: number
      name: string
      source: string
      resolution: number
    }
    allowed: boolean
  }>
}

// Root Folder types for both Radarr and Sonarr
export interface RootFolder {
  id: number
  path: string
  accessible: boolean
  freeSpace: number
  unmappedFolders: Array<{
    name: string
    path: string
  }>
}

// Media Discovery types for the UI
export interface MediaSearchRequest {
  query: string
  type: 'movie' | 'tv'
  page?: number
  year?: number
  includeAdult?: boolean
}

export interface MediaSearchResponse<T> {
  results: T[]
  page: number
  total_pages: number
  total_results: number
}

// Media Request types for adding to monitoring
export interface MediaRequest {
  tmdbId?: number
  tvdbId?: number
  title: string
  year: number
  qualityProfileId: number
  rootFolderPath: string
  monitored: boolean
  type: 'movie' | 'tv'
}

// Enhanced Download type to show source (manual vs automated)
export interface EnhancedDownload {
  hash: string
  name: string
  size: number
  progress: number
  state: DownloadState
  eta: number
  downloadSpeed: number
  uploadSpeed: number
  priority: number
  category?: string
  addedTime: number
  completedTime?: number
  source: 'manual' | 'radarr' | 'sonarr' // NEW: Track download source
  mediaId?: number // NEW: Link to Radarr/Sonarr media ID if automated
  mediaType?: 'movie' | 'tv' // NEW: Type of media if automated
}

export type DownloadState =
  | 'downloading'
  | 'completed'
  | 'paused'
  | 'error'
  | 'queued'
  | 'seeding'

// Monitoring status for UI display
export interface MonitoringStatus {
  radarrConnected: boolean
  sonarrConnected: boolean
  radarrMovieCount: number
  sonarrSeriesCount: number
  lastSync: Date | null
}

// Service configuration for optional automation
export interface ServiceConfig {
  radarr?: {
    enabled: boolean
    apiKey: string
    baseUrl: string
  }
  sonarr?: {
    enabled: boolean
    apiKey: string
    baseUrl: string
  }
  tmdb?: {
    enabled: boolean
    apiKey: string
  }
  tvdb?: {
    enabled: boolean
    apiKey: string
  }
}