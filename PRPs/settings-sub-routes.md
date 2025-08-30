name: "Settings Sub-Route Navigation PRP v1"
description: |
  Transform the existing settings page internal navigation into proper URL-based sub-routes 
  using Next.js App Router nested routing patterns

---

## Goal

**Feature Goal**: Transform the current settings page internal tab navigation into proper URL-based sub-routes where each settings section has its own route (e.g., `/settings` for General, `/settings/downloads` for Downloads, `/settings/bandwidth` for Bandwidth, etc.)

**Deliverable**: A restructured settings section with:
- 7 distinct URL routes for settings sections
- Proper Next.js nested routing structure
- Backward compatible navigation
- URL state persistence
- Direct link accessibility to specific settings sections

**Success Definition**: 
- Users can navigate directly to `/settings/downloads`, `/settings/bandwidth`, etc.
- Browser back/forward buttons work correctly
- URL reflects current settings section
- All existing settings functionality preserved
- Navigation is accessible and follows existing UI patterns

## User Persona

**Target User**: Torrent application administrators and power users

**Use Case**: Direct navigation to specific settings sections, bookmarking specific settings pages, sharing links to specific configuration areas

**User Journey**: 
1. User visits `/settings/downloads` directly or via navigation
2. Downloads settings section loads immediately
3. User can navigate between settings sections via sidebar
4. URL updates to reflect current section
5. User can bookmark or share specific settings URLs

**Pain Points Addressed**: 
- Cannot directly link to specific settings sections
- Browser navigation doesn't work within settings
- No URL state persistence when refreshing page

## Why

- **Direct Access**: Enable direct navigation to specific settings sections via URL
- **User Experience**: Improve navigation with browser back/forward support  
- **URL Sharing**: Allow users to bookmark and share links to specific settings
- **SEO/Crawling**: Enable proper indexing of settings sections
- **Consistency**: Align settings navigation with rest of application's routing patterns

## What

Transform the current single-route settings page (`/settings`) into a nested route structure:

```
/settings           → General settings (default/index)
/settings/downloads → Download settings  
/settings/bandwidth → Bandwidth settings
/settings/qbittorrent → qBittorrent integration settings
/settings/plex     → Plex integration settings
/settings/advanced → Advanced settings
/settings/backup   → Backup & Restore settings
```

### Success Criteria

- [ ] All 7 settings sections accessible via dedicated URLs
- [ ] Existing settings sidebar navigation preserved and functional
- [ ] URL updates when navigating between sections via sidebar
- [ ] Direct URL navigation works (e.g., typing `/settings/bandwidth`)
- [ ] Browser back/forward buttons navigate between settings sections
- [ ] Page refresh maintains current settings section
- [ ] All existing settings functionality preserved (save, validation, testing)
- [ ] Mobile navigation works correctly with new routing
- [ ] Accessibility standards maintained

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation context including existing settings architecture, Next.js routing patterns, navigation components, and all necessary file references for successful implementation._

### Documentation & References

```yaml
# MUST READ - Next.js App Router Documentation
- url: https://nextjs.org/docs/app/building-your-application/routing/defining-routes#nested-routes
  why: Core nested routing implementation patterns for settings sub-routes
  critical: Layout.tsx persistence patterns and route organization

- url: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates#layouts
  why: How to create persistent layouts that wrap nested routes
  critical: Layout component patterns for settings sidebar navigation

- url: https://nextjs.org/docs/app/api-reference/functions/use-pathname
  why: usePathname() hook for detecting current route and highlighting active navigation
  critical: Pattern for active state detection in nested routes

# CURRENT IMPLEMENTATION PATTERNS TO FOLLOW
- file: web-ui/src/components/settings/SettingsLayout.tsx
  why: Current settings implementation with sidebar navigation and section rendering
  pattern: State-based navigation structure, section management, save/validation logic  
  gotcha: Currently uses useState for activeSection - needs conversion to URL-based

- file: web-ui/src/app/settings/page.tsx
  why: Current settings route implementation (simple wrapper component)
  pattern: Basic page component structure that renders SettingsLayout
  gotcha: Will become the index route in nested structure

- file: web-ui/src/components/layout/Header.tsx
  why: Main navigation component showing usePathname() pattern for active states
  pattern: Navigation array structure, active state detection with pathname comparison
  gotcha: Uses exact pathname matching - important for sub-route highlighting

- file: web-ui/src/components/layout/Sidebar.tsx  
  why: Mobile navigation implementation with similar pathname-based active states
  pattern: Responsive navigation patterns, touch-friendly mobile design
  gotcha: 44px minimum touch targets, slide-out animation patterns

- file: web-ui/src/app/layout.tsx
  why: Root layout structure showing how layouts wrap page content
  pattern: HTML structure setup, global CSS imports, Layout component wrapping
  gotcha: This is where global providers are set up

# EXISTING SETTINGS SECTIONS TO PRESERVE
- file: web-ui/src/components/settings/sections/GeneralSection.tsx
  why: General settings form structure and validation patterns
  pattern: Form validation, settings state management, UI component usage

- file: web-ui/src/components/settings/sections/DownloadSection.tsx
  why: Download settings implementation showing form patterns
  pattern: Input components, validation, save handlers

- file: web-ui/src/components/settings/sections/BandwidthSection.tsx
  why: Complex form with scheduling and speed limit controls
  pattern: Advanced form controls, time scheduling components

- file: web-ui/src/components/settings/sections/QBittorrentSection.tsx
  why: Integration settings with connection testing functionality
  pattern: External service integration, connection testing UI

- file: web-ui/src/components/settings/sections/PlexSection.tsx
  why: Another integration settings example with testing
  pattern: Service integration forms, async validation

- file: web-ui/src/components/settings/sections/AdvancedSection.tsx
  why: Advanced configuration options and dangerous settings
  pattern: Advanced form controls, warning UI patterns

- file: web-ui/src/components/settings/backups/BackupManagement.tsx
  why: Backup and restore functionality
  pattern: File operations, import/export UI, confirmation dialogs

# SUPPORTING INFRASTRUCTURE TO UNDERSTAND
- file: web-ui/src/lib/services/SettingsService.ts
  why: Core settings business logic and validation rules
  pattern: Service layer patterns, validation implementation, caching
  gotcha: Extensive validation rules that must be preserved

- file: web-ui/src/hooks/use-settings.ts
  why: Settings state management hook with caching and optimistic updates
  pattern: Custom React hook patterns, SWR-like interface, state management
  gotcha: Complex caching and mutation logic that powers current settings

- file: web-ui/src/lib/types/settings.ts
  why: TypeScript definitions for all settings types
  pattern: Type definitions, validation schemas
  gotcha: Comprehensive type system that validates all settings

# API LAYER (NO CHANGES NEEDED)  
- file: web-ui/src/app/api/settings/route.ts
  why: Existing settings API - no changes required but important for context
  pattern: API route structure, CRUD operations
  gotcha: Already handles all settings operations - sub-routes are UI-only change
```

### Current Codebase tree (relevant sections)

```bash
web-ui/src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── settings/
│   │   └── page.tsx                 # Current settings route (will become index)
│   └── api/settings/                # API routes (no changes needed)
├── components/
│   ├── layout/
│   │   ├── Header.tsx               # Navigation patterns with usePathname()
│   │   ├── Sidebar.tsx              # Mobile navigation patterns
│   │   └── Layout.tsx               # Main app layout wrapper
│   └── settings/
│       ├── SettingsLayout.tsx       # Main settings component (needs refactor)
│       ├── sections/                # Individual settings sections (7 files)
│       │   ├── GeneralSection.tsx
│       │   ├── DownloadSection.tsx  
│       │   ├── BandwidthSection.tsx
│       │   ├── QBittorrentSection.tsx
│       │   ├── PlexSection.tsx
│       │   ├── AdvancedSection.tsx
│       │   └── [others]
│       └── backups/
│           └── BackupManagement.tsx
├── hooks/
│   └── use-settings.ts              # Settings state management
└── lib/
    ├── services/SettingsService.ts  # Settings business logic
    └── types/settings.ts            # Settings type definitions
```

### Desired Codebase tree with files to be added and responsibility

```bash
web-ui/src/app/settings/
├── layout.tsx                       # Settings layout with persistent sidebar navigation
├── page.tsx                        # General settings (default route)
├── downloads/
│   └── page.tsx                     # Downloads settings route
├── bandwidth/
│   └── page.tsx                     # Bandwidth settings route
├── qbittorrent/  
│   └── page.tsx                     # qBittorrent settings route
├── plex/
│   └── page.tsx                     # Plex settings route  
├── advanced/
│   └── page.tsx                     # Advanced settings route
└── backup/
    └── page.tsx                     # Backup & restore settings route

# NEW: Refactored components for route-based navigation
web-ui/src/components/settings/
├── SettingsLayout.tsx               # MODIFIED: Remove internal state, add route-based nav
└── navigation/
    ├── SettingsSidebar.tsx          # NEW: Extracted sidebar with Link components
    └── SettingsNavigation.tsx       # NEW: Navigation logic and active state detection
```

### Known Gotchas & Library Quirks

```typescript  
// CRITICAL: Next.js App Router requires 'use client' for interactive components
'use client' // Must be at top of components using useState, usePathname, etc.

// CRITICAL: usePathname() is only available in client components  
import { usePathname } from 'next/navigation'
const pathname = usePathname() // Returns current route path

// CRITICAL: Settings state management is complex
// The SettingsService handles validation, caching, persistence
// Must preserve all existing functionality when refactoring

// GOTCHA: Mobile navigation patterns require specific touch targets
// Minimum 44px touch targets for mobile accessibility
// Existing Sidebar.tsx shows correct mobile patterns

// GOTCHA: Settings sections have complex interdependencies
// Some settings affect others - validation rules must be preserved  
// SettingsService.ts contains critical business logic
```

## Implementation Blueprint

### Data models and structure

All existing data models and TypeScript types remain unchanged. The settings data structure, validation rules, and API contracts are preserved exactly as-is. This is purely a frontend routing refactor.

```typescript
// NO CHANGES NEEDED - Existing types remain the same
// web-ui/src/lib/types/settings.ts contains all necessary types
// web-ui/src/lib/services/SettingsService.ts contains all business logic
// web-ui/src/hooks/use-settings.ts provides state management interface
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE web-ui/src/app/settings/layout.tsx  
  - IMPLEMENT: Persistent layout wrapper with settings sidebar navigation
  - FOLLOW pattern: web-ui/src/app/layout.tsx (layout component structure)
  - EXTRACT: Sidebar navigation logic from SettingsLayout.tsx
  - REPLACE: State-based navigation with Link components pointing to sub-routes
  - NAMING: SettingsLayout component, follows layout.tsx naming convention
  - PLACEMENT: Settings root layout in app/settings/

Task 2: CREATE web-ui/src/components/settings/navigation/SettingsSidebar.tsx
  - IMPLEMENT: Navigation sidebar with Link components for each settings section
  - FOLLOW pattern: web-ui/src/components/layout/Sidebar.tsx (navigation structure, responsive design)
  - REPLACE: onClick state changes with Next.js Link components
  - INCLUDE: usePathname() for active state detection
  - NAMING: SettingsSidebar component, navigation item interface
  - DEPENDENCIES: Next.js Link, usePathname from next/navigation
  - PLACEMENT: New navigation directory under settings components

Task 3: MODIFY web-ui/src/app/settings/page.tsx
  - IMPLEMENT: General settings route (index route, default section)
  - FOLLOW pattern: existing page.tsx structure from other routes
  - RENDER: GeneralSection component directly (no layout wrapper needed)
  - PRESERVE: All existing general settings functionality
  - NAMING: Keep existing component structure
  - DEPENDENCIES: GeneralSection component, settings hooks

Task 4: CREATE web-ui/src/app/settings/downloads/page.tsx
  - IMPLEMENT: Downloads settings route page
  - FOLLOW pattern: web-ui/src/app/settings/page.tsx (simple page wrapper)
  - RENDER: DownloadSection component directly
  - PRESERVE: All existing download settings functionality  
  - NAMING: Page component, follows route naming convention
  - DEPENDENCIES: DownloadSection component, settings hooks

Task 5: CREATE web-ui/src/app/settings/bandwidth/page.tsx
  - IMPLEMENT: Bandwidth settings route page
  - FOLLOW pattern: web-ui/src/app/settings/downloads/page.tsx (consistent structure)
  - RENDER: BandwidthSection component directly
  - PRESERVE: All existing bandwidth settings functionality
  - NAMING: Page component, follows established pattern
  - DEPENDENCIES: BandwidthSection component, settings hooks

Task 6: CREATE web-ui/src/app/settings/qbittorrent/page.tsx
  - IMPLEMENT: qBittorrent settings route page
  - FOLLOW pattern: Previous settings page implementations
  - RENDER: QBittorrentSection component directly
  - PRESERVE: All existing qBittorrent integration functionality
  - NAMING: Page component, route name matches existing section
  - DEPENDENCIES: QBittorrentSection component, settings hooks

Task 7: CREATE web-ui/src/app/settings/plex/page.tsx
  - IMPLEMENT: Plex settings route page  
  - FOLLOW pattern: Previous settings page implementations
  - RENDER: PlexSection component directly
  - PRESERVE: All existing Plex integration functionality
  - NAMING: Page component, follows naming pattern
  - DEPENDENCIES: PlexSection component, settings hooks

Task 8: CREATE web-ui/src/app/settings/advanced/page.tsx
  - IMPLEMENT: Advanced settings route page
  - FOLLOW pattern: Previous settings page implementations  
  - RENDER: AdvancedSection component directly
  - PRESERVE: All existing advanced settings functionality
  - NAMING: Page component, follows established pattern
  - DEPENDENCIES: AdvancedSection component, settings hooks

Task 9: CREATE web-ui/src/app/settings/backup/page.tsx
  - IMPLEMENT: Backup & restore settings route page
  - FOLLOW pattern: Previous settings page implementations
  - RENDER: BackupManagement component directly
  - PRESERVE: All existing backup/restore functionality
  - NAMING: Page component, matches existing backup section
  - DEPENDENCIES: BackupManagement component, settings hooks

Task 10: MODIFY web-ui/src/components/settings/SettingsLayout.tsx (OPTIONAL CLEANUP)
  - REFACTOR: Remove internal state management and conditional rendering  
  - PRESERVE: Common settings functionality (save handlers, validation)
  - EXTRACT: Shared settings logic into reusable hooks if beneficial
  - CONSIDER: Whether this component is still needed or can be removed
  - NAMING: Maintain existing naming if kept
  - DEPENDENCIES: Shared settings functionality
```

### Implementation Patterns & Key Details

```typescript
// Settings layout pattern for persistent sidebar navigation
// web-ui/src/app/settings/layout.tsx
'use client'

import React from 'react'
import SettingsSidebar from '@/components/settings/navigation/SettingsSidebar'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Persistent sidebar navigation */}
        <div className="w-full sm:w-64 flex-shrink-0">
          <SettingsSidebar />
        </div>
        
        {/* Dynamic content area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}

// Navigation sidebar pattern with Link components
// web-ui/src/components/settings/navigation/SettingsSidebar.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigationItems = [
  { href: '/settings', label: 'General', exact: true },
  { href: '/settings/downloads', label: 'Downloads' },
  { href: '/settings/bandwidth', label: 'Bandwidth' },
  { href: '/settings/qbittorrent', label: 'qBittorrent' },
  { href: '/settings/plex', label: 'Plex Integration' },
  { href: '/settings/advanced', label: 'Advanced' },
  { href: '/settings/backup', label: 'Backup & Restore' },
]

export default function SettingsSidebar() {
  const pathname = usePathname()
  
  return (
    <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900 mb-4">Settings</h3>
      <ul className="space-y-2">
        {navigationItems.map((item) => {
          // CRITICAL: Handle exact matching for index route
          const isActive = item.exact 
            ? pathname === item.href
            : pathname.startsWith(item.href)
            
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Individual settings page pattern
// web-ui/src/app/settings/downloads/page.tsx
import React from 'react'
import DownloadSection from '@/components/settings/sections/DownloadSection'

const DownloadsSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Download Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure download paths, concurrent downloads, and auto-start behavior.
        </p>
      </div>
      
      <DownloadSection />
    </div>
  )
}

export default DownloadsSettingsPage
```

### Integration Points

```yaml
ROUTING:
  - modify: Next.js app router structure in web-ui/src/app/settings/
  - pattern: "Nested routing with layout.tsx for persistent navigation"

NAVIGATION:  
  - preserve: All existing settings functionality and state management
  - enhance: Add URL-based navigation with browser history support
  - pattern: "Link components replace onClick state changes"

COMPONENTS:
  - reuse: All existing settings section components without modification
  - extract: Navigation logic into dedicated sidebar component  
  - preserve: SettingsService, use-settings hook, validation logic
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint                         # ESLint checks for TypeScript and React
npm run type-check                   # TypeScript compilation check
npm run format                       # Prettier formatting

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Component Testing (Component Validation)

```bash
# Test Next.js development server
npm run dev

# Navigate to each route and verify:
curl -f http://localhost:3001/settings || echo "General settings failed"
curl -f http://localhost:3001/settings/downloads || echo "Downloads settings failed"  
curl -f http://localhost:3001/settings/bandwidth || echo "Bandwidth settings failed"
curl -f http://localhost:3001/settings/qbittorrent || echo "qBittorrent settings failed"
curl -f http://localhost:3001/settings/plex || echo "Plex settings failed"
curl -f http://localhost:3001/settings/advanced || echo "Advanced settings failed"
curl -f http://localhost:3001/settings/backup || echo "Backup settings failed"

# Expected: All routes load successfully without errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Start development server
npm run dev

# Manual testing checklist:
# 1. Navigate to /settings - should show General section
# 2. Click Downloads in sidebar - URL should change to /settings/downloads  
# 3. Browser back button - should return to /settings
# 4. Direct URL navigation to /settings/bandwidth - should work
# 5. Page refresh on /settings/advanced - should stay on advanced section
# 6. All settings functionality - save, validation, testing connections
# 7. Mobile navigation - sidebar should work on mobile devices

# Verify existing settings functionality preserved
echo "Test settings save functionality..."
echo "Test settings validation..."  
echo "Test connection testing for qBittorrent and Plex..."

# Expected: All navigation works, existing functionality preserved
```

### Level 4: Browser & Accessibility Validation

```bash
# Run Playwright tests (if available)
npx playwright test web-ui/e2e/ --grep="settings"

# Manual accessibility testing:
# - Tab navigation should work through sidebar links
# - Screen readers should announce route changes  
# - Focus management when navigating between routes
# - Mobile touch targets should be 44px minimum

# Performance validation
# - Route transitions should be instant (no loading)
# - No unnecessary re-renders of settings sections
# - Browser history should work correctly

# Cross-browser testing:
# - Chrome, Firefox, Safari, Edge
# - Mobile browsers (iOS Safari, Chrome Mobile)

# Expected: All browsers work correctly, accessibility maintained
```

## Final Validation Checklist

### Technical Validation

- [ ] All routes load successfully: `/settings`, `/settings/downloads`, `/settings/bandwidth`, `/settings/qbittorrent`, `/settings/plex`, `/settings/advanced`, `/settings/backup`
- [ ] No TypeScript errors: `npm run type-check`  
- [ ] No linting errors: `npm run lint`
- [ ] No formatting issues: `npm run format`
- [ ] Development server runs without warnings

### Feature Validation

- [ ] Direct URL navigation works for all settings routes
- [ ] Sidebar navigation updates URL correctly
- [ ] Browser back/forward buttons work between settings sections  
- [ ] Page refresh maintains current settings section
- [ ] Active navigation state highlights current section correctly
- [ ] All existing settings functionality preserved (save, validation, connection testing)

### Code Quality Validation

- [ ] Follows existing component patterns and naming conventions
- [ ] File placement matches Next.js App Router structure
- [ ] All TypeScript types properly used and no 'any' types
- [ ] Components use 'use client' directive where needed
- [ ] Navigation follows accessibility best practices (proper link semantics)

### User Experience Validation

- [ ] Mobile navigation works correctly with touch targets
- [ ] Responsive design maintains sidebar functionality  
- [ ] Route transitions are smooth and immediate
- [ ] URLs are bookmarkable and shareable
- [ ] Navigation is intuitive and matches existing app patterns

---

## Anti-Patterns to Avoid

- ❌ Don't modify existing settings section components - they should render exactly as before
- ❌ Don't change existing API routes or settings service logic
- ❌ Don't break existing mobile navigation patterns  
- ❌ Don't remove TypeScript types or validation rules
- ❌ Don't hardcode route URLs - use constants for maintainability
- ❌ Don't forget 'use client' directive for interactive components
- ❌ Don't ignore accessibility requirements for keyboard navigation