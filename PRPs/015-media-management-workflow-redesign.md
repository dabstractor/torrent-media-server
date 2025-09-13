name: "015 - Media Management Workflow Redesign: Proper Radarr/Sonarr Integration"
description: |

---

## Goal

**Feature Goal**: Enhance existing manual torrent search interface with optional Radarr/Sonarr integration capabilities while maintaining the primary "search, download, process, watch" workflow.

**Deliverable**: Enhanced web UI that preserves current Prowlarr torrent search as the main interface, adds optional TMDB/TVDB media discovery features, integrates Radarr/Sonarr for users who want automation, and maintains full qBittorrent download visibility and control.

**Success Definition**: Users can continue using manual torrent search as primary workflow, optionally discover media through TMDB/TVDB integration, choose to add content to Radarr/Sonarr for automation, and maintain complete visibility into qBittorrent downloads with processing status.

## User Persona

**Target User**: Home media server administrator who primarily wants manual control with optional automation features

**Primary Use Case**: User searches Prowlarr for "The Dark Knight 2008 1080p", reviews torrent options, selects best quality/seeder ratio, adds to qBittorrent, monitors download progress, and watches via Plex when complete

**Secondary Use Case**: User optionally searches TMDB for "The Dark Knight", sees it's not available in high quality torrents yet, clicks "Monitor with Radarr" to automatically download when better releases appear

**User Journey**:
1. **PRIMARY**: Search torrents → Select quality → Download → Monitor progress → Watch
2. **OPTIONAL**: Browse TMDB/TVDB → Add to monitoring → Automatic future downloads
3. **ALWAYS**: Full visibility into qBittorrent downloads and processing status

**Pain Points Addressed**:
- **Maintains manual control** while adding optional automation
- **Preserves torrent selection expertise** for quality-conscious users
- **Adds media discovery** without replacing torrent search workflow
- **Provides download monitoring** with full qBittorrent integration

## Why

- **Manual workflow is primary strength**: Users want control over torrent selection, quality decisions, and download management
- **Automation should be optional**: Some content benefits from monitoring (ongoing series, future releases), but manual search should remain the main interface
- **qBittorrent visibility essential**: Users need full download progress, ratio management, and processing status
- **Underutilized infrastructure**: Radarr/Sonarr exist but provide no integration with the primary workflow

## What

Enhance the existing torrent search interface with optional media management capabilities:

### Primary Features (Enhanced Manual Workflow)
- **Enhanced Torrent Search**: Maintain current Prowlarr search with improved filters and sorting
- **qBittorrent Integration**: Full download progress, queue management, and processing status
- **Download Monitoring**: Real-time status, ratios, and completion tracking
- **File Processing**: Visibility into download completion and Plex integration status

### Secondary Features (Optional Automation)
- **Media Discovery**: TMDB/TVDB search for content identification and metadata
- **Optional Monitoring**: "Add to Radarr/Sonarr" buttons for users who want automation
- **Hybrid Workflow**: Combine manual torrent selection with automated monitoring for series
- **Calendar Integration**: View upcoming releases for monitored content

### Success Criteria

- [ ] **PRIMARY**: Current torrent search workflow remains fast and intuitive
- [ ] **PRIMARY**: Full qBittorrent download visibility with progress tracking
- [ ] **SECONDARY**: Users can optionally search TMDB/TVDB for content discovery
- [ ] **SECONDARY**: Optional "Monitor with Radarr/Sonarr" buttons for automation
- [ ] **INTEGRATION**: Downloads page shows both manual torrents and automated content
- [ ] **ENHANCEMENT**: Improved torrent search with better filtering and metadata
- [ ] **VISIBILITY**: Clear processing status from download → Plex library

## All Needed Context

### Context Completeness Check

_This PRP provides comprehensive API documentation, client patterns, UI component examples, testing approaches, and integration patterns needed for successful implementation without prior Radarr/Sonarr knowledge._

### Documentation & References

```yaml
- docfile: PRPs/ai_docs/radarr_sonarr_api_reference.md
  why: Complete API v3 reference with authentication, endpoints, data structures, and error handling
  section: All sections critical for implementation

- docfile: PRPs/ai_docs/tmdb_tvdb_integration.md
  why: TMDB/TVDB API patterns, authentication, rate limiting, and TypeScript interfaces
  section: Client implementation patterns and caching strategies

- url: https://developer.themoviedb.org/docs/getting-started
  why: Official TMDB API documentation for movie search and metadata
  critical: Bearer token authentication and image URL construction

- url: https://thetvdb.github.io/v4-api/
  why: TVDB API v4 Swagger documentation for TV series data
  critical: JWT authentication flow and series lookup endpoints

- file: web-ui/src/lib/api/clients/ProwlarrClient.ts
  why: Existing API client pattern with error handling and authentication
  pattern: Class-based client with private request method and public API methods
  gotcha: Uses X-Api-Key header authentication

- file: web-ui/src/app/api/prowlarr/[...path]/route.ts
  why: Dynamic proxy route pattern for external service integration
  pattern: Catch-all route with request forwarding and timeout handling
  gotcha: Must handle both query parameters and request body forwarding

- file: web-ui/src/components/search/SearchForm.tsx
  why: Form component pattern with URL state synchronization
  pattern: useState for form data, useCallback for handlers, URL parameter updates
  gotcha: Debouncing required for search inputs to prevent excessive API calls

- file: web-ui/src/components/search/TorrentCard.tsx
  why: Card component pattern with actions and metadata display
  pattern: Props interface, conditional rendering, action callbacks
  gotcha: Loading states and disabled states for async actions

- file: web-ui/src/hooks/use-search.ts
  why: SWR data fetching pattern with real-time updates
  pattern: SWR configuration, debounced parameters, cache management
  gotcha: Cache key generation must be consistent for proper deduplication
```

### Current Codebase tree

```bash
web-ui/src/
├── app/
│   ├── api/
│   │   ├── prowlarr/[...path]/route.ts    # Proxy pattern to follow
│   │   ├── qbittorrent/[...path]/route.ts # Authentication pattern
│   │   ├── status/route.ts               # Health check pattern
│   │   └── plex/route.ts                 # Direct integration pattern
│   ├── page.tsx                          # Current search interface
│   ├── downloads/page.tsx                # Downloads dashboard
│   └── settings/page.tsx                 # Settings interface
├── components/
│   ├── search/
│   │   ├── SearchForm.tsx               # Form pattern to adapt
│   │   ├── TorrentCard.tsx              # Card pattern to adapt
│   │   └── SearchResults.tsx            # Results pattern to adapt
│   ├── downloads/
│   │   ├── DownloadCard.tsx             # Card component pattern
│   │   └── DownloadsDashboard.tsx       # Dashboard layout pattern
│   └── common/
│       ├── LoadingSpinner.tsx           # Loading state pattern
│       └── ErrorMessage.tsx             # Error handling pattern
├── hooks/
│   ├── use-search.ts                    # SWR pattern to follow
│   ├── use-downloads.ts                 # Data fetching pattern
│   └── use-service-status.ts            # Health monitoring pattern
├── lib/
│   ├── api/
│   │   ├── clients/
│   │   │   ├── ProwlarrClient.ts        # Client class pattern
│   │   │   └── QBittorrentClient.ts     # Auth client pattern
│   │   ├── errors.ts                    # Error handling utilities
│   │   └── search.ts                    # Search API implementation
│   └── types/
│       └── index.ts                     # Type definitions
```

### Desired Codebase tree with files to be added

```bash
web-ui/src/
├── app/
│   ├── api/
│   │   ├── radarr/[...path]/route.ts           # NEW: Optional Radarr proxy route
│   │   ├── sonarr/[...path]/route.ts           # NEW: Optional Sonarr proxy route
│   │   ├── tmdb/search/route.ts                # NEW: TMDB search endpoint
│   │   └── tvdb/search/route.ts                # NEW: TVDB search endpoint
│   ├── page.tsx                                # ENHANCE: Add optional media discovery tab
│   └── downloads/page.tsx                      # ENHANCE: Show both manual/automated downloads
├── components/
│   ├── search/
│   │   ├── SearchForm.tsx                      # ENHANCE: Add media discovery toggle
│   │   ├── TorrentCard.tsx                     # ENHANCE: Add "Monitor with Radarr/Sonarr" buttons
│   │   ├── SearchResults.tsx                   # ENHANCE: Support both torrent and media results
│   │   └── MediaDiscoveryTab.tsx               # NEW: TMDB/TVDB search interface
│   ├── downloads/
│   │   ├── DownloadCard.tsx                    # ENHANCE: Show source (manual/automated)
│   │   └── DownloadsDashboard.tsx              # ENHANCE: Include monitoring status
│   └── media/
│       ├── MovieCard.tsx                       # NEW: TMDB movie display with monitor option
│       ├── TVSeriesCard.tsx                    # NEW: TVDB series display with monitor option
│       ├── AddToRadarrModal.tsx                # NEW: Optional movie monitoring setup
│       └── AddToSonarrModal.tsx                # NEW: Optional series monitoring setup
├── hooks/
│   ├── use-search.ts                           # ENHANCE: Support media discovery mode
│   ├── use-downloads.ts                        # ENHANCE: Include Radarr/Sonarr status
│   ├── use-tmdb-search.ts                      # NEW: TMDB movie search
│   ├── use-tvdb-search.ts                      # NEW: TVDB series search
│   └── use-monitoring.ts                       # NEW: Optional monitoring data
├── lib/
│   ├── api/
│   │   ├── clients/
│   │   │   ├── RadarrClient.ts                 # NEW: Optional Radarr integration
│   │   │   ├── SonarrClient.ts                 # NEW: Optional Sonarr integration
│   │   │   ├── TMDBClient.ts                   # NEW: TMDB API client
│   │   │   └── TVDBClient.ts                   # NEW: TVDB API client
│   │   └── search.ts                           # ENHANCE: Add media discovery support
│   └── types/
│       ├── media.ts                            # NEW: Media discovery types
│       └── index.ts                            # ENHANCE: Include media types
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Network isolation requirements from CLAUDE.md
// qBittorrent MUST remain VPN-isolated via network_mode: "container:vpn"
// Radarr/Sonarr use media_network and connect to qBittorrent via nginx proxy

// CRITICAL: API Authentication patterns differ
// Radarr/Sonarr: X-Api-Key header
// TMDB: Bearer token OR api_key parameter
// TVDB: JWT tokens with expiration (requires refresh logic)

// CRITICAL: TMDB rate limiting
// ~40 requests per second by IP
// Implement client-side queuing for burst requests

// CRITICAL: Docker service URLs
// Internal: http://radarr:7878/api/v3/
// Internal: http://sonarr:8989/api/v3/
// Proxy: http://nginx-proxy:7878 (for qBittorrent connection)

// CRITICAL: SWR cache key consistency
// Cache keys must include all parameters for proper deduplication
// Use JSON.stringify for object parameters in cache keys

// GOTCHA: Quality profile IDs are installation-specific
// Always fetch quality profiles dynamically, never hardcode IDs

// GOTCHA: Root folder paths must exist and be writable
// Validate root folder configuration before allowing media addition

// GOTCHA: TMDB poster paths are relative
// Must prepend https://image.tmdb.org/t/p/w500 for display
```

## Implementation Blueprint

### Data models and structure

Create comprehensive TypeScript interfaces for type safety across all integrations.

```typescript
// Core media management types
interface MediaRequest {
  tmdbId?: number
  tvdbId?: number
  title: string
  year: number
  qualityProfileId: number
  rootFolderPath: string
  monitored: boolean
}

interface RadarrMovie {
  id: number
  tmdbId: number
  title: string
  year: number
  monitored: boolean
  downloaded: boolean
  qualityProfileId: number
  minimumAvailability: 'announced' | 'inCinemas' | 'released' | 'preDB'
}

interface SonarrSeries {
  id: number
  tvdbId: number
  title: string
  year: number
  monitored: boolean
  seriesType: 'standard' | 'daily' | 'anime'
  qualityProfileId: number
  languageProfileId: number
  seasons: Array<{
    seasonNumber: number
    monitored: boolean
  }>
}

interface QualityProfile {
  id: number
  name: string
  upgradeAllowed: boolean
  cutoff: number
  items: Array<{
    quality: { id: number, name: string }
    allowed: boolean
  }>
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE web-ui/src/lib/types/media.ts
  - IMPLEMENT: TypeScript interfaces for TMDB/TVDB responses and media discovery
  - FOLLOW pattern: web-ui/src/lib/types/index.ts (export structure, interface naming)
  - NAMING: PascalCase for interfaces, camelCase for properties
  - PLACEMENT: Consolidated media types in web-ui/src/lib/types/media.ts
  - REFERENCE: PRPs/ai_docs/tmdb_tvdb_integration.md for data structures

Task 2: CREATE web-ui/src/lib/api/clients/TMDBClient.ts, TVDBClient.ts
  - IMPLEMENT: External API clients for media discovery (NOT automation)
  - FOLLOW pattern: web-ui/src/lib/api/clients/ProwlarrClient.ts (request method structure)
  - NAMING: TMDBClient, TVDBClient classes with search methods
  - DEPENDENCIES: Import types from Task 1
  - PLACEMENT: Client classes in web-ui/src/lib/api/clients/
  - PURPOSE: Search and metadata only, not automation

Task 3: CREATE web-ui/src/app/api/tmdb/search/route.ts, tvdb/search/route.ts
  - IMPLEMENT: Search-only API routes for media discovery
  - FOLLOW pattern: web-ui/src/app/api/prowlarr/[...path]/route.ts (proxy implementation)
  - NAMING: Specific search endpoints, not full proxy routes
  - DEPENDENCIES: TMDB/TVDB API keys in environment
  - PLACEMENT: API routes in web-ui/src/app/api/{service}/search/
  - SCOPE: Search functionality only, automation routes optional

Task 4: CREATE web-ui/src/hooks/use-tmdb-search.ts, use-tvdb-search.ts
  - IMPLEMENT: Search hooks with debouncing for media discovery
  - FOLLOW pattern: web-ui/src/hooks/use-search.ts (debouncing, URL state)
  - NAMING: use{Service}Search hook functions for discovery
  - DEPENDENCIES: Import client classes from Task 2
  - PLACEMENT: Custom hooks in web-ui/src/hooks/
  - PURPOSE: Enhance existing search with media identification

Task 5: CREATE web-ui/src/components/search/MediaDiscoveryTab.tsx
  - IMPLEMENT: Tab component for media discovery within existing search interface
  - FOLLOW pattern: web-ui/src/components/search/SearchForm.tsx (tab structure if exists)
  - NAMING: MediaDiscoveryTab component with TMDB/TVDB search
  - DEPENDENCIES: Import hooks from Task 4
  - PLACEMENT: Search components in web-ui/src/components/search/
  - INTEGRATION: Add as tab/toggle to existing search interface

Task 6: CREATE web-ui/src/components/media/MovieCard.tsx, TVSeriesCard.tsx
  - IMPLEMENT: Media cards with "Monitor with Radarr/Sonarr" option buttons
  - FOLLOW pattern: web-ui/src/components/search/TorrentCard.tsx (card layout, action buttons)
  - NAMING: MovieCard, TVSeriesCard components with optional monitoring
  - DEPENDENCIES: Import types from Task 1
  - PLACEMENT: Media components in web-ui/src/components/media/
  - DESIGN: Show TMDB/TVDB data with OPTIONAL monitoring buttons

Task 7: ENHANCE web-ui/src/components/search/SearchForm.tsx
  - MODIFY: Add toggle between "Torrent Search" and "Media Discovery" modes
  - FOLLOW pattern: Existing form structure and state management
  - ADD: Mode toggle, integrate MediaDiscoveryTab from Task 5
  - PRESERVE: Existing Prowlarr search as default/primary mode
  - PLACEMENT: Enhance existing search form component

Task 8: ENHANCE web-ui/src/app/page.tsx
  - MODIFY: Support both torrent search and media discovery modes
  - FOLLOW pattern: Existing search page structure
  - ADD: Mode switching, media discovery results display
  - PRESERVE: Existing torrent search as primary interface
  - PLACEMENT: Enhance main search page component

Task 9: ENHANCE web-ui/src/components/search/TorrentCard.tsx
  - MODIFY: Add optional "Monitor with Radarr/Sonarr" buttons if content matches media
  - FOLLOW pattern: Existing card structure and action buttons
  - ADD: Conditional monitoring options based on content detection
  - PRESERVE: Existing "Add" button functionality as primary action
  - PLACEMENT: Enhance existing torrent card component

Task 10: CREATE OPTIONAL web-ui/src/lib/api/clients/RadarrClient.ts, SonarrClient.ts
  - IMPLEMENT: Optional automation client classes (only if monitoring features needed)
  - FOLLOW pattern: web-ui/src/lib/api/clients/ProwlarrClient.ts (class structure, error handling)
  - NAMING: RadarrClient, SonarrClient classes
  - DEPENDENCIES: Environment variables for API keys
  - PLACEMENT: Client classes in web-ui/src/lib/api/clients/
  - PURPOSE: Support monitoring buttons from Task 6 and 9

Task 11: ENHANCE web-ui/src/components/downloads/DownloadCard.tsx
  - MODIFY: Show source of download (manual torrent vs automated via Radarr/Sonarr)
  - FOLLOW pattern: Existing card structure and metadata display
  - ADD: Source indicator, processing status
  - PRESERVE: Existing download progress and control functionality
  - PLACEMENT: Enhance existing download card component
```

### Implementation Patterns & Key Details

```typescript
// Service Client Pattern (follow ProwlarrClient.ts)
export class RadarrClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'http://radarr:7878') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v3${endpoint}`
    const headers = new Headers(options.headers)
    headers.set('X-Api-Key', this.apiKey)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(url, { ...options, headers })
    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.statusText}`)
    }
    return response.json()
  }

  async getMovies(): Promise<RadarrMovie[]> {
    return this.request<RadarrMovie[]>('/movie')
  }

  async addMovie(movieData: AddMovieRequest): Promise<RadarrMovie> {
    return this.request<RadarrMovie>('/movie', {
      method: 'POST',
      body: JSON.stringify(movieData)
    })
  }
}

// SWR Hook Pattern (follow use-search.ts)
export function useRadarr() {
  const { data: movies, error, mutate, isLoading } = useSWR<RadarrMovie[]>(
    ['radarr', 'movies'],
    async () => {
      const response = await fetch('/api/radarr/movie')
      if (!response.ok) throw new Error('Failed to fetch movies')
      return response.json()
    },
    {
      refreshInterval: 30000, // 30 second refresh for monitoring
      revalidateOnFocus: true,
    }
  )

  const addMovie = useCallback(async (movieData: AddMovieRequest) => {
    const response = await fetch('/api/radarr/movie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieData)
    })
    if (!response.ok) throw new Error('Failed to add movie')
    mutate() // Refresh list after adding
    return response.json()
  }, [mutate])

  return { movies: movies || [], isLoading, error, addMovie, refresh: mutate }
}

// Component Pattern (follow TorrentCard.tsx)
interface MovieCardProps {
  movie: TMDBMovie
  onAdd: (movie: TMDBMovie) => void
  isAdding?: boolean
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onAdd, isAdding = false }) => {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.jpg'

  return (
    <div className="card hover:shadow-md transition-shadow">
      <img src={posterUrl} alt={movie.title} className="w-full h-64 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold text-lg">{movie.title}</h3>
        <p className="text-gray-600">⭐ {movie.vote_average.toFixed(1)} • {movie.release_date.split('-')[0]}</p>
        <button
          onClick={() => onAdd(movie)}
          disabled={isAdding}
          className="btn btn-primary mt-3 w-full"
        >
          {isAdding ? 'Adding...' : 'Add Movie'}
        </button>
      </div>
    </div>
  )
}
```

### Integration Points

```yaml
ENVIRONMENT_VARIABLES:
  - add to: .env
  - pattern: "RADARR_API_KEY=your_radarr_api_key"
  - pattern: "SONARR_API_KEY=your_sonarr_api_key"
  - pattern: "TMDB_API_KEY=your_tmdb_api_key"
  - pattern: "TVDB_API_KEY=your_tvdb_api_key"

DOCKER_HEALTH_CHECKS:
  - already_configured: docker-compose.yml includes Radarr/Sonarr health checks
  - endpoints: http://radarr:7878/api/v3/system/status, http://sonarr:8989/api/v3/system/status

NAVIGATION:
  - add to: web-ui/src/app/layout.tsx
  - pattern: "{ href: '/media', label: 'Media' }"
  - pattern: "{ href: '/monitoring', label: 'Monitoring' }"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
cd web-ui
npm run lint                          # ESLint checking
npm run type-check                    # TypeScript type checking
npm run format                        # Prettier formatting

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as created
cd web-ui
npm test -- --testPathPattern="components/media"
npm test -- --testPathPattern="hooks/use-radarr"
npm test -- --testPathPattern="api/radarr"

# Test specific files
npm test -- MovieCard.test.tsx
npm test -- use-media-search.test.tsx
npm test -- radarr-client.test.ts

# Expected: All tests pass. Create tests following existing patterns in __tests__ directories.
```

### Level 3: Integration Testing (System Validation)

```bash
# Docker stack validation
cd /home/dustin/projects/torrents
docker compose up -d
docker compose ps  # All services should show "healthy"

# API connectivity testing
curl -H "X-Api-Key: $RADARR_API_KEY" http://localhost:17878/api/v3/system/status
curl -H "X-Api-Key: $SONARR_API_KEY" http://localhost:18989/api/v3/system/status

# Web UI integration testing
cd web-ui
npm run dev
# Verify localhost:3000/media loads without errors
# Test TMDB search functionality
# Test movie/series addition flow

# Expected: All services healthy, API calls successful, web UI functional
```

### Level 4: Feature Validation

```bash
# End-to-end media management workflow
# 1. Search for "Inception" in TMDB
# 2. Click "Add Movie" button
# 3. Select quality profile and root folder
# 4. Verify movie appears in Radarr monitoring
# 5. Check download progress in qBittorrent
# 6. Confirm file organization in Plex

# Manual testing commands
curl -X POST http://localhost:17878/api/v3/movie \
  -H "X-Api-Key: $RADARR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tmdbId": 27205, "qualityProfileId": 1, "rootFolderPath": "/movies", "monitored": true}'

# Expected: Complete automation workflow from search to media library
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Docker compose shows all containers "healthy": `docker compose ps`
- [ ] TypeScript compilation passes: `cd web-ui && npm run type-check`
- [ ] All tests pass: `cd web-ui && npm test`
- [ ] ESLint passes: `cd web-ui && npm run lint`

### Feature Validation

- [ ] TMDB movie search returns results with posters and metadata
- [ ] TVDB series search returns results with episode information
- [ ] Movie addition workflow: search → select → add → monitor
- [ ] Series addition workflow: search → select → monitor seasons
- [ ] Quality profile selection interface functions correctly
- [ ] Monitoring dashboard shows wanted/missing content
- [ ] Calendar view displays upcoming releases
- [ ] Real-time updates show download progress and completion

### User Experience Validation

- [ ] Media discovery interface is intuitive and responsive
- [ ] Search results load within 2 seconds for TMDB/TVDB queries
- [ ] Add movie/series modals provide clear feedback and validation
- [ ] Monitoring dashboard updates automatically without page refresh
- [ ] Mobile interface is touch-friendly with proper responsive design
- [ ] Error states provide helpful messages and recovery options

### Integration Validation

- [ ] Radarr successfully receives movie additions from web UI
- [ ] Sonarr successfully receives series additions from web UI
- [ ] qBittorrent downloads triggered automatically by Radarr/Sonarr
- [ ] Plex library updates automatically after downloads complete
- [ ] File organization maintains proper naming and folder structure
- [ ] VPN isolation maintained for qBittorrent traffic only

---

## Anti-Patterns to Avoid

- ❌ Don't bypass Radarr/Sonarr automation by adding torrents directly to qBittorrent
- ❌ Don't hardcode quality profile IDs - always fetch dynamically
- ❌ Don't ignore TMDB rate limiting - implement proper queuing
- ❌ Don't store API keys in frontend code - use environment variables
- ❌ Don't skip debouncing on search inputs - prevents API spam
- ❌ Don't forget error boundaries - external APIs can fail
- ❌ Don't break VPN isolation for download client