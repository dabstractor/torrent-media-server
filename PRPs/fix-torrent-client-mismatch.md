name: "Fix Torrent Client API Mismatch - Replace qBittorrent Frontend with Transmission Integration"
description: |

---

## Goal

**Feature Goal**: Replace the existing qBittorrent frontend integration with complete Transmission RPC API integration to match the Docker backend implementation, enabling proper torrent management functionality.

**Deliverable**: Fully functional Transmission API client, sync service, settings integration, and UI components that work with the existing Transmission Docker service.

**Success Definition**: All torrent management features (add, remove, pause, resume, settings sync) work correctly with Transmission backend, settings page shows "Transmission" instead of "qBittorrent", and all tests pass.

## User Persona

**Target User**: End users managing their personal media downloading system through the web UI

**Use Case**: Configure torrent client settings, sync bandwidth limits and scheduling preferences between web UI and Transmission daemon

**User Journey**: 
1. Navigate to Settings > Transmission
2. Enter Transmission connection details (URL, username, password)
3. Test connection to verify connectivity
4. Enable automatic settings synchronization
5. Configure bandwidth limits and scheduling in UI
6. Changes automatically sync to Transmission daemon

**Pain Points Addressed**: 
- Current complete disconnect between qBittorrent UI and Transmission backend
- Inability to configure or manage torrent client settings
- Settings page showing incorrect torrent client information

## Why

- **Critical Architecture Fix**: The current system has qBittorrent frontend code calling a Transmission backend, causing complete feature breakdown
- **User Experience**: Users cannot configure torrent settings or manage downloads due to API incompatibility
- **System Integrity**: Aligns frontend implementation with actual Docker infrastructure (Transmission service)
- **Future Development**: Enables proper torrent management features and download monitoring

## What

Replace the entire qBittorrent integration with Transmission RPC API integration:

### Success Criteria

- [ ] Transmission API client handles authentication and session management
- [ ] Settings page shows "Transmission" section instead of "qBittorrent"
- [ ] All bandwidth, scheduling, and download settings sync bidirectionally
- [ ] Connection testing works with Transmission RPC endpoint
- [ ] API proxy routes work with Transmission JSON-RPC protocol
- [ ] All existing tests pass with updated Transmission integration
- [ ] Docker environment variables align with new integration

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation details for someone with no prior knowledge of this codebase to successfully replace qBittorrent integration with Transmission RPC API integration._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- docfile: PRPs/ai_docs/transmission-api-integration.md
  why: Complete Transmission RPC API integration patterns, authentication, settings mapping
  section: All sections - comprehensive integration guide
  critical: Session ID handling, JSON-RPC protocol differences from REST API

- url: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
  why: Official Transmission RPC specification for all API methods
  critical: Authentication flow, request/response format, error handling

- file: web-ui/src/lib/api/clients/QBittorrentClient.ts
  why: Existing API client pattern for authentication, request handling, error management
  pattern: Class structure, private request method, session management, connection validation
  gotcha: Transmission uses JSON-RPC not REST API, session ID in headers not cookies

- file: web-ui/src/lib/services/QBittorrentSyncService.ts
  why: Service layer pattern for settings synchronization and auto-sync intervals
  pattern: Service initialization, bidirectional sync methods, conflict resolution
  gotcha: Settings field names different between qBittorrent and Transmission

- file: web-ui/src/lib/types/settings.ts
  why: Type definitions for settings integration and validation patterns
  pattern: AppSettings interface, settings categories, validation schemas
  gotcha: Need to add transmission section, remove/replace qbittorrent references

- file: web-ui/src/app/api/qbittorrent/[...path]/route.ts
  why: API proxy pattern currently misconfigured - uses TRANSMISSION_* env vars for qBittorrent
  pattern: Proxy route structure, environment variable usage, session management
  gotcha: Currently broken - qBittorrent API calls routed to Transmission env vars

- file: web-ui/src/components/settings/sections/QBittorrentSection.tsx
  why: Settings UI component pattern for client configuration forms
  pattern: React component structure, form handling, connection testing, error states
  gotcha: Component must be renamed and restructured for Transmission-specific fields
```

### Current Codebase Tree

```bash
web-ui/src/
├── app/api/
│   ├── qbittorrent/[...path]/route.ts  # BROKEN - qBittorrent API using Transmission env vars
│   └── settings/route.ts               # Settings persistence works
├── lib/
│   ├── api/clients/QBittorrentClient.ts      # REPLACE with TransmissionClient.ts
│   ├── services/QBittorrentSyncService.ts    # REPLACE with TransmissionSyncService.ts  
│   └── types/settings.ts                     # UPDATE - add transmission, remove qbittorrent
├── components/settings/
│   ├── sections/QBittorrentSection.tsx       # REPLACE with TransmissionSection.tsx
│   └── navigation/SettingsSidebar.tsx        # UPDATE - change qBittorrent to Transmission
└── hooks/use-qbittorrent-sync.ts             # REPLACE with use-transmission-sync.ts
```

### Desired Codebase Tree

```bash
web-ui/src/
├── app/api/
│   ├── transmission/[...path]/route.ts       # NEW - Transmission RPC proxy
│   └── settings/route.ts                     # No changes needed
├── lib/
│   ├── api/clients/TransmissionClient.ts     # NEW - RPC client with session management
│   ├── services/TransmissionSyncService.ts   # NEW - settings sync service
│   └── types/settings.ts                     # MODIFIED - transmission section added
├── components/settings/
│   ├── sections/TransmissionSection.tsx      # NEW - Transmission settings UI
│   └── navigation/SettingsSidebar.tsx        # MODIFIED - navigation updated
└── hooks/use-transmission-sync.ts            # NEW - sync hook for UI
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Transmission uses JSON-RPC, not REST API like qBittorrent
// All requests go to single /transmission/rpc endpoint with method in body
const request = {
  method: 'torrent-get',
  arguments: { fields: ['id', 'name', 'status'] }
};

// CRITICAL: Session ID management different from qBittorrent cookies
// Transmission uses X-Transmission-Session-Id header, requires 409 handling
if (response.status === 409) {
  this.sessionId = response.headers.get('X-Transmission-Session-Id');
}

// CRITICAL: Field naming convention different
// Transmission: 'speed-limit-down', qBittorrent: 'dl_limit'
// Transmission: 'alt-speed-time-begin' (minutes), qBittorrent: 'schedule_from_hour'

// CRITICAL: Authentication uses Basic Auth + session ID
headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
headers['X-Transmission-Session-Id'] = this.sessionId;
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// Add to web-ui/src/lib/types/settings.ts
export interface AppSettings {
  // ... existing fields ...
  
  transmission: {
    url: string;
    username: string;
    password: string;
    syncEnabled: boolean;
    syncInterval: number; // seconds
    autoLogin: boolean;
    trustSelfSignedCerts: boolean;
    scheduler: {
      enabled: boolean;
      fromHour: number;
      fromMin: number;
      toHour: number;
      toMin: number;
      days: number; // Bitmask: 1=Sunday, 2=Monday, 4=Tuesday...
    };
  };
}

export interface TransmissionPreferences {
  'speed-limit-down-enabled': boolean;
  'speed-limit-down': number;
  'speed-limit-up-enabled': boolean;
  'speed-limit-up': number;
  'alt-speed-enabled': boolean;
  'alt-speed-down': number;
  'alt-speed-up': number;
  'alt-speed-time-enabled': boolean;
  'alt-speed-time-begin': number; // minutes since midnight
  'alt-speed-time-end': number;
  'alt-speed-time-day': number; // bitmask
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'start-added-torrents': boolean;
  'download-dir': string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE web-ui/src/lib/api/clients/TransmissionClient.ts
  - IMPLEMENT: TransmissionClient class with JSON-RPC protocol support
  - FOLLOW pattern: web-ui/src/lib/api/clients/QBittorrentClient.ts (authentication, request handling, error management)
  - NAMING: TransmissionClient class, private request() method, session management
  - DEPENDENCIES: Use @brielov/transmission-rpc library for type safety
  - PLACEMENT: Replace QBittorrentClient functionality with Transmission RPC

Task 2: MODIFY web-ui/src/lib/types/settings.ts  
  - IMPLEMENT: Add transmission settings interface, remove qbittorrent references
  - FOLLOW pattern: Existing AppSettings structure and SETTINGS_CATEGORIES array
  - NAMING: transmission field in AppSettings, TransmissionPreferences interface
  - DEPENDENCIES: None - core type definitions
  - PLACEMENT: Add transmission to AppSettings, update SETTINGS_CATEGORIES

Task 3: CREATE web-ui/src/app/api/transmission/[...path]/route.ts
  - IMPLEMENT: Transmission RPC proxy with session ID and Basic Auth handling
  - FOLLOW pattern: web-ui/src/app/api/qbittorrent/[...path]/route.ts (proxy structure, environment variables)
  - NAMING: transmission proxy route, handleRPCRequest function
  - DEPENDENCIES: Use TRANSMISSION_* environment variables correctly
  - PLACEMENT: Replace broken qbittorrent proxy that uses wrong env vars

Task 4: CREATE web-ui/src/lib/services/TransmissionSyncService.ts
  - IMPLEMENT: Settings synchronization service with bidirectional sync
  - FOLLOW pattern: web-ui/src/lib/services/QBittorrentSyncService.ts (service structure, auto-sync, conflict resolution)
  - NAMING: TransmissionSyncService class, mapAppSettingsToTransmission method
  - DEPENDENCIES: Import TransmissionClient from Task 1, settings types from Task 2
  - PLACEMENT: Service layer for settings synchronization

Task 5: CREATE web-ui/src/components/settings/sections/TransmissionSection.tsx
  - IMPLEMENT: React component for Transmission settings UI
  - FOLLOW pattern: web-ui/src/components/settings/sections/QBittorrentSection.tsx (form structure, connection testing, error handling)
  - NAMING: TransmissionSection component, handleTransmissionUrlChange handlers
  - DEPENDENCIES: Import settings types from Task 2, use TransmissionSyncService for testing
  - PLACEMENT: Settings UI component for Transmission configuration

Task 6: MODIFY web-ui/src/components/settings/navigation/SettingsSidebar.tsx
  - IMPLEMENT: Update navigation to show Transmission instead of qBittorrent
  - FIND pattern: navigationItems array with href and label structure
  - ADD: Change '/settings/qbittorrent' to '/settings/transmission', update label
  - PRESERVE: All other navigation items and existing structure

Task 7: CREATE web-ui/src/app/settings/transmission/page.tsx
  - IMPLEMENT: Settings page for Transmission section
  - FOLLOW pattern: web-ui/src/app/settings/qbittorrent/page.tsx (page structure, settings loading)
  - NAMING: TransmissionSettingsPage component
  - DEPENDENCIES: Import TransmissionSection from Task 5
  - PLACEMENT: Settings page route for Transmission

Task 8: CREATE web-ui/src/hooks/use-transmission-sync.ts
  - IMPLEMENT: React hook for Transmission sync functionality
  - FOLLOW pattern: web-ui/src/hooks/use-qbittorrent-sync.ts (hook structure, state management)
  - NAMING: useTransmissionSync hook, sync state management
  - DEPENDENCIES: Import TransmissionSyncService from Task 4
  - PLACEMENT: React hook for UI integration

Task 9: MODIFY web-ui/src/app/api/status/route.ts
  - IMPLEMENT: Update service health check to use correct Transmission endpoint
  - FIND pattern: transmission health check using correct URL
  - PRESERVE: All other service status checks (prowlarr, plex, sonarr, radarr)

Task 10: UPDATE Environment and Docker Configuration
  - IMPLEMENT: Ensure docker-compose.yml and .env.example have correct Transmission variables
  - VERIFY: TRANSMISSION_URL, TRANSMISSION_USERNAME, TRANSMISSION_PASSWORD are properly configured
  - PLACEMENT: Root directory configuration files

Task 11: CREATE comprehensive test suite
  - IMPLEMENT: Unit tests for all new components following existing test patterns
  - FOLLOW pattern: web-ui/src/__tests__/ directory structure and testing approaches
  - COVERAGE: TransmissionClient, TransmissionSyncService, TransmissionSection, hooks
  - PLACEMENT: Tests in __tests__ directory mirroring source structure
```

### Implementation Patterns & Key Details

```typescript
// Transmission RPC Client Pattern
class TransmissionClient {
  private sessionId: string | null = null;
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://transmission:9091') {
    this.baseUrl = baseUrl;
  }

  private async request(method: string, arguments?: any): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // CRITICAL: Session ID in header, not cookie like qBittorrent
    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    // CRITICAL: Basic Auth for username/password
    if (this.username && this.password) {
      headers['Authorization'] = `Basic ${btoa(`${this.username}:${this.password}`)}`;
    }

    const response = await fetch(`${this.baseUrl}/transmission/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, arguments: arguments || {} })
    });

    // CRITICAL: Handle 409 for session ID requirement
    if (response.status === 409) {
      const newSessionId = response.headers.get('X-Transmission-Session-Id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        return this.request(method, arguments); // Retry with session ID
      }
    }

    const data = await response.json();
    if (data.result !== 'success') {
      throw new Error(`Transmission RPC error: ${data.result}`);
    }
    return data;
  }
}

// Settings Mapping Pattern - CRITICAL for proper sync
private mapAppSettingsToTransmission(appSettings: AppSettings): Partial<TransmissionPreferences> {
  return {
    // PATTERN: Bandwidth settings mapping
    'speed-limit-down-enabled': appSettings.downloads.globalDownloadLimit > 0,
    'speed-limit-down': appSettings.downloads.globalDownloadLimit,
    'speed-limit-up-enabled': appSettings.downloads.globalUploadLimit > 0,
    'speed-limit-up': appSettings.downloads.globalUploadLimit,
    
    // PATTERN: Alternative speed (scheduler) mapping
    'alt-speed-enabled': appSettings.bandwidth.alternativeEnabled,
    'alt-speed-down': appSettings.bandwidth.alternativeDownloadLimit,
    'alt-speed-up': appSettings.bandwidth.alternativeUploadLimit,
    
    // CRITICAL: Time conversion - Transmission uses minutes since midnight
    'alt-speed-time-enabled': appSettings.bandwidth.scheduler.enabled,
    'alt-speed-time-begin': appSettings.bandwidth.scheduler.fromHour * 60 + appSettings.bandwidth.scheduler.fromMin,
    'alt-speed-time-end': appSettings.bandwidth.scheduler.toHour * 60 + appSettings.bandwidth.scheduler.toMin,
    'alt-speed-time-day': appSettings.bandwidth.scheduler.days, // Bitmask format
    
    // PATTERN: Queue settings mapping  
    'download-queue-enabled': appSettings.downloads.maxConcurrentDownloads > 0,
    'download-queue-size': appSettings.downloads.maxConcurrentDownloads,
  };
}
```

### Integration Points

```yaml
DATABASE:
  - no migration: settings.ts database handles JSON serialization automatically
  - pattern: existing settings database schema supports transmission field

CONFIG:
  - verify: docker-compose.yml has TRANSMISSION_* environment variables
  - pattern: "TRANSMISSION_URL=http://transmission:9091"

ROUTES:
  - remove: web-ui/src/app/api/qbittorrent/[...path]/route.ts (broken implementation)
  - add: web-ui/src/app/api/transmission/[...path]/route.ts (correct JSON-RPC proxy)
  - modify: web-ui/src/app/api/status/route.ts (use transmission health check)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint web-ui/src/lib/api/clients/TransmissionClient.ts
npm run type-check web-ui/src/lib/api/clients/TransmissionClient.ts
npm run format web-ui/src/lib/api/clients/TransmissionClient.ts

# Project-wide validation after all changes
npm run lint 
npm run type-check
npm run format

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
npm test src/lib/api/clients/TransmissionClient.test.ts
npm test src/lib/services/TransmissionSyncService.test.ts
npm test src/components/settings/sections/TransmissionSection.test.tsx
npm test src/hooks/use-transmission-sync.test.ts

# Full test suite for affected areas
npm test src/lib/ --verbose
npm test src/components/settings/ --verbose
npm test src/hooks/ --verbose

# Coverage validation
npm run test:coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Web UI service startup
npm run dev &
sleep 5

# Health check validation - should show transmission connected
curl -f http://localhost:3000/api/status | jq '.services.transmission'

# Transmission API proxy validation
curl -X POST http://localhost:3000/api/transmission/session-get \
  -H "Content-Type: application/json" \
  -d '{"method": "session-get", "arguments": {}}' \
  | jq .

# Settings API validation
curl -X GET http://localhost:3000/api/settings | jq '.transmission'

# Settings page loads correctly
curl -f http://localhost:3000/settings/transmission

# Docker transmission service validation
docker exec transmission curl -f http://localhost:9091/transmission/web/

# Expected: All endpoints respond correctly, transmission service accessible
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual E2E Testing
# 1. Navigate to Settings > Transmission in browser
# 2. Enter Transmission connection details (localhost:9091, admin, adminpass)
# 3. Click "Test Connection" - should show success with version info
# 4. Enable sync, set bandwidth limits
# 5. Verify changes appear in Transmission daemon settings
# 6. Change settings directly in Transmission web UI
# 7. Verify sync service detects and updates app settings

# Docker Integration Validation
docker-compose up -d
docker logs transmission | grep "Started daemon"
docker logs web-ui | grep "Transmission connection test: success"

# Settings Sync Validation
# Test bidirectional sync by changing settings in both UI and Transmission daemon
# Verify conflicts are detected and resolved correctly

# Performance Testing (if requirements exist)
# Test settings sync with rapid changes
# Verify UI responsiveness with slow Transmission responses

# Expected: Complete user workflow works end-to-end
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format`

### Feature Validation

- [ ] Settings page shows "Transmission" instead of "qBittorrent"
- [ ] Connection test works with Transmission daemon
- [ ] Bandwidth settings sync from UI to Transmission
- [ ] Scheduler settings sync correctly (time format conversion)
- [ ] Auto-sync service runs without errors
- [ ] All download/upload limits applied correctly in Transmission
- [ ] Error cases show helpful messages (wrong credentials, service down)

### Code Quality Validation

- [ ] Follows existing codebase patterns from QBittorrentClient.ts
- [ ] File placement matches desired codebase tree structure
- [ ] Settings integration uses existing SettingsService infrastructure
- [ ] React components follow established UI patterns
- [ ] API proxy correctly handles Transmission JSON-RPC protocol
- [ ] Environment variables align with Docker configuration

### Documentation & Deployment

- [ ] All Transmission-related code is self-documenting
- [ ] Docker environment variables documented in .env.example
- [ ] Settings page help text reflects Transmission-specific details
- [ ] API errors provide actionable troubleshooting information

---

## Anti-Patterns to Avoid

- ❌ Don't mix qBittorrent and Transmission code - complete replacement required
- ❌ Don't ignore session ID 409 handling - Transmission requires this
- ❌ Don't use REST API patterns for JSON-RPC calls
- ❌ Don't forget time format conversion (minutes vs hours) in scheduler
- ❌ Don't skip connection validation - user needs immediate feedback
- ❌ Don't hardcode URLs - use environment variables consistently
- ❌ Don't break existing settings infrastructure - integrate with current system

---

**Confidence Score: 9/10** - This PRP provides comprehensive implementation details, complete API integration patterns, and follows all existing codebase conventions for one-pass implementation success.