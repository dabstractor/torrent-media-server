# PRP-05: File Management & History Implementation

---

## Goal

**Feature Goal**: Implement comprehensive file management and download history tracking system that provides users with searchable download history, torrent file management, re-download capabilities, and file organization tools.

**Deliverable**: Complete file history and management system with:
- Download history dashboard with search/filter capabilities
- Torrent file storage and re-download functionality  
- File browser for completed downloads
- Statistics and analytics dashboard
- Maintenance and cleanup utilities

**Success Definition**: Users can track all download activity, easily re-download from stored torrents, organize completed files, and access detailed download statistics through an intuitive web interface.

## User Persona

**Target User**: Home users managing personal media libraries and software downloads

**Use Case**: 
- Track what has been downloaded over time
- Re-download previously downloaded content from stored .torrent files
- Organize and browse completed downloads
- Analyze download patterns and storage usage
- Clean up and maintain their download system

**User Journey**:
1. User downloads torrents through the existing search interface
2. System automatically tracks download history and stores .torrent files
3. User can browse history, search for specific downloads
4. User can re-download content from stored torrents
5. User can browse and organize completed files
6. User can view download statistics and storage analytics

**Pain Points Addressed**:
- Lost .torrent files needed for re-downloading
- Difficulty tracking what has been downloaded previously
- No visibility into download patterns or storage usage
- Manual file organization without system guidance
- No easy way to clean up old or duplicate files

## Why

- **Enhanced User Experience**: Provides comprehensive visibility into download activity and file management
- **Data Recovery**: Enables re-downloading of content through stored .torrent files
- **Storage Management**: Helps users optimize storage usage and organize files effectively  
- **Analytics Insights**: Provides valuable data on download patterns and system usage
- **System Maintenance**: Automated cleanup and organization tools reduce manual maintenance

## What

A complete file management and history system that integrates seamlessly with the existing torrent web UI, providing:

### Core Features
- **Download History Tracking**: Automatic recording of all download activity with searchable metadata
- **Torrent File Management**: Automatic storage and organization of .torrent files with re-download capabilities
- **File Browser**: Web-based interface for browsing and organizing completed downloads
- **Statistics Dashboard**: Analytics showing download patterns, speeds, success rates, and storage usage
- **Maintenance Tools**: Automated cleanup utilities and storage optimization features

### Success Criteria

- [ ] All completed downloads are automatically tracked in persistent history
- [ ] Users can search and filter download history by date, category, file type, and status
- [ ] Torrent files are automatically saved and organized for easy re-downloading
- [ ] File browser provides intuitive navigation of completed downloads directory
- [ ] Statistics dashboard displays meaningful insights about download activity
- [ ] Re-download functionality works reliably with stored .torrent files
- [ ] Cleanup tools safely remove duplicates and optimize storage usage
- [ ] Mobile interface provides full functionality on small screens
- [ ] System performance remains optimal with large download histories

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed for someone unfamiliar with the codebase to implement the file management history feature successfully, including specific patterns to follow, libraries to use, and integration points._

### Documentation & References

```yaml
- file: web-ui/src/components/downloads/DownloadCard.tsx
  why: Component pattern for displaying download items - follow this structure for history items
  pattern: Card-based layout with state indicators, action buttons, responsive design
  gotcha: Use min-h-[44px] for touch-friendly buttons, follow existing state color patterns

- file: web-ui/src/hooks/use-downloads.ts  
  why: Hook pattern for data fetching with SWR - template for file history hooks
  pattern: SWR with auto-refresh, consistent return interface, error handling
  gotcha: Use mutate() for refreshing data after operations, handle loading states

- file: web-ui/src/lib/api/client.ts
  why: API client structure and error handling patterns to follow
  pattern: ApiResponse<T> wrapper, centralized error handling, proxy-based security
  gotcha: All API calls go through Next.js API routes, not direct external calls

- file: web-ui/src/app/downloads/page.tsx
  why: Page structure pattern to follow for file history page
  pattern: Max-width container, responsive header with actions, consistent spacing
  gotcha: Use 'use client' directive, follow existing responsive breakpoints

- docfile: PRPs/ai_docs/file-history-tracking.md
  why: External best practices for file history tracking implementation
  section: File System Event Monitoring, Audit Trail Implementation
  
- docfile: PRPs/ai_docs/file-browser-ui-ux.md  
  why: File browser UI patterns and performance optimization techniques
  section: Core Component Architecture, Performance Optimization Techniques

- url: https://github.com/paulmillr/chokidar#api
  why: File system watching library for monitoring download completions
  critical: Use chokidar for reliable cross-platform file monitoring

- url: https://www.npmjs.com/package/react-window#fixedsizelist
  why: Virtualization library for handling large file lists in browser
  critical: Use react-window for performance with 1000+ history entries

- url: https://swr.vercel.app/docs/options#options
  why: SWR configuration options for optimizing data fetching patterns  
  critical: Use consistent refreshInterval and revalidation patterns from existing hooks
```

### Current Codebase Tree

```bash
torrents/
├── web-ui/
│   ├── src/
│   │   ├── app/
│   │   │   ├── downloads/page.tsx          # Download management page
│   │   │   └── search/page.tsx             # Search interface page  
│   │   ├── components/
│   │   │   ├── downloads/
│   │   │   │   └── DownloadCard.tsx        # Download item component
│   │   │   ├── search/
│   │   │   │   ├── SearchForm.tsx          # Search form component
│   │   │   │   └── TorrentCard.tsx         # Torrent result component
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.tsx      # Reusable loading component
│   │   │       └── ErrorMessage.tsx        # Error display component
│   │   ├── hooks/
│   │   │   ├── use-downloads.ts            # Download data management
│   │   │   └── use-search.ts               # Search functionality
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts               # API client with error handling
│   │   │   │   └── search.ts               # Search API functions
│   │   │   ├── types/index.ts              # TypeScript type definitions
│   │   │   └── utils/                      # Utility functions
│   │   └── __tests__/                      # Test files following Jest patterns
├── data/
│   ├── downloads/
│   │   ├── complete/                       # Completed downloads directory  
│   │   └── incomplete/                     # Active downloads directory
│   ├── media/
│   │   ├── movies/                         # Organized movie library
│   │   └── tv/                             # Organized TV library
│   └── torrents/                           # Stored .torrent files
└── docker-compose.yml                      # Container orchestration
```

### Desired Codebase Tree with Files to be Added

```bash
torrents/
├── web-ui/src/
│   ├── app/
│   │   └── files/                          # NEW: File management pages
│   │       ├── page.tsx                    # File history dashboard  
│   │       ├── browser/page.tsx            # File browser interface
│   │       └── stats/page.tsx              # Statistics dashboard
│   ├── components/
│   │   └── files/                          # NEW: File management components
│   │       ├── FileHistoryCard.tsx         # Individual history entry display
│   │       ├── FileHistoryDashboard.tsx    # Main history dashboard
│   │       ├── FileHistoryFilters.tsx      # Search/filter controls
│   │       ├── FileHistoryStats.tsx        # Statistics summary cards
│   │       ├── FileBrowser.tsx             # File browser tree component  
│   │       ├── TorrentFileManager.tsx      # Stored torrent management
│   │       └── FileMaintenancePanel.tsx    # Cleanup utilities interface
│   ├── hooks/
│   │   ├── use-file-history.ts             # NEW: File history data management
│   │   ├── use-file-browser.ts             # NEW: File browser functionality
│   │   ├── use-file-stats.ts               # NEW: Statistics data fetching
│   │   └── use-torrent-files.ts            # NEW: Stored torrent management
│   ├── lib/
│   │   ├── api/
│   │   │   └── files.ts                    # NEW: File management API functions
│   │   ├── db/
│   │   │   └── file-history.ts             # NEW: SQLite database operations
│   │   └── utils/
│   │       ├── file-utils.ts               # NEW: File system utilities
│   │       └── file-history-storage.ts     # NEW: History persistence layer
│   └── __tests__/
│       ├── components/files/               # NEW: File component tests
│       ├── hooks/files/                    # NEW: File hook tests  
│       └── api/files/                      # NEW: File API tests
├── data/
│   └── file-history/                       # NEW: File history database location
│       └── history.db                      # SQLite database file
└── web-ui/
    └── package.json                        # MODIFY: Add SQLite and file monitoring deps
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js App Router requires 'use client' directive for hooks and state
'use client' // Required at top of component files using React hooks

// CRITICAL: SWR pattern used throughout codebase - follow existing structure
const { data, error, mutate, isLoading } = useSWR<ResponseType>(
  'cache-key',
  fetchFunction,
  {
    refreshInterval: 5000,        // Match existing patterns
    revalidateOnFocus: true,      // Standard in this codebase
    errorRetryInterval: 10000,    // Consistent error handling
  }
)

// CRITICAL: API routes must be in app/api/ directory for Next.js 13+ App Router
// File: app/api/files/history/route.ts (NOT pages/api/)

// CRITICAL: File system operations require Node.js APIs - only in API routes
import fs from 'fs/promises' // Only works in API routes, not client components

// CRITICAL: Touch-friendly UI requirement - minimum 44px height for buttons
className="min-h-[44px] ..." // Required for mobile accessibility

// CRITICAL: Responsive design follows mobile-first approach
className="grid-cols-1 lg:grid-cols-2" // Mobile first, then larger screens

// CRITICAL: Chokidar file watching only works on server side
// Use in API routes or separate Node.js process, never in client components

// GOTCHA: SQLite better-sqlite3 requires synchronous API pattern  
const stmt = db.prepare('INSERT INTO ...')
stmt.run(data) // Sync API, different from async/await patterns elsewhere
```

## Implementation Blueprint

### Data Models and Structure

Create type-safe data models ensuring consistency across the application.

```typescript
// File: src/lib/types/file-history.ts - NEW FILE
export interface DownloadHistoryEntry {
  id: string                    // UUID for unique identification
  torrentHash: string          // Links to original torrent
  name: string                 // Display name from torrent
  originalSize: number         // Total size in bytes
  downloadedSize: number       // Actually downloaded bytes
  downloadPath: string         // Absolute path to downloaded content
  torrentFile?: string         // Path to stored .torrent file
  magnetUrl?: string           // Magnet link if available
  startedAt: Date             // Download initiation timestamp
  completedAt: Date           // Download completion timestamp  
  downloadTime: number         // Duration in milliseconds
  averageSpeed: number         // Average speed in bytes/second
  seeders: number             // Seeder count at completion
  leechers: number            // Leecher count at completion
  ratio: number               // Upload ratio if available
  category: string            // Category classification
  tags: string[]              // User/system tags
  status: 'completed' | 'deleted' | 'moved' | 'error'
  metadata?: Record<string, unknown> // Additional torrent metadata
}

export interface StoredTorrentFile {
  filename: string            // Original .torrent filename
  hash: string               // Torrent info hash
  title: string              // Human readable title
  size: number               // Total content size in bytes
  createdDate: Date          // When .torrent was created
  trackers: string[]         // Tracker URLs
  files: TorrentFileInfo[]   // Individual files in torrent
  magnetUrl?: string         // Generated magnet link
  storagePath: string        // Path to stored .torrent file
}

export interface CompletedFile {
  path: string               // Absolute file path
  name: string               // Filename
  size: number               // File size in bytes
  modifiedDate: Date         // Last modified timestamp
  mediaType?: 'video' | 'audio' | 'image' | 'archive' | 'document'
  torrentHash?: string       // Links back to download history
  plexCompatible: boolean    // Whether Plex can process this file
  quality?: string           // Extracted quality info (1080p, etc.)
}

// Pydantic-style validators for runtime type safety
export const DownloadHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  torrentHash: z.string().min(40).max(40), // SHA-1 hash length
  name: z.string().min(1).max(500),
  originalSize: z.number().positive(),
  downloadedSize: z.number().nonnegative(),
  downloadPath: z.string().min(1),
  // ... additional validation rules
})
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE src/lib/db/file-history.ts
  - IMPLEMENT: SQLite database operations with better-sqlite3
  - FOLLOW pattern: Synchronous API approach, prepared statements for performance  
  - NAMING: Database class with create*, get*, update*, delete* methods
  - DEPENDENCIES: Install better-sqlite3 package
  - PLACEMENT: Database layer in src/lib/db/

Task 2: CREATE src/lib/api/files.ts  
  - IMPLEMENT: API functions for file history operations
  - FOLLOW pattern: src/lib/api/client.ts (ApiResponse<T> wrapper, error handling)
  - NAMING: Async functions with descriptive names (getFileHistory, addHistoryEntry)
  - DEPENDENCIES: Import database operations from Task 1
  - PLACEMENT: API layer in src/lib/api/

Task 3: CREATE src/app/api/files/history/route.ts
  - IMPLEMENT: Next.js API routes for file history endpoints
  - FOLLOW pattern: RESTful endpoints with proper HTTP methods
  - NAMING: GET, POST, PUT, DELETE handlers following Next.js 13 conventions
  - DEPENDENCIES: Import API functions from Task 2
  - PLACEMENT: Next.js API routes in app/api/

Task 4: CREATE src/hooks/use-file-history.ts
  - IMPLEMENT: Custom hook for file history data management
  - FOLLOW pattern: src/hooks/use-downloads.ts (SWR pattern, consistent interface)
  - NAMING: Hook returning { data, isLoading, error, operations }
  - DEPENDENCIES: Import API functions, uses SWR for caching
  - PLACEMENT: Custom hooks in src/hooks/

Task 5: CREATE src/components/files/FileHistoryCard.tsx
  - IMPLEMENT: Individual history entry display component
  - FOLLOW pattern: src/components/downloads/DownloadCard.tsx (card layout, responsive)
  - NAMING: React.FC with Props interface, PascalCase component name
  - DEPENDENCIES: Import history types, follows card styling patterns
  - PLACEMENT: File components in src/components/files/

Task 6: CREATE src/components/files/FileHistoryDashboard.tsx  
  - IMPLEMENT: Main history dashboard with search/filter
  - FOLLOW pattern: Dashboard composition approach with sub-components
  - NAMING: Main dashboard component with clear sub-component separation
  - DEPENDENCIES: Uses FileHistoryCard, filter components, history hook
  - PLACEMENT: Dashboard component in src/components/files/

Task 7: CREATE src/app/files/page.tsx
  - IMPLEMENT: File history page following Next.js 13 App Router
  - FOLLOW pattern: src/app/downloads/page.tsx (page structure, responsive layout)
  - NAMING: Default export page component with 'use client' directive
  - DEPENDENCIES: Import FileHistoryDashboard component
  - PLACEMENT: Page component in src/app/files/

Task 8: CREATE src/lib/utils/file-monitoring.ts
  - IMPLEMENT: File system monitoring with chokidar for download completion
  - FOLLOW pattern: Event-driven architecture with proper error handling
  - NAMING: FileMonitor class with start/stop/configure methods  
  - DEPENDENCIES: chokidar package, integrates with database operations
  - PLACEMENT: Utility services in src/lib/utils/

Task 9: CREATE src/__tests__/hooks/use-file-history.test.ts
  - IMPLEMENT: Comprehensive hook testing with renderHook pattern
  - FOLLOW pattern: src/__tests__/hooks/use-downloads.test.ts (Jest, Testing Library)
  - NAMING: Describe blocks for each hook method, test naming conventions
  - COVERAGE: All hook methods, error states, loading states, data mutations
  - PLACEMENT: Hook tests in src/__tests__/hooks/

Task 10: CREATE src/__tests__/components/files/FileHistoryCard.test.tsx
  - IMPLEMENT: Component testing with React Testing Library
  - FOLLOW pattern: src/__tests__/components/downloads/DownloadCard.test.tsx
  - NAMING: Test component rendering, interactions, accessibility
  - COVERAGE: Props handling, user interactions, responsive behavior  
  - PLACEMENT: Component tests in src/__tests__/components/files/
```

### Implementation Patterns & Key Details

```typescript
// Database Operations Pattern - Synchronous API with better-sqlite3
class FileHistoryDB {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }
  
  // PATTERN: Prepared statements for performance
  private addHistoryStmt = this.db.prepare(`
    INSERT INTO download_history (id, torrentHash, name, originalSize, ...)
    VALUES (?, ?, ?, ?, ...)
  `);
  
  addHistoryEntry(entry: DownloadHistoryEntry): void {
    // GOTCHA: Synchronous API, no await needed
    this.addHistoryStmt.run(
      entry.id, entry.torrentHash, entry.name, entry.originalSize
    );
  }
  
  // PATTERN: Return arrays for list operations, single objects for get
  getHistoryEntries(filters?: HistoryFilters): DownloadHistoryEntry[] {
    // CRITICAL: Use parameterized queries to prevent SQL injection
    const stmt = this.db.prepare(`
      SELECT * FROM download_history 
      WHERE ($category IS NULL OR category = $category)
      ORDER BY completedAt DESC
    `);
    return stmt.all({ category: filters?.category || null });
  }
}

// API Route Pattern - Next.js 13 App Router
export async function GET(request: NextRequest) {
  try {
    // PATTERN: Extract query parameters from URL
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // PATTERN: Call database operations
    const entries = fileHistoryDB.getHistoryEntries({ category });
    
    // CRITICAL: Use ApiResponse wrapper for consistency
    return NextResponse.json({
      success: true,
      data: { entries, total: entries.length }
    });
  } catch (error) {
    console.error('File history fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file history' },
      { status: 500 }
    );
  }
}

// Component Pattern - Responsive card with touch-friendly actions
const FileHistoryCard: React.FC<FileHistoryCardProps> = ({
  entry,
  onRedownload,
  onDelete
}) => {
  // PATTERN: Local state for component-specific UI state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // PATTERN: Event handlers prefixed with 'handle'
  const handleRedownload = useCallback(() => {
    onRedownload(entry);
  }, [entry, onRedownload]);
  
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{entry.name}</h3>
          <p className="text-sm text-gray-500">
            {formatFileSize(entry.originalSize)} • {formatDate(entry.completedAt)}
          </p>
        </div>
        
        {/* CRITICAL: Touch-friendly button heights */}
        <div className="flex gap-2">
          <button
            onClick={handleRedownload}
            className="btn btn-primary min-h-[44px]"
            disabled={!entry.torrentFile}
          >
            Re-download
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="btn btn-secondary min-h-[44px]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook Pattern - SWR with consistent interface
export function useFileHistory(): UseFileHistoryReturn {
  const { data, error, mutate, isLoading } = useSWR<FileHistoryResponse>(
    '/api/files/history',
    fetchFileHistory,
    {
      refreshInterval: 30000,      // PATTERN: Slower refresh than downloads
      revalidateOnFocus: true,     // PATTERN: Consistent with other hooks
      errorRetryInterval: 10000,   // PATTERN: Standard error retry
    }
  );
  
  // PATTERN: Memoized action methods  
  const addToHistory = useCallback(async (entry: DownloadHistoryEntry) => {
    try {
      const response = await fetch('/api/files/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      
      if (response.ok) {
        mutate(); // CRITICAL: Refresh data after mutations
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add history entry:', error);
      return false;
    }
  }, [mutate]);
  
  return {
    history: data?.entries || [],
    stats: data?.stats,
    isLoading,
    error,
    refresh: mutate,
    addToHistory,
    deleteEntry,
    clearHistory,
  };
}
```

### Integration Points

```yaml
DOWNLOAD_MONITORING:
  - integrate: Monitor qBittorrent download completions via API polling
  - hook: Use existing download state changes to trigger history recording
  - pattern: "When download.state changes to 'completed', call addToHistory()"

FILE_SYSTEM:
  - monitor: "/data/downloads/complete/" directory for new files
  - library: "chokidar for cross-platform file watching"
  - pattern: "chokidar.watch().on('add', (path) => processNewFile(path))"

TORRENT_STORAGE:
  - location: "/data/torrents/" directory for .torrent file storage
  - organization: "Organize by date: /data/torrents/2024/01/filename.torrent"  
  - pattern: "Save .torrent file on download initiation, link in history entry"

API_EXTENSIONS:
  - extend: "Existing /api/downloads/ endpoint patterns"
  - add: "/api/files/history, /api/files/browser, /api/files/stats"
  - pattern: "Follow same ApiResponse<T> wrapper and error handling"

DATABASE_INTEGRATION:
  - location: "/data/file-history/history.db" (mounted volume)
  - backup: "Include in existing Docker volume backup strategy" 
  - migration: "Database schema versioning with migration scripts"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Install new dependencies
npm install better-sqlite3 chokidar react-window
npm install --save-dev @types/better-sqlite3

# Run after each file creation - fix before proceeding
npx eslint src/components/files/ --fix           # Lint new file components
npx eslint src/hooks/use-file-*.ts --fix         # Lint new hooks
npx eslint src/lib/db/ src/lib/api/files.ts --fix # Lint API and database code

# Type checking with specific focus on new files
npx tsc --noEmit src/lib/types/file-history.ts   # Validate new type definitions
npx tsc --noEmit src/hooks/use-file-history.ts   # Check hook implementation
npx tsc --noEmit src/components/files/*.tsx      # Check component types

# Formatting consistency
npx prettier --write src/components/files/       # Format file components
npx prettier --write src/hooks/use-file-*.ts     # Format file hooks
npx prettier --write src/lib/db/ src/lib/api/files.ts # Format API/DB code

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
npm run test src/__tests__/hooks/use-file-history.test.ts -- --verbose
npm run test src/__tests__/components/files/FileHistoryCard.test.tsx -- --verbose
npm run test src/__tests__/api/files/ -- --verbose

# Database operations testing
npm run test src/__tests__/lib/db/file-history.test.ts -- --verbose

# Coverage validation for new file management features
npm run test src/ -- --coverage --testPathPattern="files" --verbose

# Expected: All tests pass with >90% coverage. If failing, debug and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development server
npm run dev

# Database initialization test
curl -f http://localhost:3000/api/files/history/init || echo "Database init failed"

# File history API endpoint testing
curl -X GET http://localhost:3000/api/files/history | jq .
curl -X POST http://localhost:3000/api/files/history \
  -H "Content-Type: application/json" \
  -d '{"name":"test-download","torrentHash":"abc123","size":1024}' | jq .

# File browser functionality testing
curl -f http://localhost:3000/api/files/browser?path=/downloads/complete | jq .

# Statistics endpoint validation
curl -f http://localhost:3000/api/files/stats | jq .

# File monitoring service test (requires downloads directory)
ls -la data/downloads/complete/ # Verify directory exists
echo "test file" > data/downloads/complete/test.txt # Trigger file monitoring
sleep 2 # Allow processing time
curl -f http://localhost:3000/api/files/history | jq '.data.entries[0].name' # Should include test file

# Expected: All endpoints respond successfully, file monitoring captures changes
```

### Level 4: Feature-Specific Validation

```bash
# File History Feature Validation
npm run test -- --testNamePattern="file history workflow" --verbose

# Performance Testing with Large Datasets
node scripts/generate-test-history.js --count=1000  # Generate test data
npm run test:performance -- --testPathPattern="file-history-performance"

# File Browser Performance Testing  
curl -f "http://localhost:3000/api/files/browser?path=/downloads/complete&limit=100" | \
  jq '.data.files | length' # Should return paginated results

# Mobile Responsiveness Testing
npm run e2e -- --project=mobile --grep="file history mobile"

# Storage Integration Testing
docker exec torrents_transmission ls -la /downloads/complete # Verify volume mounting
docker exec torrents_plex ls -la /media # Verify Plex can access organized files

# Torrent File Storage Testing
ls -la data/torrents/ # Should contain organized .torrent files
file data/torrents/2024/*/*.torrent # Verify valid torrent file format

# Cleanup and Maintenance Testing
curl -X POST http://localhost:3000/api/files/maintenance/cleanup | jq .
curl -X GET http://localhost:3000/api/files/maintenance/stats | jq .

# Expected: Performance targets met, mobile interface functional, storage integration working
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test src/__tests__/files/ -- --coverage`
- [ ] No linting errors: `npx eslint src/components/files/ src/hooks/use-file-*.ts`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Database operations working: SQLite file created with proper schema
- [ ] File monitoring active: Chokidar watching downloads directory

### Feature Validation

- [ ] Download history automatically captured for completed downloads
- [ ] Search and filtering work with 1000+ history entries
- [ ] Torrent files automatically saved and organized by date
- [ ] Re-download functionality works with stored .torrent files
- [ ] File browser displays completed downloads with proper metadata
- [ ] Statistics dashboard shows meaningful download analytics
- [ ] Mobile interface fully functional with touch-friendly controls
- [ ] Performance remains good with large file lists (virtualization working)

### Code Quality Validation

- [ ] Follows existing component patterns (DownloadCard.tsx structure)
- [ ] Uses established hook patterns (SWR, consistent interfaces)  
- [ ] Implements proper error handling throughout
- [ ] Database operations use prepared statements for security
- [ ] File operations handle permissions and edge cases safely
- [ ] API routes follow existing ApiResponse<T> pattern
- [ ] TypeScript interfaces comprehensive and well-validated

### Integration Validation

- [ ] Integrates with existing download monitoring without conflicts
- [ ] File system monitoring works with Docker volume mounts
- [ ] Database persists correctly in mounted volume
- [ ] Torrent file storage integrates with existing directory structure
- [ ] Statistics reflect real download activity accurately
- [ ] Cleanup operations safely identify and remove appropriate files

---

## Anti-Patterns to Avoid

- ❌ Don't use client-side file operations (use API routes only)
- ❌ Don't store sensitive data in localStorage (use secure database)
- ❌ Don't ignore mobile responsiveness (follow min-h-[44px] pattern)
- ❌ Don't create new state management patterns (use SWR + React state)
- ❌ Don't hardcode file paths (use environment variables and configuration)
- ❌ Don't skip database migrations (implement versioning from start)  
- ❌ Don't ignore performance with large datasets (implement virtualization)
- ❌ Don't bypass existing API patterns (use ApiResponse<T> wrapper)
- ❌ Don't create unsafe file operations (validate paths, handle permissions)
- ❌ Don't forget accessibility (proper ARIA labels, keyboard navigation)