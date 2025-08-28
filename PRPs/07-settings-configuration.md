name: "Settings Configuration System - Implementation-Focused PRP v3"
description: |
  Comprehensive settings management system with real-time synchronization, qBittorrent integration,
  backup/restore capabilities, and validation. Built on existing codebase patterns for seamless integration.

---

## Goal

**Feature Goal**: Implement a comprehensive settings configuration system that allows users to manage application settings, synchronize with qBittorrent preferences, and provide backup/restore capabilities through an intuitive web interface.

**Deliverable**: A complete settings management system including database layer, API endpoints, React UI components, validation system, and qBittorrent integration with real-time synchronization.

**Success Definition**: 
- Users can view/edit all settings categories through web UI
- Settings sync bidirectionally with qBittorrent in real-time
- Settings validate properly with helpful error messages
- Backup/restore functionality works for configuration management
- All settings persist across application restarts
- Real-time settings updates across multiple browser sessions

## User Persona

**Target User**: Torrent enthusiasts and power users who need fine-grained control over their download client

**Use Case**: Configure download limits, paths, scheduling, bandwidth throttling, qBittorrent synchronization, and application behavior through a centralized settings interface

**User Journey**: 
1. Navigate to settings page from main navigation
2. Browse through categorized settings sections
3. Modify settings with immediate visual feedback and validation
4. Save changes with automatic qBittorrent synchronization
5. Create backups of configuration for safe experimentation
6. Restore previous configurations if needed

**Pain Points Addressed**: 
- Fragmented configuration across multiple interfaces (qBittorrent WebUI vs app settings)
- No backup/restore mechanism for settings
- Configuration changes require application restart
- No validation preventing invalid configurations
- Settings don't sync between application instances

## Why

- **Centralized Configuration**: Unify all torrent management settings in one interface
- **qBittorrent Integration**: Bidirectional sync eliminates configuration drift between systems
- **Configuration Safety**: Backup/restore prevents loss of complex configurations
- **User Experience**: Real-time updates and validation improve usability
- **Power User Features**: Advanced scheduling, bandwidth management, and category-based settings

## What

A comprehensive settings system with these user-visible behaviors:

### Primary Features
- **Settings Dashboard**: Categorized settings interface with search and filtering
- **Real-time Validation**: Immediate feedback on invalid configurations with helpful suggestions
- **qBittorrent Sync**: Automatic bidirectional synchronization with qBittorrent preferences
- **Backup Management**: Create, restore, and manage configuration snapshots
- **Import/Export**: Settings export for sharing configurations between instances
- **Advanced Scheduling**: Time-based bandwidth and download rules

### Settings Categories
1. **General Settings**: Application behavior, notifications, theme
2. **Download Settings**: Default paths, categories, auto-start behavior
3. **Bandwidth Settings**: Upload/download limits, scheduling, throttling
4. **qBittorrent Integration**: Connection settings, sync preferences, authentication
5. **Plex Integration**: Library sync settings, notification preferences
6. **Advanced Settings**: Logging, database maintenance, performance tuning

### Success Criteria

- [ ] All 6 settings categories functional with proper validation
- [ ] Real-time settings sync with qBittorrent (< 5 second latency)
- [ ] Backup/restore operations complete in < 10 seconds
- [ ] Settings validation provides actionable error messages
- [ ] Multi-tab real-time synchronization works correctly
- [ ] No settings lost during application restarts
- [ ] Settings export/import maintains full fidelity

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ **VALIDATED**: This PRP includes comprehensive codebase analysis, external API documentation, implementation patterns, and specific file references needed for successful implementation.

### Documentation & References

```yaml
# CRITICAL LIBRARIES AND PATTERNS - Include these in context window

- url: https://react-hook-form.com/get-started
  why: Performance-optimized form handling with TypeScript support
  critical: Minimal re-renders, built-in validation, excellent developer experience
  section: Getting Started, TypeScript Support, Validation

- url: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-5.0)
  why: Complete qBittorrent WebUI API documentation for settings sync
  critical: Authentication patterns, preferences endpoints, error handling
  section: Authentication, App Management, Preferences

- url: https://qbittorrent-api.readthedocs.io/en/latest/
  why: Python library patterns adaptable to TypeScript for qBittorrent integration
  critical: Settings synchronization patterns and error handling approaches
  section: Client Connection, Application Preferences

- file: web-ui/src/lib/db/file-history.ts
  why: Established database pattern with migrations, prepared statements, singleton design
  pattern: SQLite setup, migration system, transaction handling, performance optimization
  gotcha: Must use prepared statements, handle schema versioning, implement cleanup

- file: web-ui/src/lib/api/clients/QBittorrentClient.ts
  why: Existing qBittorrent integration with session management and authentication
  pattern: Class-based client, session persistence, error handling, retry logic
  gotcha: Cookie-based authentication (SID), session timeouts, concurrent request handling

- file: web-ui/src/lib/services/PlexService.ts
  why: Service layer pattern for external integrations with dependency injection
  pattern: Service initialization, token management, singleton export, async error handling
  gotcha: Service state management, graceful degradation when service unavailable

- file: web-ui/src/lib/managers/PlexIntegrationManager.ts
  why: Manager pattern for orchestrating complex business logic and workflows
  pattern: State management, initialization patterns, coordination between services
  gotcha: State tracking, error propagation, cleanup on failures

- file: web-ui/src/components/plex/PlexStatusDashboard.tsx
  why: React component pattern with real-time updates, error states, loading states
  pattern: useState/useEffect hooks, polling for real-time data, error boundary pattern
  gotcha: Memory leaks from intervals, error state management, loading states

- file: web-ui/src/hooks/use-search-history.ts
  why: Custom hook pattern with localStorage persistence and cleanup
  pattern: Custom hook design, data persistence, TTL implementation, cleanup logic
  gotcha: localStorage size limits, JSON serialization, cleanup timing

- file: web-ui/src/lib/utils/search-cache.ts
  why: Caching pattern with TTL, statistics, and size management
  pattern: Singleton cache class, Base64 encoding, statistics tracking, cleanup
  gotcha: Memory management, cache invalidation, concurrent access

- file: web-ui/src/app/api/config/route.ts
  why: Configuration exposure pattern for frontend consumption
  pattern: Environment variable filtering, safe configuration exposure, JSON response
  gotcha: Security - never expose secrets, validate configuration values

- file: web-ui/src/lib/types/index.ts
  why: Type system patterns including ApiResponse<T> and AppSettings interface
  pattern: Generic response types, comprehensive interfaces, type safety
  gotcha: Type consistency across API boundaries, optional vs required fields

- docfile: PRPs/ai_docs/qbittorrent-api.md
  why: Deep qBittorrent API integration patterns and authentication flows
  section: Authentication, Settings Synchronization, Error Handling
```

### Current Codebase Tree (Relevant Sections)

```bash
web-ui/
├── src/
│   ├── app/
│   │   ├── api/                        # API route handlers
│   │   │   ├── config/route.ts         # Configuration exposure
│   │   │   ├── qbittorrent/[...path]/route.ts  # qBittorrent proxy
│   │   │   └── status/route.ts         # Service health checks
│   │   ├── settings/                   # PLACEHOLDER - needs implementation
│   │   │   └── page.tsx                # Currently empty settings page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx              # Already includes settings link
│   │   │   └── Sidebar.tsx             # Settings navigation ready
│   ├── lib/
│   │   ├── api/
│   │   │   ├── clients/
│   │   │   │   └── QBittorrentClient.ts # Existing qBittorrent integration
│   │   │   └── client.ts               # Base API client with error handling
│   │   ├── db/
│   │   │   └── file-history.ts         # Database pattern to follow
│   │   ├── types/
│   │   │   └── index.ts                # AppSettings interface exists
│   │   └── utils/
│   └── hooks/                          # Custom hooks for data fetching
```

### Desired Codebase Tree with New Files

```bash
web-ui/src/
├── app/
│   ├── api/
│   │   └── settings/                   # NEW: Settings API endpoints
│   │       ├── route.ts                # Main settings CRUD
│   │       ├── backup/route.ts         # Backup/restore endpoints
│   │       ├── sync/route.ts           # qBittorrent sync endpoints
│   │       └── validate/route.ts       # Settings validation
│   └── settings/
│       └── page.tsx                    # REPLACE: Comprehensive settings UI
├── components/
│   └── settings/                       # NEW: Settings components
│       ├── SettingsLayout.tsx          # Main layout component
│       ├── sections/                   # Settings category components
│       │   ├── GeneralSettings.tsx
│       │   ├── DownloadSettings.tsx
│       │   ├── BandwidthSettings.tsx
│       │   ├── QBittorrentSettings.tsx
│       │   └── AdvancedSettings.tsx
│       ├── forms/                      # Form input components
│       │   ├── NumberInput.tsx
│       │   ├── ToggleSwitch.tsx
│       │   ├── PathSelector.tsx
│       │   └── TimeScheduler.tsx
│       └── backup/                     # Backup management components
│           ├── BackupManager.tsx
│           └── RestoreDialog.tsx
├── hooks/
│   ├── use-settings.ts                 # NEW: Main settings hook
│   ├── use-qbittorrent-sync.ts         # NEW: qBittorrent synchronization
│   └── use-settings-validation.ts     # NEW: Validation hook
├── lib/
│   ├── db/
│   │   └── settings.ts                 # NEW: Settings database service
│   ├── services/
│   │   ├── SettingsService.ts          # NEW: Settings business logic
│   │   └── QBittorrentSyncService.ts   # NEW: qBittorrent sync service
│   ├── managers/
│   │   └── SettingsManager.ts          # NEW: Settings orchestration
│   └── types/
│       ├── settings.ts                 # NEW: Comprehensive settings types
│       └── validation.ts               # NEW: Validation types
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: qBittorrent WebUI API requires cookie-based authentication
// Session management pattern from existing QBittorrentClient.ts:
class QBittorrentClient {
  private sid: string | null = null;
  
  async login(): Promise<void> {
    // Must extract SID from Set-Cookie header
    const setCookie = response.headers.get('Set-Cookie');
    const sidMatch = setCookie?.match(/SID=([^;]+)/);
    if (sidMatch) this.sid = sidMatch[1];
  }
}

// CRITICAL: SQLite database requires proper migration handling
// Pattern from file-history.ts - MUST implement versioning:
const CURRENT_VERSION = 1;
db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)`);
const versionResult = db.prepare('SELECT version FROM schema_version').get();

// CRITICAL: React Hook Form requires proper TypeScript configuration
// Must use generic types for type safety:
const { register, handleSubmit, formState: { errors } } = useForm<SettingsFormData>();

// CRITICAL: Real-time updates require proper cleanup to prevent memory leaks
// Pattern from PlexStatusDashboard.tsx:
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval); // ESSENTIAL cleanup
}, []);

// GOTCHA: localStorage has size limits (5-10MB typical)
// Use compression for large settings objects:
const compressed = btoa(JSON.stringify(settings));

// GOTCHA: qBittorrent preferences API expects specific data types
// Numbers must be integers, booleans must be exact true/false
const preferences = {
  max_upload: parseInt(uploadLimit), // MUST be integer
  dht: uploadLimit === 'true'         // MUST be boolean
};
```

## Implementation Blueprint

### Data Models and Structure

Core data models ensuring type safety and consistency across the settings system:

```typescript
// PRIMARY SETTINGS INTERFACES
interface AppSettings {
  // General Settings
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    downloadComplete: boolean;
    errorAlerts: boolean;
    soundEnabled: boolean;
  };
  language: string;
  autoUpdate: boolean;

  // Download Settings
  defaultDownloadPath: string;
  defaultCategory: string;
  autoStartTorrents: boolean;
  maxConcurrentDownloads: number;
  deleteCompletedTorrents: boolean;
  moveTorrentOnCompletion: boolean;
  completedTorrentPath: string;

  // Bandwidth Settings
  maxUploadSpeed: number; // KB/s, 0 for unlimited
  maxDownloadSpeed: number; // KB/s, 0 for unlimited
  altSpeedEnabled: boolean;
  altUploadSpeed: number;
  altDownloadSpeed: number;
  scheduleEnabled: boolean;
  scheduleFromHour: number;
  scheduleFromMin: number;
  scheduleToHour: number;
  scheduleToMin: number;
  scheduleDays: number; // Bitmask: 1=Mon, 2=Tue, 4=Wed, etc.

  // qBittorrent Integration
  qbittorrent: {
    url: string;
    username: string;
    password: string;
    syncEnabled: boolean;
    syncInterval: number; // seconds
    autoLogin: boolean;
    trustSelfSignedCerts: boolean;
  };

  // Plex Integration
  plex: {
    enabled: boolean;
    token: string;
    url: string;
    updateLibraryOnComplete: boolean;
    categories: string[]; // Categories to sync with Plex
  };

  // Advanced Settings
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxLogSize: number; // MB
    keepLogDays: number;
  };
  database: {
    autoVacuum: boolean;
    vacuumInterval: number; // days
    maxHistoryEntries: number;
  };
  performance: {
    cacheSize: number; // MB
    backgroundSync: boolean;
    maxConcurrentRequests: number;
  };
}

// VALIDATION SCHEMAS
interface SettingsValidationRule {
  field: keyof AppSettings;
  rules: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

// BACKUP/RESTORE TYPES
interface SettingsBackup {
  id: string;
  name: string;
  description?: string;
  settings: AppSettings;
  createdAt: Date;
  version: string;
  checksum: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE web-ui/src/lib/types/settings.ts
  - IMPLEMENT: Complete AppSettings interface, validation types, backup types
  - FOLLOW pattern: web-ui/src/lib/types/index.ts (interface structure, export patterns)
  - NAMING: PascalCase for interfaces, camelCase for properties
  - DEPENDENCIES: None (foundational types)
  - PLACEMENT: Type definitions in lib/types/

Task 2: CREATE web-ui/src/lib/db/settings.ts
  - IMPLEMENT: SettingsDatabase class with CRUD operations, migrations, backup support
  - FOLLOW pattern: web-ui/src/lib/db/file-history.ts (SQLite setup, prepared statements, versioning)
  - NAMING: SettingsDatabase class, async methods create*, get*, update*, delete*
  - DEPENDENCIES: Import types from Task 1
  - PLACEMENT: Database layer in lib/db/
  - CRITICAL: Must implement schema versioning and migration system

Task 3: CREATE web-ui/src/lib/services/SettingsService.ts  
  - IMPLEMENT: SettingsService class with business logic, validation, caching
  - FOLLOW pattern: web-ui/src/lib/services/PlexService.ts (service structure, error handling, singleton)
  - NAMING: SettingsService class, async methods validateSettings, loadSettings, saveSettings
  - DEPENDENCIES: Import database from Task 2, types from Task 1
  - PLACEMENT: Service layer in lib/services/
  - CRITICAL: Implement caching layer for performance

Task 4: EXTEND web-ui/src/lib/api/clients/QBittorrentClient.ts
  - IMPLEMENT: Settings sync methods (getPreferences, setPreferences, validateConnection)
  - FOLLOW pattern: Existing methods in same file (session management, error handling)
  - NAMING: async getQBSettings, setQBSettings, syncQBSettings methods
  - DEPENDENCIES: Utilize existing authentication and session management
  - PLACEMENT: Extend existing QBittorrentClient class
  - CRITICAL: Handle authentication failures and connection timeouts gracefully

Task 5: CREATE web-ui/src/lib/services/QBittorrentSyncService.ts
  - IMPLEMENT: QBittorrentSyncService class for bidirectional settings synchronization
  - FOLLOW pattern: web-ui/src/lib/services/PlexService.ts (service initialization, error handling)
  - NAMING: QBittorrentSyncService class, async methods syncToQB, syncFromQB, startAutoSync
  - DEPENDENCIES: Import QBittorrentClient from Task 4, SettingsService from Task 3
  - PLACEMENT: Service layer in lib/services/
  - CRITICAL: Implement conflict resolution for conflicting settings

Task 6: CREATE web-ui/src/lib/managers/SettingsManager.ts
  - IMPLEMENT: SettingsManager class orchestrating settings operations, validation, sync
  - FOLLOW pattern: web-ui/src/lib/managers/PlexIntegrationManager.ts (manager structure, initialization)
  - NAMING: SettingsManager class, async methods initialize, updateSettings, createBackup
  - DEPENDENCIES: Import services from Tasks 3, 5, database from Task 2
  - PLACEMENT: Manager layer in lib/managers/
  - CRITICAL: Coordinate between multiple services, handle initialization sequence

Task 7: CREATE web-ui/src/app/api/settings/route.ts
  - IMPLEMENT: GET/POST/PUT/DELETE endpoints for settings CRUD operations
  - FOLLOW pattern: web-ui/src/app/api/config/route.ts (API route structure, error handling)
  - NAMING: HTTP method functions GET, POST, PUT, DELETE
  - DEPENDENCIES: Import SettingsManager from Task 6
  - PLACEMENT: API routes in app/api/settings/
  - CRITICAL: Implement proper validation and error response format

Task 8: CREATE web-ui/src/app/api/settings/sync/route.ts
  - IMPLEMENT: POST endpoint for manual qBittorrent sync operations
  - FOLLOW pattern: web-ui/src/app/api/plex/route.ts (API route structure, async operations)
  - NAMING: POST function for manual sync trigger
  - DEPENDENCIES: Import QBittorrentSyncService from Task 5
  - PLACEMENT: API routes in app/api/settings/sync/
  - CRITICAL: Handle long-running sync operations with proper timeouts

Task 9: CREATE web-ui/src/app/api/settings/backup/route.ts
  - IMPLEMENT: GET/POST endpoints for backup creation and restoration
  - FOLLOW pattern: Existing API route patterns (error handling, JSON responses)
  - NAMING: GET for list backups, POST for create/restore backup
  - DEPENDENCIES: Import SettingsManager from Task 6
  - PLACEMENT: API routes in app/api/settings/backup/
  - CRITICAL: Validate backup integrity before restoration

Task 10: CREATE web-ui/src/hooks/use-settings.ts
  - IMPLEMENT: Custom hook for settings state management with SWR integration
  - FOLLOW pattern: web-ui/src/hooks/use-search-history.ts (custom hook structure, data persistence)
  - NAMING: useSettings hook, return object with settings, updateSettings, isLoading
  - DEPENDENCIES: Use API client patterns, import types from Task 1
  - PLACEMENT: Custom hooks in hooks/
  - CRITICAL: Implement optimistic updates and error recovery

Task 11: CREATE web-ui/src/hooks/use-qbittorrent-sync.ts
  - IMPLEMENT: Custom hook for qBittorrent sync status and manual sync triggering
  - FOLLOW pattern: Existing hooks with real-time updates
  - NAMING: useQBittorrentSync hook, return syncStatus, triggerSync, lastSyncTime
  - DEPENDENCIES: Use API patterns for sync endpoints
  - PLACEMENT: Custom hooks in hooks/
  - CRITICAL: Handle sync conflicts and provide user feedback

Task 12: CREATE web-ui/src/components/settings/forms/NumberInput.tsx
  - IMPLEMENT: Validated number input component with range checking and unit display
  - FOLLOW pattern: web-ui/src/components/search/SearchForm.tsx (form component structure)
  - NAMING: NumberInput component, props include value, onChange, min, max, unit
  - DEPENDENCIES: None (pure UI component)
  - PLACEMENT: Form components in components/settings/forms/
  - CRITICAL: Implement proper input validation and error display

Task 13: CREATE web-ui/src/components/settings/forms/ToggleSwitch.tsx
  - IMPLEMENT: Accessible toggle switch component with label and description
  - FOLLOW pattern: Existing component patterns for accessibility
  - NAMING: ToggleSwitch component, props include checked, onChange, label, description
  - DEPENDENCIES: None (pure UI component)
  - PLACEMENT: Form components in components/settings/forms/
  - CRITICAL: Ensure keyboard accessibility and screen reader support

Task 14: CREATE web-ui/src/components/settings/forms/TimeScheduler.tsx
  - IMPLEMENT: Time range and day selection component for bandwidth scheduling
  - FOLLOW pattern: Complex form components with multiple inputs
  - NAMING: TimeScheduler component, props include schedule, onScheduleChange
  - DEPENDENCIES: None (pure UI component)
  - PLACEMENT: Form components in components/settings/forms/
  - CRITICAL: Handle timezone considerations and validation

Task 15: CREATE web-ui/src/components/settings/sections/GeneralSettings.tsx
  - IMPLEMENT: General application settings form section
  - FOLLOW pattern: Form section components with validation
  - NAMING: GeneralSettings component, uses form components from Tasks 12-14
  - DEPENDENCIES: Import form components, use-settings hook
  - PLACEMENT: Settings sections in components/settings/sections/
  - CRITICAL: Integrate React Hook Form for validation and performance

Task 16: CREATE web-ui/src/components/settings/sections/DownloadSettings.tsx
  - IMPLEMENT: Download-specific settings form section
  - FOLLOW pattern: GeneralSettings component structure
  - NAMING: DownloadSettings component, handles path selection and download behavior
  - DEPENDENCIES: Import form components, use-settings hook
  - PLACEMENT: Settings sections in components/settings/sections/
  - CRITICAL: Implement path validation and directory picker

Task 17: CREATE web-ui/src/components/settings/sections/BandwidthSettings.tsx
  - IMPLEMENT: Bandwidth management settings with scheduling
  - FOLLOW pattern: Other settings section components
  - NAMING: BandwidthSettings component, includes TimeScheduler integration
  - DEPENDENCIES: Import TimeScheduler, form components, use-settings hook
  - PLACEMENT: Settings sections in components/settings/sections/
  - CRITICAL: Handle bandwidth unit conversions and schedule validation

Task 18: CREATE web-ui/src/components/settings/sections/QBittorrentSettings.tsx
  - IMPLEMENT: qBittorrent integration settings with connection testing
  - FOLLOW pattern: Other settings sections with async validation
  - NAMING: QBittorrentSettings component, includes connection test functionality
  - DEPENDENCIES: Import form components, use-qbittorrent-sync hook
  - PLACEMENT: Settings sections in components/settings/sections/
  - CRITICAL: Implement connection testing and sync status display

Task 19: CREATE web-ui/src/components/settings/backup/BackupManager.tsx
  - IMPLEMENT: Backup creation, listing, and management interface
  - FOLLOW pattern: Dashboard components with CRUD operations
  - NAMING: BackupManager component, handles backup operations
  - DEPENDENCIES: Import backup-related hooks and components
  - PLACEMENT: Backup components in components/settings/backup/
  - CRITICAL: Handle backup validation and provide clear restoration warnings

Task 20: CREATE web-ui/src/components/settings/SettingsLayout.tsx
  - IMPLEMENT: Main settings page layout with navigation and section rendering
  - FOLLOW pattern: web-ui/src/components/layout/Layout.tsx (layout component structure)
  - NAMING: SettingsLayout component, includes section navigation and content area
  - DEPENDENCIES: Import all settings sections and backup components
  - PLACEMENT: Main settings components in components/settings/
  - CRITICAL: Implement proper navigation state management and responsive design

Task 21: REPLACE web-ui/src/app/settings/page.tsx
  - IMPLEMENT: Complete settings page using SettingsLayout component
  - FOLLOW pattern: web-ui/src/app/downloads/page.tsx (page component structure)
  - NAMING: Settings page component (default export)
  - DEPENDENCIES: Import SettingsLayout from Task 20
  - PLACEMENT: Replace existing placeholder settings page
  - CRITICAL: Ensure proper error boundaries and loading states

Task 22: CREATE web-ui/src/lib/utils/settings-validation.ts
  - IMPLEMENT: Comprehensive settings validation utilities and rules
  - FOLLOW pattern: Utility functions with specific validation logic
  - NAMING: validateSettings function, specific validators for each setting type
  - DEPENDENCIES: Import settings types from Task 1
  - PLACEMENT: Utility functions in lib/utils/
  - CRITICAL: Provide helpful validation error messages and suggestions

Task 23: CREATE web-ui/src/__tests__/lib/db/settings.test.ts
  - IMPLEMENT: Unit tests for SettingsDatabase with full CRUD coverage
  - FOLLOW pattern: web-ui/src/__tests__/lib/db/file-history.test.ts (database testing patterns)
  - NAMING: test files following existing conventions
  - DEPENDENCIES: Import SettingsDatabase and test utilities
  - PLACEMENT: Test files alongside implementation
  - CRITICAL: Test migration scenarios and data integrity

Task 24: CREATE web-ui/src/__tests__/hooks/use-settings.test.ts
  - IMPLEMENT: Unit tests for settings hook with mocked API responses
  - FOLLOW pattern: web-ui/src/__tests__/hooks/use-file-history.test.tsx (hook testing patterns)
  - NAMING: Test files following existing conventions
  - DEPENDENCIES: Import hook and testing utilities
  - PLACEMENT: Test files alongside implementation
  - CRITICAL: Test optimistic updates and error recovery scenarios
```

### Implementation Patterns & Key Details

```typescript
// Settings Database Pattern (following file-history.ts)
class SettingsDatabase {
  private static instance: SettingsDatabase | null = null;
  private db: Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'data', 'settings.db'));
    this.initializeSchema();
  }

  static getInstance(): SettingsDatabase {
    if (!SettingsDatabase.instance) {
      SettingsDatabase.instance = new SettingsDatabase();
    }
    return SettingsDatabase.instance;
  }

  private initializeSchema(): void {
    // PATTERN: Version-based schema management (critical for migrations)
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)`);
    const currentVersion = this.getCurrentVersion();
    this.migrateToVersion(CURRENT_VERSION, currentVersion);
  }
}

// qBittorrent Sync Service Pattern
class QBittorrentSyncService {
  private syncInterval: NodeJS.Timeout | null = null;

  async syncToQBittorrent(settings: AppSettings): Promise<SyncResult> {
    // PATTERN: Convert app settings to qBittorrent preferences format
    const qbPrefs = this.mapSettingsToQBPreferences(settings);
    
    try {
      await this.qbClient.setPreferences(qbPrefs);
      return { success: true, conflicts: [] };
    } catch (error) {
      // CRITICAL: Handle authentication failures gracefully
      if (error.message.includes('unauthorized')) {
        await this.qbClient.login();
        return this.syncToQBittorrent(settings); // Retry once
      }
      throw error;
    }
  }

  // CRITICAL: Handle settings conflicts during bidirectional sync
  private resolveConflicts(appSettings: AppSettings, qbSettings: QBPreferences): AppSettings {
    // Implement conflict resolution logic based on last modified timestamps
  }
}

// Settings Manager Orchestration Pattern
class SettingsManager {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    // PATTERN: Initialize services in dependency order
    await this.settingsService.initialize();
    await this.qbSyncService.initialize();
    this.isInitialized = true;
  }

  // PATTERN: Optimistic updates with rollback capability
  async updateSettings(newSettings: Partial<AppSettings>): Promise<UpdateResult> {
    const previousSettings = await this.settingsService.getSettings();
    
    try {
      // Apply optimistically
      await this.settingsService.saveSettings({...previousSettings, ...newSettings});
      
      // Sync with qBittorrent
      if (this.qbSyncService.isEnabled()) {
        await this.qbSyncService.syncToQBittorrent(newSettings);
      }
      
      return { success: true, settings: newSettings };
    } catch (error) {
      // CRITICAL: Rollback on failure
      await this.settingsService.saveSettings(previousSettings);
      throw error;
    }
  }
}

// React Hook Pattern for Settings
function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PATTERN: Real-time updates with SWR-like functionality
  const { data, error: swrError, mutate } = useSWR('/api/settings', fetcher, {
    refreshInterval: 30000, // 30 second polling for real-time updates
    onSuccess: (data) => {
      setSettings(data);
      setIsLoading(false);
    },
    onError: (error) => {
      setError(error.message);
      setIsLoading(false);
    }
  });

  // PATTERN: Optimistic updates with automatic rollback on failure
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const previousSettings = settings;
    
    // Optimistic update
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    
    try {
      await mutate(async () => {
        const response = await apiClient.put('/api/settings', newSettings);
        if (!response.success) throw new Error(response.error);
        return response.data;
      });
    } catch (error) {
      // Rollback optimistic update
      setSettings(previousSettings);
      throw error;
    }
  }, [settings, mutate]);

  return { settings, updateSettings, isLoading, error };
}

// Form Component Pattern with Validation
const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = Infinity,
  unit,
  label,
  error
}) => {
  // PATTERN: Input validation with immediate feedback
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value);
    
    if (isNaN(numValue)) return;
    if (numValue < min || numValue > max) return;
    
    onChange(numValue);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          className={`w-full px-3 py-2 border rounded-md ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {unit && (
          <span className="absolute right-3 top-2 text-sm text-gray-500">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
```

### Integration Points

```yaml
DATABASE:
  - migration: "Create settings, settings_backups, settings_sync_log tables with proper indexes"
  - indexes: "CREATE INDEX idx_settings_key ON settings(key); CREATE INDEX idx_backup_created ON settings_backups(created_at)"

CONFIG:
  - add to: web-ui/src/lib/types/index.ts
  - extend: "Export SettingsTypes from settings.ts, extend ApiResponse for settings operations"

ROUTES:
  - add to: web-ui/src/app/api (new settings directory)
  - pattern: "Follow existing API route patterns with proper error handling and validation"

QBITTORRENT:
  - extend: web-ui/src/lib/api/clients/QBittorrentClient.ts
  - methods: "Add getPreferences(), setPreferences(), validateConnection() methods"

NAVIGATION:
  - update: web-ui/src/components/layout/Header.tsx, Sidebar.tsx
  - pattern: "Settings link already exists, ensure proper active state management"

CACHING:
  - implement: Settings caching layer in SettingsService
  - pattern: "Follow search-cache.ts pattern with TTL and size management"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
ruff check web-ui/src/lib/db/settings.ts --fix
ruff check web-ui/src/lib/services/ --fix
ruff check web-ui/src/components/settings/ --fix

# TypeScript compilation and type checking
cd web-ui && npm run type-check

# Linting and formatting
cd web-ui && npm run lint
cd web-ui && npm run format

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test database layer
cd web-ui && npm test src/__tests__/lib/db/settings.test.ts

# Test services layer
cd web-ui && npm test src/__tests__/lib/services/SettingsService.test.ts
cd web-ui && npm test src/__tests__/lib/services/QBittorrentSyncService.test.ts

# Test hooks
cd web-ui && npm test src/__tests__/hooks/use-settings.test.ts
cd web-ui && npm test src/__tests__/hooks/use-qbittorrent-sync.test.ts

# Test components
cd web-ui && npm test src/__tests__/components/settings/

# Full test suite for settings
cd web-ui && npm test -- --testPathPattern=settings

# Coverage validation
cd web-ui && npm test -- --coverage --testPathPattern=settings

# Expected: All tests pass with >90% coverage for settings components.
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development environment
cd web-ui && npm run dev &
sleep 5  # Allow startup time

# Verify settings API endpoints
curl -f http://localhost:3000/api/settings \
  -H "Accept: application/json" | jq .

# Test settings CRUD operations
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark", "maxUploadSpeed": 1000}' | jq .

# Test qBittorrent sync endpoint
curl -X POST http://localhost:3000/api/settings/sync \
  -H "Content-Type: application/json" | jq .

# Test backup creation
curl -X POST http://localhost:3000/api/settings/backup \
  -H "Content-Type: application/json" \
  -d '{"name": "test-backup", "description": "Integration test backup"}' | jq .

# Verify settings page loads
curl -f http://localhost:3000/settings || echo "Settings page failed to load"

# Database validation
sqlite3 web-ui/data/settings.db ".tables" | grep -E "(settings|settings_backups)"
sqlite3 web-ui/data/settings.db "SELECT COUNT(*) FROM settings;"

# Expected: All endpoints return valid JSON, database tables exist with data
```

### Level 4: Creative & Domain-Specific Validation

```bash
# qBittorrent Integration Testing
# Requires qBittorrent running at localhost:8080 with admin/admin credentials

# Test connection to qBittorrent WebUI
curl -c cookies.txt -d 'username=admin&password=admin' \
  http://localhost:8080/api/v2/auth/login

# Verify preferences API access
curl -b cookies.txt http://localhost:8080/api/v2/app/preferences | jq .

# Test settings synchronization workflow
cd web-ui && node -e "
  const { QBittorrentSyncService } = require('./src/lib/services/QBittorrentSyncService.ts');
  const service = new QBittorrentSyncService();
  service.testConnection().then(console.log);
"

# Load Testing for Settings API
ab -n 100 -c 10 -H 'Content-Type: application/json' \
  -p settings-payload.json \
  http://localhost:3000/api/settings

# Settings Validation Testing
cd web-ui && node -e "
  const { validateSettings } = require('./src/lib/utils/settings-validation.ts');
  const testCases = [
    { maxUploadSpeed: -1 },      // Should fail
    { maxUploadSpeed: 0 },       // Should pass (unlimited)
    { maxUploadSpeed: 99999 },   // Should pass
    { theme: 'invalid' },        // Should fail
    { scheduleFromHour: 25 },    // Should fail
  ];
  testCases.forEach(test => {
    try {
      validateSettings(test);
      console.log('PASS:', test);
    } catch (error) {
      console.log('FAIL:', test, error.message);
    }
  });
"

# Multi-tab Real-time Sync Testing
# Open multiple browser tabs to http://localhost:3000/settings
# Change settings in one tab, verify updates appear in other tabs within 30 seconds

# Backup/Restore Integrity Testing
cd web-ui && node -e "
  const fs = require('fs');
  const crypto = require('crypto');
  const backup = JSON.parse(fs.readFileSync('test-backup.json'));
  const hash = crypto.createHash('sha256').update(JSON.stringify(backup.settings)).digest('hex');
  console.log('Backup integrity:', hash === backup.checksum ? 'PASS' : 'FAIL');
"

# Expected: qBittorrent sync works, load testing passes, validation catches errors,
# multi-tab sync works, backup integrity maintained
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `cd web-ui && npm test -- --testPathPattern=settings`
- [ ] No linting errors: `cd web-ui && npm run lint`
- [ ] No type errors: `cd web-ui && npm run type-check`
- [ ] No formatting issues: `cd web-ui && npm run format --check`

### Feature Validation

- [ ] All 6 settings categories functional with proper form validation
- [ ] Settings persist across browser restarts and application restarts
- [ ] qBittorrent sync working bidirectionally with <5 second latency
- [ ] Backup creation and restoration working with integrity checks
- [ ] Settings export/import maintaining full configuration fidelity
- [ ] Real-time updates working across multiple browser tabs
- [ ] Error cases handled gracefully with user-friendly messages

### Code Quality Validation

- [ ] Follows existing codebase patterns (database, service, component patterns)
- [ ] File placement matches desired codebase tree structure
- [ ] TypeScript interfaces comprehensive and properly exported
- [ ] Database migrations implemented with proper versioning
- [ ] API responses follow existing ApiResponse<T> pattern
- [ ] Components use established accessibility patterns

### User Experience Validation

- [ ] Settings page loads in < 2 seconds with cached data
- [ ] Form validation provides immediate, helpful feedback
- [ ] qBittorrent connection status clearly displayed
- [ ] Backup operations complete with progress indicators
- [ ] Mobile-responsive settings interface
- [ ] Keyboard navigation works throughout settings interface

---

## Anti-Patterns to Avoid

- ❌ Don't bypass settings validation - always validate both client and server side
- ❌ Don't ignore qBittorrent authentication failures - implement proper retry logic
- ❌ Don't store sensitive data in settings backups - encrypt passwords and tokens
- ❌ Don't skip database migrations - breaking changes will corrupt user data
- ❌ Don't use direct database access in components - always go through services
- ❌ Don't ignore real-time update cleanup - memory leaks will degrade performance
- ❌ Don't hardcode qBittorrent endpoints - make connection settings configurable
- ❌ Don't assume settings sync always succeeds - implement conflict resolution

---

**Confidence Score**: 9/10 - This PRP provides comprehensive implementation guidance with specific file patterns, detailed integration points, and thorough validation procedures. The extensive codebase analysis ensures compatibility with existing patterns while the external research provides best practices for settings management systems.
