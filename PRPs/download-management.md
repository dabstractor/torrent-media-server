# PRP-04: Download Management Enhancement

## Goal

**Feature Goal**: Enhance existing qBittorrent integration with comprehensive download monitoring, queue management, and real-time progress tracking to create a production-ready download management system.

**Deliverable**: Complete download management interface with real-time progress monitoring, queue management dashboard, batch operations, and mobile-optimized download controls.

**Success Definition**: Users can monitor all active downloads with real-time progress updates, manage download queues with drag-drop reordering, perform batch operations (pause/resume/delete), and receive completion notifications.

## User Persona

**Target User**: Torrent enthusiasts managing multiple concurrent downloads who need comprehensive monitoring and control capabilities.

**Use Case**: User searches for torrents, adds multiple downloads, monitors progress in real-time, manages download priorities, and organizes completed downloads.

**User Journey**: 
1. Search and add torrents to downloads (existing functionality)
2. Monitor download progress with real-time updates
3. Organize downloads by priority and category
4. Perform batch operations on multiple downloads
5. Manage disk space and download limits

**Pain Points Addressed**: 
- Limited visibility into download progress and status
- Lack of queue management and priority controls
- No batch operations for multiple downloads
- Missing mobile-optimized download interface

## Why

- **Business value**: Core functionality enabling torrent automation workflow
- **Integration**: Builds on existing search integration (PRP-03 dependency)
- **User impact**: Essential for managing large numbers of concurrent downloads
- **Problems solved**: Download monitoring, queue management, batch operations

## What

Enhanced download management system with real-time monitoring, comprehensive queue controls, and mobile-optimized interface building on existing qBittorrent integration foundation.

### Success Criteria

- [ ] Real-time progress updates with 2-second refresh intervals
- [ ] Download queue dashboard with drag-drop reordering
- [ ] Batch operations (pause/resume/delete) for multiple selections
- [ ] Download completion notifications and status indicators
- [ ] Mobile-responsive download interface with touch controls
- [ ] Performance handles 50+ concurrent downloads smoothly

## All Needed Context

### Context Completeness Check

_This PRP provides complete context for enhancing the existing qBittorrent integration with comprehensive download management features. All patterns, components, and integration points are already established in the codebase._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- docfile: PRPs/ai_docs/qbittorrent-api.md
  why: Complete qBittorrent WebUI API reference with authentication, endpoints, and best practices
  critical: Session management patterns, error handling, and rate limiting strategies

- docfile: PRPs/ai_docs/react-realtime-ui.md  
  why: Real-time UI update patterns and progress tracking strategies for React applications
  section: WebSocket vs polling strategies, state management, progress components

- file: web-ui/src/lib/api/clients/QBittorrentClient.ts
  why: Complete qBittorrent API client with authentication and session management
  pattern: Session-based authentication with SID cookie, automatic login retry
  gotcha: Session store is in-memory (needs Redis for production scaling)

- file: web-ui/src/app/api/qbittorrent/[...path]/route.ts  
  why: Next.js API proxy pattern with authentication and request forwarding
  pattern: Session caching, automatic authentication, error handling
  gotcha: 30-second timeout for all requests, session cleanup needed

- file: web-ui/src/lib/api/torrents.ts
  why: High-level torrent API functions showing integration patterns
  pattern: Async operations with consistent ApiResponse format
  gotcha: Progress tracking requires periodic polling

- file: web-ui/src/hooks/use-torrents.ts
  why: SWR-based data fetching with real-time updates
  pattern: 5-second polling, optimistic updates, error recovery
  gotcha: High frequency updates can impact performance

- file: web-ui/src/components/search/TorrentCard.tsx
  why: Existing torrent display component with action buttons and loading states  
  pattern: Card layout, button states, status indicators, responsive design
  gotcha: Touch targets must be minimum 44px height

- file: web-ui/src/lib/types/index.ts
  why: Complete TypeScript definitions for torrents, downloads, and API responses
  pattern: TorrentResult, Download, DownloadState interfaces
  gotcha: Size calculations need human-readable formatting
```

### Current Codebase Tree (existing structure)

```bash
web-ui/
├── src/
│   ├── app/
│   │   ├── api/qbittorrent/[...path]/route.ts    # API proxy routes
│   │   └── search/page.tsx                       # Search page with download buttons
│   ├── components/
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx               # Reusable loading states  
│   │   │   └── ErrorMessage.tsx                 # Error display component
│   │   └── search/
│   │       ├── TorrentCard.tsx                  # Torrent display with actions
│   │       └── SearchResults.tsx                # Results list management
│   ├── hooks/
│   │   ├── use-torrents.ts                      # SWR-based torrent management
│   │   ├── use-realtime.ts                      # SSE real-time updates
│   │   └── use-search.ts                        # Search functionality
│   └── lib/
│       ├── api/
│       │   ├── clients/QBittorrentClient.ts     # Complete qBittorrent client
│       │   ├── torrents.ts                      # Torrent API functions  
│       │   └── client.ts                        # Base HTTP client
│       └── types/index.ts                       # TypeScript definitions
```

### Desired Codebase Tree (with new download management features)

```bash
web-ui/
├── src/
│   ├── app/
│   │   ├── downloads/
│   │   │   ├── page.tsx                         # Downloads dashboard
│   │   │   └── [id]/page.tsx                    # Individual download details
│   │   └── api/downloads/
│   │       └── stream/route.ts                  # SSE endpoint for real-time updates
│   ├── components/
│   │   ├── downloads/
│   │   │   ├── DownloadsDashboard.tsx           # Main downloads interface
│   │   │   ├── DownloadCard.tsx                 # Individual download display
│   │   │   ├── DownloadQueue.tsx                # Queue management with drag-drop
│   │   │   ├── BatchControls.tsx                # Multi-select operations
│   │   │   ├── ProgressBar.tsx                  # Real-time progress component
│   │   │   └── DownloadModal.tsx                # Download configuration modal
│   │   └── ui/
│   │       ├── DragDropList.tsx                 # Reusable drag-drop component
│   │       └── NotificationToast.tsx            # Completion notifications
│   └── hooks/
│       ├── use-download-queue.ts                # Queue management hook
│       ├── use-batch-operations.ts              # Multi-select operations
│       └── use-download-notifications.ts        # Completion notifications
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: qBittorrent session management requires proper cleanup
// Sessions expire after 1 hour of inactivity - handle 401/403 responses
// Example: QBittorrentClient has automatic session refresh on failure

// CRITICAL: SWR polling can cause memory leaks with high frequency updates
// Use refreshInterval with focus/visibility detection
// Example: useTorrents hook uses 5-second intervals with page visibility checks

// CRITICAL: Real-time updates need debouncing for performance
// Progress updates fire frequently - batch updates to prevent UI jank
// Example: use-realtime.ts debounces updates with 500ms delay

// CRITICAL: Touch targets on mobile must be minimum 44px
// Tailwind classes: min-h-[44px] for all interactive elements
// Example: TorrentCard buttons use min-h-[44px] class

// CRITICAL: ApiResponse format must be consistent across all endpoints
// All API calls return: { success: boolean, data: T, error?: string }
// Example: torrents.ts functions follow standardized response format
```

## Implementation Blueprint

### Data Models and Structure

Extend existing TypeScript definitions for comprehensive download management:

```typescript
// Extend existing types in web-ui/src/lib/types/index.ts

interface DownloadFilters {
  state: DownloadState[]
  categories: string[]
  dateRange?: [Date, Date]
  sizeRange?: [number, number]
  progressRange?: [number, number]
}

interface QueueItem {
  id: string
  priority: number
  position: number
}

interface BatchOperation {
  action: 'pause' | 'resume' | 'delete' | 'setPriority' | 'setCategory'
  targetIds: string[]
  params?: Record<string, any>
}

interface DownloadNotification {
  id: string
  torrentId: string
  type: 'completed' | 'error' | 'paused'
  message: string
  timestamp: Date
  read: boolean
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/app/downloads/page.tsx
  - IMPLEMENT: Downloads dashboard page with layout and navigation
  - FOLLOW pattern: src/app/search/page.tsx (page structure, responsive layout)
  - NAMING: DownloadsPage component, consistent with existing pages
  - PLACEMENT: New page in app router directory

Task 2: CREATE src/components/downloads/DownloadsDashboard.tsx
  - IMPLEMENT: Main downloads interface with filtering and sorting
  - FOLLOW pattern: src/components/search/SearchResults.tsx (list management, loading states)
  - DEPENDENCIES: Use existing useTorrents hook for data
  - NAMING: DownloadsDashboard component with props interface
  - PLACEMENT: Downloads component directory

Task 3: CREATE src/components/downloads/DownloadCard.tsx  
  - IMPLEMENT: Individual download display with progress and controls
  - FOLLOW pattern: src/components/search/TorrentCard.tsx (card layout, action buttons)
  - NAMING: DownloadCard component with Download props
  - DEPENDENCIES: Import types from lib/types/index.ts
  - PLACEMENT: Downloads component directory

Task 4: CREATE src/components/downloads/ProgressBar.tsx
  - IMPLEMENT: Real-time progress bar with speed and ETA display
  - FOLLOW pattern: existing .progress-bar classes in globals.css
  - NAMING: ProgressBar component with progress props
  - DEPENDENCIES: Use Download interface for data
  - PLACEMENT: Downloads component directory

Task 5: CREATE src/hooks/use-download-queue.ts
  - IMPLEMENT: Queue management with drag-drop reordering  
  - FOLLOW pattern: src/hooks/use-torrents.ts (SWR usage, error handling)
  - NAMING: useDownloadQueue hook with queue operations
  - DEPENDENCIES: Extend existing torrents API functions
  - PLACEMENT: Hooks directory

Task 6: CREATE src/components/downloads/BatchControls.tsx
  - IMPLEMENT: Multi-select operations for bulk actions
  - FOLLOW pattern: src/components/search/TorrentCard.tsx (button patterns)
  - NAMING: BatchControls with selection state props  
  - DEPENDENCIES: Use batch operations hook
  - PLACEMENT: Downloads component directory

Task 7: CREATE src/app/api/downloads/stream/route.ts
  - IMPLEMENT: Server-Sent Events endpoint for real-time updates
  - FOLLOW pattern: src/app/api/qbittorrent/[...path]/route.ts (API route structure)
  - NAMING: GET handler for SSE stream
  - DEPENDENCIES: Use QBittorrentClient for data polling
  - PLACEMENT: API route directory

Task 8: ENHANCE src/hooks/use-torrents.ts
  - MODIFY: Add real-time SSE support alongside existing SWR polling
  - FOLLOW pattern: existing SWR configuration and error handling
  - PRESERVE: Current polling functionality as fallback
  - DEPENDENCIES: Import EventSource from use-realtime pattern

Task 9: CREATE src/components/downloads/DownloadModal.tsx
  - IMPLEMENT: Download configuration modal for category/priority
  - FOLLOW pattern: existing modal patterns in search components
  - NAMING: DownloadModal with configuration props
  - DEPENDENCIES: Use form patterns from search components
  - PLACEMENT: Downloads component directory

Task 10: CREATE src/hooks/use-batch-operations.ts
  - IMPLEMENT: Multi-select state and bulk operation handlers
  - FOLLOW pattern: src/hooks/use-torrents.ts (async operations, error handling)
  - NAMING: useBatchOperations with selection management  
  - DEPENDENCIES: Extend torrents API for batch endpoints
  - PLACEMENT: Hooks directory
```

### Implementation Patterns & Key Details

```typescript
// Real-time progress updates pattern
const useRealtimeDownloads = () => {
  // PATTERN: Combine SSE and SWR for reliability (follow use-realtime.ts)
  const { data: torrents, mutate } = useSWR('/api/torrents', fetcher, {
    refreshInterval: 5000 // Fallback polling
  })
  
  useEffect(() => {
    const eventSource = new EventSource('/api/downloads/stream')
    eventSource.onmessage = (event) => {
      // CRITICAL: Debounce updates to prevent UI jank
      debouncedUpdate(JSON.parse(event.data))
    }
    return () => eventSource.close()
  }, [])
}

// Queue management with drag-drop
const QueueManagement = ({ downloads, onReorder }) => {
  // PATTERN: Use existing card components with drag handlers
  // CRITICAL: Maintain touch-friendly 44px targets
  // GOTCHA: Optimistic updates with revert on API failure
}

// Batch operations pattern
const BatchControls = ({ selectedIds, onBatchAction }) => {
  // PATTERN: Follow TorrentCard button patterns with loading states
  // CRITICAL: Confirm destructive operations (delete)
  // GOTCHA: Handle partial failures in batch operations gracefully
}
```

### Integration Points

```yaml
NAVIGATION:
  - add to: src/components/layout/Header.tsx (if exists) or navigation
  - pattern: Add "Downloads" link following existing navigation patterns

ROUTING:  
  - add to: app router automatically handles /downloads route
  - pattern: Follow existing page structure from search implementation

REAL-TIME:
  - modify: src/hooks/use-realtime.ts to support download-specific events
  - pattern: Extend existing SSE implementation for download progress

API_EXTENSIONS:
  - modify: src/lib/api/torrents.ts to add batch operation functions
  - pattern: Follow existing async function patterns with ApiResponse format
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each component creation - fix before proceeding  
npm run lint                                    # ESLint validation
npm run type-check                              # TypeScript checking  
npm run format                                  # Prettier formatting

# Individual file validation
npx eslint src/components/downloads/ --fix
npx tsc --noEmit src/components/downloads/*.tsx

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
npm test src/components/downloads/DownloadCard.test.tsx
npm test src/hooks/use-download-queue.test.ts  
npm test src/components/downloads/ProgressBar.test.tsx

# Full component test suite
npm test src/components/downloads/
npm test src/hooks/use-*downloads*.ts

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development server with qBittorrent service
docker-compose -f web-ui/docker-compose.dev.yml up -d
npm run dev

# Verify downloads page renders correctly
curl -f http://localhost:3000/downloads || echo "Downloads page failed to load"

# Test real-time updates endpoint
curl -N http://localhost:3000/api/downloads/stream | head -20

# Test qBittorrent API integration
curl -X POST http://localhost:3000/api/qbittorrent/torrents/add \
  -H "Content-Type: application/json" \
  -d '{"urls": "magnet:?xt=urn:btih:test"}' | jq .

# Playwright E2E tests for download management
npm run test:e2e downloads

# Expected: All integrations working, real-time updates streaming, no connection errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Download Management Specific Validation:

# Performance testing with multiple downloads
# Add 10+ test torrents and verify UI performance
for i in {1..10}; do
  curl -X POST localhost:3000/api/qbittorrent/torrents/add \
    -d '{"urls": "magnet:?xt=urn:btih:test'$i'"}' 
done

# Real-time update performance  
# Verify SSE stream handles high frequency updates
ab -n 100 -c 5 http://localhost:3000/api/downloads/stream

# Mobile responsiveness testing
# Use Chrome DevTools to test touch interactions
npm run test:e2e -- --project=mobile

# Queue management testing
# Test drag-drop reordering functionality
npm run test:e2e downloads-queue-management.spec.ts

# Batch operations testing
# Test multi-select and bulk actions
npm run test:e2e downloads-batch-operations.spec.ts

# Error resilience testing
# Stop qBittorrent service and verify graceful degradation
docker-compose stop qbittorrent
# UI should show offline state and queue operations for retry

# Expected: Smooth performance with 50+ downloads, responsive mobile UI, graceful error handling
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Real-time updates working with <2 second latency
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No ESLint errors: `npm run lint`  
- [ ] No formatting issues: `npm run format --check`
- [ ] All tests pass: `npm test`

### Feature Validation

- [ ] Downloads dashboard displays all active torrents
- [ ] Real-time progress updates working smoothly
- [ ] Queue management with drag-drop reordering functional
- [ ] Batch operations (pause/resume/delete) working correctly  
- [ ] Download completion notifications appearing
- [ ] Mobile interface responsive and touch-friendly
- [ ] Error states handled gracefully with proper messages

### Code Quality Validation

- [ ] Follows existing component and hook patterns
- [ ] File placement matches desired codebase tree structure
- [ ] Reuses existing TypeScript interfaces appropriately
- [ ] Button patterns maintain 44px touch targets
- [ ] API calls use standardized ApiResponse format
- [ ] Real-time updates properly debounced for performance

### Documentation & Deployment

- [ ] Components are self-documenting with clear prop interfaces
- [ ] Real-time endpoints properly documented with SSE format
- [ ] Performance characteristics documented (update intervals, limits)
- [ ] Mobile-specific behaviors documented in component comments

---

## Anti-Patterns to Avoid

- ❌ Don't create new API response formats - use existing ApiResponse<T>
- ❌ Don't ignore session management - handle qBittorrent authentication properly  
- ❌ Don't skip debouncing - real-time updates need performance optimization
- ❌ Don't break mobile touch targets - maintain 44px minimum heights
- ❌ Don't bypass existing component patterns - reuse TorrentCard layout approach
- ❌ Don't create synchronous operations - all API calls must be async
- ❌ Don't ignore error states - handle network failures and API errors gracefully