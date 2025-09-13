# Radarr & Sonarr API v3 Reference Guide

## Authentication Pattern
Both services use identical API key authentication:
```typescript
headers: {
  'X-Api-Key': process.env.RADARR_API_KEY || process.env.SONARR_API_KEY,
  'Content-Type': 'application/json'
}
```

## Critical API Endpoints

### Radarr Movie Management
```typescript
// Add movie with monitoring
POST /api/v3/movie
{
  "tmdbId": 482321,
  "rootFolderPath": "/movies",
  "qualityProfileId": 1,
  "monitored": true,
  "minimumAvailability": "announced", // "announced", "inCinemas", "released", "preDB"
  "addOptions": {
    "searchForMovie": true,
    "monitor": "movieOnly"
  }
}

// Search for movies by title
GET /api/v3/movie/lookup?term=inception

// Get quality profiles
GET /api/v3/qualityprofile

// Get root folders
GET /api/v3/rootfolder

// Manual movie search
POST /api/v3/command
{
  "name": "MoviesSearch",
  "movieIds": [1]
}
```

### Sonarr Series Management
```typescript
// Add series with monitoring
POST /api/v3/series
{
  "tvdbId": 12345,
  "rootFolderPath": "/tv",
  "qualityProfileId": 1,
  "languageProfileId": 1,
  "monitored": true,
  "seasonFolder": true,
  "seriesType": "standard", // "standard", "daily", "anime"
  "addOptions": {
    "searchForMissingEpisodes": true,
    "monitor": "all" // "all", "future", "missing", "existing", "pilot", "firstSeason", "latestSeason", "none"
  }
}

// Search for series by title
GET /api/v3/series/lookup?term=breaking%20bad

// Get episodes for series
GET /api/v3/episode?seriesId=1

// Manual episode search
POST /api/v3/command
{
  "name": "EpisodeSearch",
  "episodeIds": [1, 2, 3]
}
```

## Data Structures

### Movie Object (Radarr)
```typescript
interface RadarrMovie {
  id: number
  title: string
  tmdbId: number
  imdbId: string
  year: number
  path: string
  monitored: boolean
  qualityProfileId: number
  minimumAvailability: string
  status: string // "tba", "announced", "inCinemas", "released", "deleted"
  downloaded: boolean
  hasFile: boolean
  images: Array<{
    coverType: "poster" | "fanart" | "banner"
    url: string
  }>
  ratings: {
    imdb: { value: number, votes: number }
    tmdb: { value: number, votes: number }
  }
}
```

### Series Object (Sonarr)
```typescript
interface SonarrSeries {
  id: number
  title: string
  tvdbId: number
  imdbId: string
  year: number
  path: string
  monitored: boolean
  qualityProfileId: number
  languageProfileId: number
  seriesType: "standard" | "daily" | "anime"
  status: "continuing" | "ended" | "upcoming" | "deleted"
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
```

## Quality Profile Structure
```typescript
interface QualityProfile {
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
```

## Error Handling Patterns
- 401: Invalid API key
- 404: Resource not found (movie/series doesn't exist)
- 409: Conflict (movie/series already exists)
- 422: Validation error (invalid data in request)

## Rate Limiting
- No official limits documented
- Implement client-side throttling for bulk operations
- Use exponential backoff for failed requests