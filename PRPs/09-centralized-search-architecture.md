---

## Goal

**Feature Goal**: Transform the application architecture to make Search the primary home page interface, with persistent search state maintained across all navigation, URL parameter synchronization, session-based request caching, and secure public API endpoints for torrent/magnet downloads instead of direct container access.

**Deliverable**: Centralized search-first application with Search page as root route (`/`), complete URL state synchronization, enhanced multi-tier caching system, and secure proxy API for download links that replaces direct container references.

**Success Definition**: Users land on a functional search interface, can navigate to Downloads/Settings and return with search state preserved, can bookmark and share search URLs with full state restoration, and all download links use secure public API endpoints instead of exposing internal Docker container addresses.

## User Persona

**Target User**: Torrent application power users who need efficient content discovery and management

**Use Case**: Primary workflow is searching for content, applying filters, reviewing results, and initiating downloads - with frequent navigation between search, download management, and settings

**User Journey**: 
1. User opens application → immediately sees search interface (no landing page)
2. User searches for content with filters → results appear with URL updated
3. User navigates to Downloads page → returns to search → previous results and query preserved
4. User bookmarks search URL or shares with query parameters → recipient sees identical search state
5. User clicks torrent/magnet links → secure download endpoints used instead of direct container access

**Pain Points Addressed**: 
- Eliminates extra click to reach primary functionality (search)
- Prevents loss of search state when checking downloads or adjusting settings
- Enables sharing and bookmarking of specific searches
- Provides secure, production-ready download links

## Why

- **Improved User Experience**: Search is the primary use case - make it immediately accessible without navigation
- **State Persistence**: Maintains user context across navigation, reducing friction and improving workflow efficiency  
- **Shareability**: URL-based state enables bookmarking, sharing, and browser history integration
- **Performance**: Enhanced caching reduces redundant API calls and improves response times
- **Security**: Secure download endpoints prevent exposure of internal infrastructure details
- **Scalability**: Public API approach enables future mobile apps, browser extensions, or third-party integrations

## What

Transform the torrent application from a landing page + navigation model to a search-centric interface with comprehensive state management and secure download infrastructure.

### Success Criteria

- [ ] Search interface loads immediately at root URL (`/`) with no intermediate landing page
- [ ] Search queries, filters, and results persist when navigating to Downloads/Settings and returning
- [ ] URL parameters reflect complete search state (`/search?q=ubuntu&cat=4000&seeds=5&sort=seeders&order=desc`)
- [ ] Multi-tier caching system provides <10ms repeat search response times within session
- [ ] All torrent/magnet download links use `/api/download/` endpoints instead of direct `http://vpn:9696` references
- [ ] Browser back/forward navigation works correctly with search state
- [ ] Search results can be bookmarked and shared with full state restoration
- [ ] Docker container validation passes with all network variations (`docker compose up -d` and VPN configurations)

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context for an agent unfamiliar with the codebase, including specific file locations, existing patterns to follow, technical implementation details, and comprehensive validation procedures._

### Documentation & References

```yaml
# Framework Documentation
- url: https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#using-the-usesearchparams-hook
  why: URL parameter handling patterns for Next.js 14 App Router
  critical: useSearchParams requires Suspense boundary wrapper

- url: https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering  
  why: Static rendering limitations with dynamic search parameters
  critical: Must use dynamic rendering for search parameter synchronization

- url: https://swr.vercel.app/docs/conditional-fetching
  why: SWR conditional fetching patterns for URL-driven search
  critical: Prevents unnecessary API calls during state initialization

# Implementation Patterns from Codebase
- file: web-ui/src/hooks/use-search.ts
  why: Existing search hook architecture and SWR integration patterns
  pattern: Debounced search with error handling and cache management
  gotcha: Current implementation uses local state only - needs URL synchronization

- file: web-ui/src/app/search/page.tsx
  why: Current search page structure and component organization
  pattern: SearchForm + SearchResults component composition
  gotcha: Currently receives no searchParams prop - needs conversion to dynamic route

- file: web-ui/src/components/layout/Header.tsx
  why: Navigation component patterns and active state management
  pattern: usePathname for active link detection with navItems array
  gotcha: Hard-coded navigation items need updating to reflect search as home

- file: web-ui/src/lib/utils/search-cache.ts  
  why: Existing sophisticated cache implementation with TTL and cleanup
  pattern: localStorage-based cache with versioning and statistics
  gotcha: Only implements persistent caching - needs session and memory tiers

- file: web-ui/src/components/search/TorrentCard.tsx
  why: Current download link implementation and security issue
  pattern: Direct href={torrent.downloadUrl} usage in line 123
  gotcha: Exposes internal container URLs like http://vpn:9696/2/download?apikey=...

- file: web-ui/src/app/api/prowlarr/[...path]/route.ts
  why: Existing proxy pattern for secure API access
  pattern: Environment variable configuration with error handling and timeout
  gotcha: Provides proxy but torrent results still contain direct URLs
```

### Current Codebase Tree

```bash
/home/dustin/projects/torrents/
├── web-ui/                          # Next.js 14 App Router Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # MODIFY: Remove landing page, redirect to search
│   │   │   ├── search/page.tsx     # MOVE: Content becomes new root page
│   │   │   ├── downloads/page.tsx  # No changes needed
│   │   │   ├── settings/           # No changes needed  
│   │   │   └── api/                # EXTEND: Add download proxy endpoints
│   │   ├── components/
│   │   │   ├── layout/             # MODIFY: Update navigation for new structure
│   │   │   └── search/             # MODIFY: Add URL state synchronization
│   │   ├── hooks/                  # EXTEND: Enhance search hooks with URL sync
│   │   └── lib/
│   │       ├── api/search.ts       # MODIFY: Update download URL handling  
│   │       └── utils/search-cache.ts # EXTEND: Add memory and session cache tiers
│   └── package.json                # Dependencies already suitable (Next.js 14, SWR)
```

### Desired Codebase Tree with New Files

```bash
/home/dustin/projects/torrents/
├── web-ui/src/
│   ├── app/
│   │   ├── page.tsx                    # NEW: Search interface (moved from search/page.tsx)
│   │   ├── search/                     # REMOVE: Content moved to root
│   │   └── api/
│   │       └── download/
│   │           ├── torrent/[id]/route.ts    # NEW: Secure .torrent file proxy 
│   │           └── magnet/[id]/route.ts     # NEW: Secure magnet link proxy
│   ├── hooks/
│   │   ├── use-search-url.ts          # NEW: URL parameter synchronization hook
│   │   └── use-search.ts              # MODIFY: Integration with URL state
│   ├── lib/
│   │   └── utils/
│   │       ├── unified-search-cache.ts     # NEW: Multi-tier caching system
│   │       └── download-url-utils.ts       # NEW: Secure URL generation utilities
│   └── components/
│       ├── layout/                    # MODIFY: Navigation reflects new structure
│       └── search/                    # MODIFY: URL state integration
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js 14 App Router requires Suspense for useSearchParams
// Any component using useSearchParams must be wrapped in Suspense boundary
function SearchPageContent() {
  const searchParams = useSearchParams() // This requires Suspense wrapper
  // ... implementation
}

// CRITICAL: SWR key generation must be stable for proper caching
// Changing key format will invalidate all existing cache entries  
const searchKey = useMemo(() => 
  debouncedParams.query ? JSON.stringify(debouncedParams) : null, 
  [debouncedParams]
)

// CRITICAL: router.replace vs router.push for URL updates
// Use replace for filter changes, push for new searches to prevent history pollution
const updateURL = useCallback((newParams: Partial<SearchRequest>) => {
  // Use replace to avoid cluttering browser history with filter changes
  router.replace(`/?${params.toString()}`, { scroll: false })
}, [router, searchParams])

// CRITICAL: Docker network references in torrent results
// Prowlarr returns downloadUrl: "http://vpn:9696/2/download?apikey=..." 
// These MUST be replaced with public API endpoints before reaching UI
```

## Implementation Blueprint

### Data Models and Structure  

```typescript
// EXTEND existing SearchRequest interface for URL serialization
interface SearchRequest {
  query: string
  categories?: string[]
  minSeeders?: number
  maxSize?: number
  sortBy?: 'seeders' | 'size' | 'date' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

// NEW: URL parameter mapping for clean URLs
interface SearchURLParams {
  q: string           // query parameter
  cat: string         // comma-separated category IDs
  seeds: string       // minSeeders
  size: string        // maxSize
  sort: string        // sortBy
  order: string       // sortOrder
  page: string        // calculated from offset
  limit: string       // results per page
}

// NEW: Multi-tier cache configuration
interface CacheConfig {
  memory: {
    maxSize: number        // 20 items for fast access
    ttl: number           // 10 minutes
  }
  session: {
    maxSize: number        // 50 items for current session
    ttl: number           // 30 minutes  
  }
  persistent: {
    maxSize: number        // 100 items across sessions
    ttl: number           // 24 hours
  }
}

// NEW: Secure download endpoint response
interface DownloadProxyResponse {
  downloadUrl: string     // Public API endpoint
  magnetUrl?: string      // Original magnet link  
  filename?: string       // Sanitized filename
  expiresAt: string       // URL expiration timestamp
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE hooks/use-search-url.ts
  - IMPLEMENT: URL parameter synchronization hook with Next.js 14 patterns
  - FOLLOW pattern: Existing hook structure in hooks/use-search.ts
  - NAMING: useSearchURL function, parseSearchParams, updateURL methods
  - DEPENDENCIES: Next.js useSearchParams, useRouter, usePathname hooks
  - PLACEMENT: Custom hooks directory

Task 2: MODIFY app/page.tsx 
  - IMPLEMENT: Search interface as root page (move content from search/page.tsx)
  - FOLLOW pattern: Existing search page structure and Suspense requirements
  - NAMING: SearchPage component with SearchContent wrapper for Suspense
  - DEPENDENCIES: URL hook from Task 1, existing search components
  - PLACEMENT: Root route replacement

Task 3: MODIFY hooks/use-search.ts
  - IMPLEMENT: Integration with URL state synchronization
  - FOLLOW pattern: Existing SWR integration and error handling
  - NAMING: Maintain existing function signatures, add URL sync
  - DEPENDENCIES: URL hook from Task 1, existing search cache
  - PLACEMENT: Enhance existing hook file

Task 4: CREATE lib/utils/unified-search-cache.ts  
  - IMPLEMENT: Multi-tier caching system (memory → session → persistent)
  - FOLLOW pattern: Existing SearchCacheManager structure and error handling
  - NAMING: UnifiedSearchCache class with get/set/clear methods
  - DEPENDENCIES: Existing search-cache.ts patterns
  - PLACEMENT: Utilities directory alongside existing cache

Task 5: CREATE api/download/torrent/[id]/route.ts
  - IMPLEMENT: Secure proxy endpoint for .torrent file downloads  
  - FOLLOW pattern: Existing Prowlarr proxy in api/prowlarr/[...path]/route.ts
  - NAMING: GET handler with id parameter validation
  - DEPENDENCIES: Environment variables, proxy patterns from existing API
  - PLACEMENT: New API routes for secure downloads

Task 6: CREATE api/download/magnet/[id]/route.ts
  - IMPLEMENT: Secure proxy endpoint for magnet link access
  - FOLLOW pattern: Download proxy structure from Task 5
  - NAMING: GET handler with magnet link validation and sanitization
  - DEPENDENCIES: Magnet link validation utilities
  - PLACEMENT: API routes alongside torrent proxy

Task 7: CREATE lib/utils/download-url-utils.ts
  - IMPLEMENT: Utilities for converting container URLs to public endpoints
  - FOLLOW pattern: Existing utility structure and error handling
  - NAMING: transformDownloadUrl, generateSecureEndpoint functions
  - DEPENDENCIES: URL parsing and validation utilities
  - PLACEMENT: Utilities directory

Task 8: MODIFY lib/api/search.ts
  - IMPLEMENT: Download URL transformation to use secure endpoints
  - FOLLOW pattern: Existing result normalization in normalizeTorrentResult
  - NAMING: Maintain existing function signatures, enhance URL handling
  - DEPENDENCIES: Download URL utilities from Task 7
  - PLACEMENT: Enhance existing API file

Task 9: MODIFY components/layout/Header.tsx and Sidebar.tsx
  - IMPLEMENT: Navigation updates to reflect search as home page
  - FOLLOW pattern: Existing navItems structure and active state detection
  - NAMING: Update navItems array and active state logic
  - DEPENDENCIES: Updated routing structure
  - PLACEMENT: Enhance existing layout components

Task 10: UPDATE components/search/ components for URL integration
  - IMPLEMENT: URL state synchronization in SearchForm and related components
  - FOLLOW pattern: Existing component structure and prop interfaces
  - NAMING: Maintain existing component APIs, add URL sync
  - DEPENDENCIES: URL hooks and modified search hooks
  - PLACEMENT: Enhance existing search components
```

### Implementation Patterns & Key Details

```typescript
// URL State Management Pattern
export function useSearchURL() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Parse URL parameters to SearchRequest format
  const searchState = useMemo((): SearchRequest => ({
    query: searchParams.get('q') || '',
    categories: searchParams.get('cat')?.split(',').filter(Boolean) || [],
    minSeeders: parseInt(searchParams.get('seeds') || '0') || undefined,
    // ... other parameters
  }), [searchParams])

  // Update URL with debounced parameter changes
  const updateURL = useCallback((newParams: Partial<SearchRequest>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Apply parameter updates with validation
    if (newParams.query !== undefined) {
      newParams.query ? params.set('q', newParams.query) : params.delete('q')  
    }
    
    // CRITICAL: Use replace for non-query changes to prevent history pollution
    const shouldPush = newParams.query !== searchState.query
    const method = shouldPush ? router.push : router.replace
    method(`/?${params.toString()}`, { scroll: false })
  }, [searchParams, router, searchState])

  return { searchState, updateURL }
}

// Multi-tier Cache Integration Pattern
export class UnifiedSearchCache {
  private memoryCache = new Map<string, CachedResponse>()
  private sessionKey = 'search-session-cache-v1' 
  private persistentCache = new SearchCacheManager() // existing

  async get(params: SearchRequest): Promise<SearchResponse | null> {
    const key = this.generateCacheKey(params)
    
    // Check memory first (fastest: <10ms)
    const memoryResult = this.memoryCache.get(key)
    if (memoryResult && !this.isExpired(memoryResult)) {
      return memoryResult.data
    }

    // Check session storage (fast: 20-50ms) 
    const sessionResult = this.getFromSessionStorage(key)
    if (sessionResult && !this.isExpired(sessionResult)) {
      this.memoryCache.set(key, sessionResult) // promote to memory
      return sessionResult.data
    }

    // Check persistent storage (slower: 50-100ms)
    const persistentResult = this.persistentCache.get(params)
    if (persistentResult) {
      this.setInSessionStorage(key, persistentResult) // promote to session
      this.memoryCache.set(key, persistentResult) // promote to memory
      return persistentResult
    }

    return null
  }
}

// Secure Download URL Pattern
export function transformDownloadUrl(originalUrl: string, torrentId: string): string {
  // CRITICAL: Replace container references with public API
  if (originalUrl.includes('vpn:9696') || originalUrl.includes('localhost')) {
    return `/api/download/torrent/${encodeURIComponent(torrentId)}`
  }
  return originalUrl
}

// Suspense Wrapper Pattern (REQUIRED for useSearchParams)
function SearchPage() {
  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <SearchContent />
    </Suspense>
  )
}
```

### Integration Points

```yaml
ROUTING:
  - modify: app/page.tsx (remove landing page, make search primary)
  - remove: app/search/page.tsx (content moves to root)
  - pattern: "Suspense wrapper required for useSearchParams components"

API_ENDPOINTS:
  - add: api/download/torrent/[id]/route.ts (secure .torrent proxy)
  - add: api/download/magnet/[id]/route.ts (secure magnet proxy) 
  - pattern: "Follow existing Prowlarr proxy authentication and timeout patterns"

NAVIGATION:  
  - modify: components/layout/Header.tsx (update navItems for new structure)
  - modify: components/layout/Sidebar.tsx (mirror Header changes)
  - pattern: "Search should show as active when on root route"

CACHING:
  - integrate: Enhanced cache with existing SWR configuration
  - pattern: "Multi-tier promotion strategy for optimal performance"
  - pattern: "Maintain existing cache key generation for compatibility"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
cd web-ui
npm run lint                          # ESLint validation
npm run type-check                    # TypeScript validation  
npm run format                        # Prettier formatting

# Expected: Zero errors. Fix all linting and type issues before proceeding.
```

### Level 2: Component Validation (Individual Testing)

```bash
# Test search functionality in isolation
npm run test -- --testPathPattern="search" --verbose

# Test URL parameter handling  
npm run test -- --testPathPattern="url" --verbose

# Test cache functionality
npm run test -- --testPathPattern="cache" --verbose

# Expected: All component tests pass. Fix failing tests before integration.
```

### Level 3: Integration Testing (System Validation)

```bash
# Start application and verify search loads at root
npm run dev &
sleep 5

# Verify root route loads search interface
curl -f http://localhost:3000/ | grep -i "search" || echo "Search not found at root"

# Test URL parameter synchronization
curl -f "http://localhost:3000/?q=ubuntu&cat=4000" | grep -i "ubuntu" || echo "URL params not working"

# Verify secure download endpoints
curl -f http://localhost:3000/api/download/torrent/test-id || echo "Torrent proxy endpoint not working"

# Test navigation state preservation
npm run test:e2e -- --testNamePattern="navigation.*state"

# Expected: All integration tests pass, URLs work correctly, navigation preserves state
```

### Level 4: Docker Environment Validation

```bash
# CRITICAL: Verify all Docker configurations work
docker compose down && docker compose up -d
sleep 30

# Check all containers are healthy
docker compose ps | grep -v "Up (healthy)" && echo "Unhealthy containers found"

# Test VPN configuration
docker-compose -f docker-compose.yml -f docker-compose.pia.yml down
docker-compose -f docker-compose.yml -f docker-compose.pia.yml up -d
sleep 30

# Verify web UI accessibility through all configurations
curl -f http://localhost:3000/ || echo "Web UI not accessible"

# Test search functionality with VPN
curl -f "http://localhost:3000/api/prowlarr/search?query=test" || echo "Search API not working with VPN"

# Expected: All Docker variants instantiate correctly, all containers show "Healthy"
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Search interface loads immediately at root URL without landing page  
- [ ] URL parameters properly reflect and restore complete search state
- [ ] Multi-tier caching provides <10ms response for repeat searches within session
- [ ] All torrent/magnet links use secure `/api/download/` endpoints
- [ ] Browser navigation (back/forward) works correctly with search state
- [ ] Docker containers pass health checks in all configurations

### Feature Validation  

- [ ] Users can search for content immediately upon opening application
- [ ] Search queries, filters, and results persist when navigating to Downloads/Settings and back
- [ ] Search URLs can be bookmarked and shared with full state restoration
- [ ] Navigation reflects search as the primary interface (active state on home)
- [ ] Download links are secure and don't expose internal container addresses
- [ ] Session-based caching improves performance for repeat searches
- [ ] All existing functionality (Downloads, Settings) remains fully functional

### Code Quality Validation

- [ ] Follows existing codebase patterns (SWR usage, component structure, error handling)
- [ ] File placement matches desired codebase tree structure
- [ ] No anti-patterns introduced (hardcoded values, sync functions in async context)
- [ ] URL parameter handling is type-safe and follows Next.js 14 best practices
- [ ] Cache implementation properly handles edge cases and cleanup
- [ ] Download proxies include proper authentication and security measures

### User Experience Validation

- [ ] Application feels faster and more responsive with enhanced caching
- [ ] No workflow interruptions when navigating between pages
- [ ] URLs are clean and shareable (no technical implementation details exposed)
- [ ] Search state preservation works intuitively without user confusion
- [ ] Error states are handled gracefully with informative messages

---

## Anti-Patterns to Avoid

- ❌ Don't use `router.push` for filter changes - creates history pollution
- ❌ Don't access searchParams without Suspense boundary - causes hydration errors  
- ❌ Don't expose internal container URLs in download links - security vulnerability
- ❌ Don't break existing SWR cache keys - invalidates user's cached data
- ❌ Don't modify URL on every keystroke - use debouncing for performance
- ❌ Don't ignore Docker validation - deployment requirements are critical

**Confidence Score**: 9/10 - This PRP provides comprehensive context, specific implementation patterns from the existing codebase, and detailed validation procedures that should enable successful one-pass implementation of a complex architectural change.