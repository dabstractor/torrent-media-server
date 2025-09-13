# TMDB & TVDB Integration Patterns

## TMDB API v3 Essential Patterns

### Authentication
```typescript
// Bearer token (recommended)
headers: {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
}

// Or API key
const API_KEY = process.env.TMDB_API_KEY
```

### Core Movie Endpoints
```typescript
// Popular movies
GET /movie/popular?page=1

// Movie search
GET /search/movie?query={query}&page=1

// Movie details
GET /movie/{movie_id}?append_to_response=credits,images,videos

// Discover with filters
GET /discover/movie?sort_by=popularity.desc&with_genres=28&primary_release_year=2023
```

### Image URL Construction
```typescript
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/'
const posterSizes = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original']
const backdropSizes = ['w300', 'w780', 'w1280', 'original']

// Usage
const posterUrl = `${TMDB_IMAGE_BASE}w500${movie.poster_path}`
const backdropUrl = `${TMDB_IMAGE_BASE}w1280${movie.backdrop_path}`
```

### TypeScript Movie Interface
```typescript
interface TMDBMovie {
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

interface TMDBMovieDetails extends TMDBMovie {
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
```

## TVDB API v4 Essential Patterns

### Authentication Flow
```typescript
// Login to get JWT token
POST /login
{
  "apikey": "YOUR_API_KEY",
  "pin": "USER_PIN" // For subscriber accounts
}

// Use JWT in subsequent requests
headers: {
  'Authorization': 'Bearer JWT_TOKEN'
}
```

### Core TV Series Endpoints
```typescript
// Search series
GET /search?query={query}&type=series&limit=25

// Series details
GET /series/{id}?meta=translations

// Series episodes
GET /series/{id}/episodes/{season-type}?page=0

// Episode details
GET /episodes/{id}
```

### TypeScript Series Interface
```typescript
interface TVDBSeries {
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
```

## Client Implementation Pattern

### Unified Media Search Client
```typescript
class MediaDiscoveryClient {
  private tmdb: TMDBClient
  private tvdb: TVDBClient

  constructor(tmdbToken: string, tvdbApiKey: string) {
    this.tmdb = new TMDBClient(tmdbToken)
    this.tvdb = new TVDBClient(tvdbApiKey)
  }

  async searchMovies(query: string): Promise<TMDBMovie[]> {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.tmdb.token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const data = await response.json()
    return data.results
  }

  async searchTV(query: string): Promise<TVDBSeries[]> {
    const response = await fetch(
      `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(query)}&type=series`,
      {
        headers: {
          'Authorization': `Bearer ${this.tvdb.token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const data = await response.json()
    return data.data
  }
}
```

## Rate Limiting & Caching

### TMDB Rate Limiting
- ~40 requests per second by IP
- No daily limits
- Implement client-side queue for burst protection

### TVDB Rate Limiting
- No official limits documented
- JWT tokens expire (implement refresh logic)
- Cache responses aggressively due to subscription costs

### Caching Strategy
```typescript
const CACHE_TTL = {
  movie_details: 24 * 60 * 60, // 1 day
  series_details: 7 * 24 * 60 * 60, // 1 week
  search_results: 60 * 60, // 1 hour
  popular_lists: 4 * 60 * 60, // 4 hours
}
```

## Error Handling
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (maxRetries > 0 && error.response?.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, delay))
      return withRetry(fn, maxRetries - 1, delay * 2)
    }
    throw error
  }
}
```