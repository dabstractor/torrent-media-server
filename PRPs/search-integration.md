---
name: "Search Integration PRP - Prowlarr API Integration with Advanced UI"
description: "Complete search functionality with Prowlarr API integration, advanced filtering, mobile-first responsive design, and performance optimization"

---

## Goal

**Feature Goal**: Implement comprehensive torrent search functionality by integrating with Prowlarr API, creating advanced search interfaces with filtering/sorting, and providing mobile-optimized user experience with performance caching.

**Deliverable**: Complete search system including search components, API integration, results display, performance optimization, and comprehensive testing.

**Success Definition**: Users can search multiple torrent indexers simultaneously through Prowlarr, filter/sort results, view detailed torrent information, and add torrents to qBittorrent with sub-2-second response times and mobile-friendly interface.

## User Persona

**Target User**: Media enthusiast using mobile device or desktop to find and download torrents for personal media collection.

**Use Case**: User opens mobile browser, searches for "ubuntu linux", applies filters for minimum seeders and file size, views results in card format, and adds selected torrent to download queue.

**User Journey**: 
1. Navigate to search page
2. Enter search query with autocomplete suggestions
3. Apply category and quality filters
4. Browse paginated results with metadata
5. View detailed torrent information
6. Add selected torrent to qBittorrent
7. Verify download started in downloads page

**Pain Points Addressed**: 
- No unified search across multiple indexers
- Poor mobile experience for torrent search
- Manual torrent file management
- Lack of search history and favorites

## Why

- **Unified Search**: Aggregate multiple torrent indexers through Prowlarr API for comprehensive results
- **Mobile-First Experience**: 60%+ of users access from mobile devices, needs touch-friendly interface
- **Performance Optimization**: Search results must load quickly with caching and intelligent filtering
- **Integration Value**: Seamlessly connects search to existing qBittorrent download management
- **User Retention**: Search history and favorites keep users engaged with the platform

## What

Users will be able to search for torrents across multiple indexers through a responsive, performant interface with advanced filtering, sorting, and metadata display. Search integrates with existing qBittorrent API for seamless torrent addition.

### Success Criteria

- [ ] Search multiple indexers simultaneously through Prowlarr API
- [ ] Filter results by category, seeders, size, and date
- [ ] Sort results by relevance, seeders, size, or publish date
- [ ] Display comprehensive torrent metadata (seeds, leech, size, indexer)
- [ ] Mobile-responsive interface with touch-friendly controls
- [ ] Search suggestions and history persistence
- [ ] Sub-2-second search response times with caching
- [ ] Error handling for offline indexers and API failures
- [ ] Integration with qBittorrent for torrent addition
- [ ] Comprehensive test coverage including mobile e2e tests

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context for someone unfamiliar with the codebase to successfully implement Prowlarr search integration following existing patterns._

### Documentation & References

```yaml
# CRITICAL DOCUMENTATION - Include in context window
- url: https://prowlarr.com/docs/api/
  why: Official Prowlarr API reference for search endpoints and authentication
  critical: X-Api-Key header authentication, /api/v1/search endpoint structure
  
- url: https://github.com/devopsarr/prowlarr-go/blob/main/prowlarr/api_search.go
  why: Official Go SDK search implementation patterns and error handling
  critical: Query parameter structure, response parsing, rate limiting patterns

- file: web-ui/src/lib/api/clients/ProwlarrClient.ts
  why: Existing Prowlarr client implementation with API key authentication
  pattern: API key header injection, error handling, base URL configuration
  gotcha: Already implemented - extend for search functionality

- file: web-ui/src/app/api/prowlarr/[...path]/route.ts
  why: Existing proxy route for Prowlarr API calls with authentication
  pattern: Proxy pattern with header forwarding, timeout handling, error responses
  gotcha: 30-second timeout configured, API key validation included

- file: web-ui/src/hooks/use-torrents.ts
  why: SWR data fetching pattern with refresh, error handling, and mutations
  pattern: SWR configuration, data transformation, optimistic updates
  gotcha: 5-second refresh interval, error retry configuration

- file: web-ui/src/components/common/ErrorMessage.tsx
  why: Standardized error display component with consistent styling
  pattern: Error message display with Tailwind classes, proper ARIA attributes
  gotcha: Mobile-optimized padding and typography

- file: web-ui/src/lib/types/index.ts
  why: Existing TypeScript interfaces for API responses and torrent data
  pattern: ApiResponse<T> wrapper, TorrentResult interface structure
  gotcha: Consistent response format across all API endpoints

- docfile: PRPs/ai_docs/prowlarr-search-api.md
  why: Prowlarr search API specifics, rate limiting, and response format documentation
  section: Search endpoint parameters and response structure
```

### Current Codebase Tree (Key Files Only)

```bash
web-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── prowlarr/[...path]/route.ts    # Existing proxy route
│   │   │   ├── qbittorrent/[...path]/route.ts # qBittorrent integration
│   │   │   └── status/route.ts               # Service health checks
│   │   ├── search/page.tsx                   # Placeholder search page
│   │   └── globals.css                       # Tailwind utilities
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorMessage.tsx              # Error display component
│   │   │   └── LoadingSpinner.tsx            # Loading state component
│   │   └── layout/
│   │       ├── Layout.tsx                    # Main app layout
│   │       └── Header.tsx                    # Navigation header
│   ├── hooks/
│   │   ├── use-torrents.ts                   # SWR torrent data fetching
│   │   └── use-service-status.ts             # Service status monitoring
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                     # Base API client
│   │   │   └── clients/
│   │   │       ├── ProwlarrClient.ts         # Prowlarr API client
│   │   │       └── QBittorrentClient.ts      # qBittorrent API client
│   │   └── types/index.ts                    # TypeScript interfaces
│   └── __tests__/                            # Test structure established
```

### Desired Codebase Tree with New Files

```bash
web-ui/src/
├── components/
│   └── search/
│       ├── SearchForm.tsx                    # Main search input with filters
│       ├── SearchResults.tsx                 # Results container with pagination
│       ├── TorrentCard.tsx                   # Individual result display
│       ├── SearchFilters.tsx                 # Category/quality filter panel
│       ├── SearchHistory.tsx                 # Recent searches component
│       └── SearchSuggestions.tsx             # Autocomplete suggestions
├── hooks/
│   ├── use-search.ts                         # Search SWR hook with caching
│   ├── use-search-history.ts                # Search history persistence
│   └── use-search-suggestions.ts             # Search suggestions logic
├── lib/
│   ├── api/
│   │   └── search.ts                         # Search API functions
│   └── utils/
│       ├── search-cache.ts                   # Search result caching utilities
│       └── torrent-utils.ts                  # Size formatting, metadata parsing
└── __tests__/
    ├── components/
    │   └── search/                           # Component tests
    ├── hooks/
    │   └── search/                           # Hook tests
    └── api/
        └── search-api.test.ts                # API integration tests
```

### Known Gotchas & Library Quirks

```javascript
// CRITICAL: Prowlarr API requires X-Api-Key header
const headers = {
  'X-Api-Key': process.env.PROWLARR_API_KEY,  // Must be configured
  'Content-Type': 'application/json'
}

// CRITICAL: SWR deduplication requires consistent keys
const searchKey = ['search', query, JSON.stringify(filters)] // Array key for complex params

// CRITICAL: Next.js API routes need AbortSignal for timeouts
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000)  // 30 second timeout established
})

// GOTCHA: Tailwind min-h-[44px] for touch targets
className="min-h-[44px]"  // All interactive elements need this

// GOTCHA: React Hook Form with Zod validation pattern
const form = useForm<SearchFormData>({
  resolver: zodResolver(searchSchema),  // zodResolver is required import
  defaultValues: { query: '', category: '' }
})
```

## Implementation Blueprint

### Data Models and Structure

Create type-safe interfaces ensuring consistency across search functionality.

```typescript
// Search Request/Response Models
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

interface SearchResponse {
  results: TorrentResult[]
  total: number
  indexers: string[]
  searchTime: number
}

interface TorrentResult {
  id: string
  title: string
  size: number
  sizeText: string
  seeders: number
  leechers: number
  category: string
  indexer: string
  downloadUrl: string
  magnetUrl?: string
  publishDate: string
  quality?: string
}

// Search Filter Models
interface SearchFilters {
  categories: string[]
  minSeeders: number
  maxSize: number
  sortBy: 'seeders' | 'size' | 'date' | 'relevance'
  sortOrder: 'asc' | 'desc'
}

// Search History Models
interface SearchHistoryItem {
  id: string
  query: string
  filters: SearchFilters
  timestamp: string
  resultCount: number
}
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE src/lib/api/search.ts
  - IMPLEMENT: searchTorrents function calling Prowlarr API via proxy route
  - FOLLOW pattern: src/hooks/use-torrents.ts (API calling with error handling)
  - NAMING: searchTorrents, getSearchSuggestions, addToDownloads functions
  - DEPENDENCIES: Use existing ProwlarrClient patterns and ApiResponse types
  - PLACEMENT: API function library in src/lib/api/

Task 2: CREATE src/hooks/use-search.ts
  - IMPLEMENT: SWR hook for search with caching, debouncing, error handling
  - FOLLOW pattern: src/hooks/use-torrents.ts (SWR configuration, mutate patterns)
  - NAMING: useSearch hook with search, results, isLoading, error returns
  - DEPENDENCIES: Import search functions from Task 1, use SWR configuration patterns
  - PLACEMENT: Custom hooks directory in src/hooks/

Task 3: CREATE src/components/search/SearchForm.tsx
  - IMPLEMENT: Search input with react-hook-form, category filters, validation
  - FOLLOW pattern: Existing form patterns, btn/input classes from globals.css
  - NAMING: SearchForm component with onSearch prop callback
  - DEPENDENCIES: Use SearchRequest types from models, react-hook-form + zod validation
  - PLACEMENT: Search components in src/components/search/

Task 4: CREATE src/components/search/TorrentCard.tsx
  - IMPLEMENT: Individual torrent result display with metadata, add-to-download action
  - FOLLOW pattern: src/components/common/ component structure, card classes from globals.css
  - NAMING: TorrentCard component with TorrentResult prop and onAdd callback
  - DEPENDENCIES: Use TorrentResult interface, existing button/card styling patterns
  - PLACEMENT: Search components in src/components/search/

Task 5: CREATE src/components/search/SearchResults.tsx
  - IMPLEMENT: Results container with grid layout, pagination, loading/error states
  - FOLLOW pattern: Layout components structure, responsive grid classes
  - NAMING: SearchResults component with results array prop
  - DEPENDENCIES: Import TorrentCard from Task 4, use existing loading/error components
  - PLACEMENT: Search components in src/components/search/

Task 6: MODIFY src/app/search/page.tsx
  - INTEGRATE: Replace placeholder with SearchForm and SearchResults components
  - FIND pattern: Existing page component structure in src/app/ directory
  - ADD: Import and compose search components, implement search flow
  - PRESERVE: Existing page metadata and layout integration
  - DEPENDENCIES: Components from Tasks 3-5, search hook from Task 2

Task 7: CREATE src/hooks/use-search-history.ts
  - IMPLEMENT: localStorage-based search history persistence with favorites
  - FOLLOW pattern: Browser storage patterns, TypeScript localStorage utilities
  - NAMING: useSearchHistory hook with history, addToHistory, clearHistory functions
  - DEPENDENCIES: Use SearchHistoryItem interface, implement localStorage wrapper
  - PLACEMENT: Custom hooks directory in src/hooks/

Task 8: CREATE src/components/search/SearchFilters.tsx
  - IMPLEMENT: Collapsible filter panel with category, seeder, size controls
  - FOLLOW pattern: Form component structure, mobile-responsive accordion
  - NAMING: SearchFilters component with filters prop and onChange callback
  - DEPENDENCIES: Use SearchFilters interface, form control styling patterns
  - PLACEMENT: Search components in src/components/search/

Task 9: CREATE comprehensive test suite
  - IMPLEMENT: Component tests for all search components with React Testing Library
  - FOLLOW pattern: __tests__ structure, existing component test patterns
  - NAMING: [ComponentName].test.tsx following established convention
  - COVERAGE: User interactions, error states, loading states, mobile viewport
  - PLACEMENT: Tests in __tests__/components/search/ directory

Task 10: CREATE src/lib/utils/search-cache.ts
  - IMPLEMENT: Search result caching utilities with TTL and invalidation
  - FOLLOW pattern: Utility function structure, TypeScript utility patterns
  - NAMING: CacheManager class with set, get, invalidate methods
  - DEPENDENCIES: Browser storage APIs, cache key generation utilities
  - PLACEMENT: Utility functions in src/lib/utils/
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL: Search API function pattern
export async function searchTorrents(params: SearchRequest): Promise<ApiResponse<SearchResponse>> {
  // PATTERN: Use existing proxy route for Prowlarr API access
  const queryString = new URLSearchParams({
    query: params.query,
    categories: params.categories?.join(',') || '',
    offset: params.offset?.toString() || '0',
    limit: params.limit?.toString() || '50'
  })
  
  try {
    // CRITICAL: Route through existing proxy for authentication
    const response = await fetch(`/api/prowlarr/search?${queryString}`)
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return { success: true, data: normalizeSearchResults(data) }
  } catch (error) {
    // PATTERN: Consistent error handling with ApiResponse format
    return {
      success: false,
      data: null as SearchResponse,
      error: error instanceof Error ? error.message : 'Unknown search error'
    }
  }
}

// CRITICAL: SWR search hook pattern with debouncing
export function useSearch() {
  const [searchParams, setSearchParams] = useState<SearchRequest>({ query: '' })
  
  // PATTERN: Debounced search key generation
  const debouncedParams = useDebounce(searchParams, 500)
  const searchKey = debouncedParams.query 
    ? ['search', debouncedParams.query, JSON.stringify(debouncedParams)]
    : null
  
  // PATTERN: SWR with conditional fetching and error retry
  const { data, error, mutate, isLoading } = useSWR<SearchResponse>(
    searchKey,
    () => searchTorrents(debouncedParams).then(res => {
      if (!res.success) throw new Error(res.error)
      return res.data
    }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      errorRetryInterval: 5000,
      onError: (error) => console.error('Search error:', error)
    }
  )
  
  return {
    results: data?.results || [],
    total: data?.total || 0,
    isLoading,
    error,
    search: setSearchParams,
    refetch: mutate
  }
}

// CRITICAL: React Hook Form with Zod validation pattern
const searchSchema = z.object({
  query: z.string().min(1, 'Search query required'),
  categories: z.array(z.string()).optional(),
  minSeeders: z.number().min(0).optional(),
  maxSize: z.number().min(1).optional()
})

export function SearchForm({ onSearch }: { onSearch: (params: SearchRequest) => void }) {
  // PATTERN: Form handling with validation
  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query: '', categories: [] }
  })
  
  // PATTERN: Form submission with error handling
  const handleSubmit = form.handleSubmit((data) => {
    onSearch(data)
  })
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        {...form.register('query')}
        className="input w-full min-h-[44px]"  // CRITICAL: Touch target size
        placeholder="Search torrents..."
      />
      {/* Additional form fields */}
    </form>
  )
}

// CRITICAL: Mobile-responsive card layout pattern
export function TorrentCard({ torrent, onAdd }: { torrent: TorrentResult, onAdd: (torrent: TorrentResult) => void }) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm sm:text-base truncate">{torrent.title}</h3>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
            <span>{torrent.sizeText}</span>
            <span>↑{torrent.seeders}</span>
            <span>↓{torrent.leechers}</span>
            <span>{torrent.indexer}</span>
          </div>
        </div>
        <button
          onClick={() => onAdd(torrent)}
          className="btn btn-primary min-h-[44px] px-6"  // CRITICAL: Touch-friendly size
        >
          Add
        </button>
      </div>
    </div>
  )
}
```

### Integration Points

```yaml
API_ROUTES:
  - extend: src/app/api/prowlarr/[...path]/route.ts
  - pattern: "Existing proxy handles search endpoints, no modification needed"

COMPONENTS:
  - integrate: src/app/search/page.tsx
  - pattern: "Replace placeholder with SearchForm and SearchResults composition"

NAVIGATION:
  - update: src/components/layout/Header.tsx
  - pattern: "Add search navigation link if not present"

CACHE:
  - implement: Browser localStorage for search history
  - pattern: "Key format: 'search-history-v1', JSON array storage"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint                          # ESLint checking with Next.js rules
npm run type-check                    # TypeScript compilation checking
npm run format                        # Prettier formatting

# Expected: Zero errors. Fix any linting or type errors before proceeding to next task.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as created
npm run test -- SearchForm.test.tsx
npm run test -- TorrentCard.test.tsx  
npm run test -- SearchResults.test.tsx

# Test search hook functionality
npm run test -- use-search.test.ts

# Full component test suite
npm run test -- --testPathPattern=search

# Expected: All tests pass with 80%+ coverage on search components
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development server for integration testing
npm run dev &
NEXT_PID=$!

# Wait for server startup
sleep 5

# Test search API proxy route
curl -f "http://localhost:3000/api/prowlarr/search?query=test" \
  -H "Content-Type: application/json" \
  | jq . || echo "Search API proxy failed"

# Test search page renders
curl -f "http://localhost:3000/search" || echo "Search page failed to render"

# Cleanup development server
kill $NEXT_PID

# Expected: API proxy returns search results, search page renders without errors
```

### Level 4: E2E Testing (User Journey Validation)

```bash
# Run Playwright e2e tests
npm run e2e:test -- search-flow.spec.ts

# Test mobile viewport specifically
npm run e2e:test -- search-flow.spec.ts --grep "mobile"

# Visual regression testing
npm run e2e:test -- --grep "visual" --update-snapshots

# Performance testing
npm run e2e:test -- --grep "performance"

# Expected: Complete user journey works on desktop and mobile, performance metrics met
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format --check`

### Feature Validation

- [ ] Search query returns results from multiple indexers through Prowlarr
- [ ] Filter functionality works (categories, seeders, size)
- [ ] Sort functionality works (seeders, size, date, relevance)
- [ ] Mobile interface is touch-friendly and responsive
- [ ] Search results load in under 2 seconds with caching
- [ ] Add to qBittorrent functionality works from search results
- [ ] Error handling gracefully manages offline indexers and API failures
- [ ] Search history persists between browser sessions

### Code Quality Validation

- [ ] Follows existing React component patterns and TypeScript interfaces
- [ ] Uses established SWR data fetching patterns
- [ ] Implements proper error boundaries and loading states
- [ ] Mobile-first responsive design with proper touch targets
- [ ] Search performance optimization with debouncing and caching
- [ ] Comprehensive test coverage including unit, integration, and e2e tests

### UX Validation

- [ ] Search interface is intuitive and discoverable
- [ ] Filter controls are accessible and clearly labeled
- [ ] Loading states provide appropriate feedback
- [ ] Error messages are helpful and actionable
- [ ] Mobile experience matches desktop functionality
- [ ] Search suggestions and history improve user experience

---

## Anti-Patterns to Avoid

- ❌ Don't bypass existing Prowlarr proxy route - use `/api/prowlarr/` endpoints
- ❌ Don't implement custom API authentication - use existing patterns
- ❌ Don't skip mobile testing - mobile-first approach is critical
- ❌ Don't ignore search performance - implement caching and debouncing
- ❌ Don't hardcode indexer-specific logic - keep generic for all Prowlarr indexers
- ❌ Don't skip error handling - gracefully handle indexer failures
- ❌ Don't ignore accessibility - implement proper ARIA labels and keyboard navigation
- ❌ Don't create inconsistent components - follow existing design system patterns

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Validation Criteria**: The completed implementation should enable users to search torrents across multiple indexers, filter/sort results effectively, and add torrents to downloads with a mobile-optimized, performant interface that integrates seamlessly with existing application architecture.

This PRP provides comprehensive implementation guidance following established codebase patterns, with complete context for successful feature development without prior system knowledge.