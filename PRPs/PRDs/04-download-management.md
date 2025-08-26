# PRP-04: Download Management

**Priority**: High  
**Estimated Time**: 4-5 days  
**Dependencies**: PRP-03 (Search Integration)  
**Phase**: Core Functionality

## Overview
Implement comprehensive download management by integrating with qBittorrent API, enabling users to add torrents, monitor progress, and control downloads with real-time updates and queue management.

## Objectives
1. Integrate qBittorrent WebUI API for torrent control
2. Implement "Add to Downloads" from search results
3. Create download progress monitoring with real-time updates
4. Build download queue management interface
5. Add pause/resume/delete controls for individual torrents
6. Implement batch operations for multiple torrents

## Tasks

### qBittorrent API Integration
- [ ] Extend qBittorrent client with full API coverage
- [ ] Implement session management and authentication
- [ ] Add torrent addition via magnet links and files
- [ ] Create torrent control operations (pause/resume/delete)
- [ ] Implement torrent property modification

### Download Addition Interface
- [ ] Add "Download" buttons to search results
- [ ] Create download confirmation modal
- [ ] Implement category and priority selection
- [ ] Add download location customization
- [ ] Create bulk download functionality

### Progress Monitoring
- [ ] Create real-time progress tracking
- [ ] Implement WebSocket or polling for updates
- [ ] Build progress visualization components
- [ ] Add speed and ETA calculations
- [ ] Create download completion notifications

### Queue Management
- [ ] Build download queue interface
- [ ] Implement priority management
- [ ] Add global pause/resume functionality
- [ ] Create download limits and throttling
- [ ] Implement sequential download options

## API Integration Details

### Enhanced qBittorrent Client
```typescript
class QBittorrentClient {
  // Authentication
  async login(username: string, password: string): Promise<boolean>
  async logout(): Promise<void>
  
  // Torrent Management
  async addTorrent(options: AddTorrentOptions): Promise<boolean>
  async getTorrents(filter?: TorrentFilter): Promise<Torrent[]>
  async getTorrentProperties(hash: string): Promise<TorrentProperties>
  
  // Torrent Control
  async pauseTorrents(hashes: string[]): Promise<void>
  async resumeTorrents(hashes: string[]): Promise<void>
  async deleteTorrents(hashes: string[], deleteFiles: boolean): Promise<void>
  
  // Queue Management
  async setTorrentPriority(hash: string, priority: number): Promise<void>
  async reorderQueue(hashes: string[]): Promise<void>
  
  // Global Settings
  async getGlobalSettings(): Promise<GlobalSettings>
  async setGlobalSettings(settings: Partial<GlobalSettings>): Promise<void>
}
```

### Data Models
```typescript
interface AddTorrentOptions {
  magnetUrl?: string;
  torrentFile?: File;
  savePath?: string;
  category?: string;
  tags?: string[];
  priority?: number;
  skipChecking?: boolean;
  paused?: boolean;
}

interface Torrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  priority: number;
  state: TorrentState;
  category: string;
  tags: string[];
  addedOn: Date;
  completedOn?: Date;
  ratio: number;
  seeders: number;
  leechers: number;
}

type TorrentState = 
  | 'downloading' 
  | 'uploading' 
  | 'paused' 
  | 'completed' 
  | 'error' 
  | 'queued';
```

## UI Components

### Download Interface
- [ ] Add to downloads button with confirmation
- [ ] Download options modal (category, priority, path)
- [ ] Bulk selection interface for search results
- [ ] Quick add with default settings
- [ ] Download progress toast notifications

### Downloads Dashboard
```tsx
interface DownloadsDashboardProps {
  torrents: Torrent[];
  onPause: (hashes: string[]) => void;
  onResume: (hashes: string[]) => void;
  onDelete: (hashes: string[], deleteFiles: boolean) => void;
  onPriorityChange: (hash: string, priority: number) => void;
}
```

### Progress Components
- [ ] Individual torrent progress bars
- [ ] Speed indicators with upload/download
- [ ] ETA display with smart formatting
- [ ] Overall download statistics
- [ ] Historical download charts

### Queue Management
- [ ] Drag-and-drop queue reordering
- [ ] Priority level controls (high/normal/low)
- [ ] Global pause/resume controls
- [ ] Active downloads limit settings
- [ ] Download scheduling options

## Real-time Updates

### Update Strategy
- [ ] Implement WebSocket connection for real-time updates
- [ ] Fallback to polling if WebSocket unavailable
- [ ] Optimize update frequency based on activity
- [ ] Handle connection loss gracefully
- [ ] Batch updates for performance

### Update Handler
```typescript
class DownloadUpdateHandler {
  private updateInterval: number = 2000; // 2 seconds
  private socket?: WebSocket;
  
  startUpdates(): void
  stopUpdates(): void
  handleTorrentUpdate(torrent: Torrent): void
  handleGlobalStatsUpdate(stats: GlobalStats): void
}
```

## Download Control Features

### Individual Torrent Controls
- [ ] Play/pause toggle button
- [ ] Delete with optional file removal
- [ ] Priority adjustment (high/normal/low)
- [ ] Force recheck functionality
- [ ] Move to different category

### Batch Operations
- [ ] Multi-select with checkboxes
- [ ] Batch pause/resume
- [ ] Batch delete with confirmation
- [ ] Batch category assignment
- [ ] Batch priority changes

### Advanced Controls
- [ ] Sequential download toggle
- [ ] Force start override queue limits
- [ ] Bandwidth allocation per torrent
- [ ] Seed ratio limits
- [ ] Auto-delete completed torrents

## Download Organization

### Categories
- [ ] Predefined categories (Movies, TV, Music, Other)
- [ ] Custom category creation
- [ ] Category-based download paths
- [ ] Category filtering and sorting
- [ ] Category statistics

### Filtering and Sorting
```typescript
interface DownloadFilters {
  state: TorrentState[];
  categories: string[];
  dateRange: [Date, Date];
  sizeRange: [number, number];
  progressRange: [number, number];
}

interface SortOptions {
  field: keyof Torrent;
  direction: 'asc' | 'desc';
}
```

## Performance Optimization

### Efficient Updates
- [ ] Only update changed torrents
- [ ] Throttle updates during high activity
- [ ] Pause updates when tab not visible
- [ ] Batch API calls to reduce overhead
- [ ] Cache torrent data locally

### Large Queue Handling
- [ ] Virtual scrolling for many torrents
- [ ] Lazy loading of torrent details
- [ ] Pagination for large download lists
- [ ] Search/filter within downloads
- [ ] Archive completed downloads

## Error Handling

### Connection Issues
- [ ] Handle qBittorrent service unavailable
- [ ] Retry failed API calls with backoff
- [ ] Show offline indicator when disconnected
- [ ] Queue operations when offline
- [ ] Sync state when reconnected

### Download Errors
- [ ] Display torrent error states clearly
- [ ] Provide error resolution suggestions
- [ ] Allow manual error recovery actions
- [ ] Log errors for debugging
- [ ] Show error statistics

## Mobile Experience

### Touch Interface
- [ ] Swipe actions for pause/resume/delete
- [ ] Long-press for multi-select mode
- [ ] Pull-to-refresh for manual updates
- [ ] Touch-friendly progress indicators
- [ ] Simplified queue management

### Performance
- [ ] Optimize for mobile data usage
- [ ] Reduce update frequency on mobile
- [ ] Minimize battery drain
- [ ] Handle background/foreground states

## Deliverables
- [ ] Complete qBittorrent API integration
- [ ] Download addition from search results
- [ ] Real-time progress monitoring
- [ ] Download queue management interface
- [ ] Batch operation controls
- [ ] Mobile-optimized download management

## Acceptance Criteria
- [ ] Can add torrents from search results
- [ ] Progress updates in real-time accurately
- [ ] Can pause/resume/delete individual torrents
- [ ] Batch operations work for multiple selections
- [ ] Queue management allows reordering
- [ ] Error states are clearly displayed
- [ ] Mobile interface is touch-friendly

## Testing Requirements
- [ ] Unit tests for download components
- [ ] Integration tests with mock qBittorrent API
- [ ] Real-time update testing
- [ ] Error handling scenario testing
- [ ] Performance testing with many active downloads

## Performance Metrics
- [ ] API response time under 500ms
- [ ] Update frequency of 2 seconds or configurable
- [ ] Smooth scrolling with large download lists
- [ ] Memory usage under 100MB
- [ ] Battery efficient on mobile devices

## Configuration Options
```typescript
interface DownloadConfig {
  updateInterval: number;        // Default: 2000ms
  maxConcurrentDownloads: number; // Default: 5
  defaultCategory: string;       // Default: "Uncategorized"
  autoDeleteRatio: number;       // Default: 2.0
  showCompletedTime: number;     // Default: 24 hours
}
```

## Next Steps
Upon completion, proceed to **PRP-05: File Management & History** to implement download history, file organization, and re-download capabilities.