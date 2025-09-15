name: "016 - Services Dashboard Page with Dynamic Environment Variable Links"
description: |

---

## Goal

**Feature Goal**: Create a comprehensive Services page in the web UI that dynamically displays links to all available service web interfaces using environment variables from the current Docker Compose configuration.

**Deliverable**: A new Services page at `/services` that displays service cards for qBittorrent, Prowlarr, Radarr, Sonarr, and Plex with health status indicators and direct access links.

**Success Definition**: Services page displays all configured services with correct URLs, shows health status, opens services in new tabs, and integrates seamlessly with existing navigation patterns.

## User Persona

**Target User**: System administrators and media server operators managing the torrents-services stack

**Use Case**: Need quick access to all service web UIs without memorizing ports or looking up configurations

**User Journey**:
1. Navigate to Services page from main navigation
2. View all available services with health status
3. Click service links to open web interfaces in new tabs
4. Monitor service availability at a glance

**Pain Points Addressed**:
- Eliminates need to remember service ports and URLs
- Provides centralized service management dashboard
- Reduces time spent switching between different service interfaces

## Why

- **Operational Efficiency**: Centralized access to all service web UIs reduces administrative overhead
- **Dynamic Configuration**: Uses environment variables to adapt to different deployment configurations
- **Status Monitoring**: Visual health checks provide immediate service availability feedback
- **User Experience**: Consistent with existing web UI navigation and design patterns

## What

A new Services page that displays service cards for all configured Docker services with:
- Dynamic URL generation from environment variables
- Health status indicators with real-time checks
- Direct links to service web interfaces
- Responsive grid layout matching existing design patterns
- Integration with existing navigation sidebar

### Success Criteria

- [ ] Services page accessible via `/services` route
- [ ] Navigation includes "Services" link in sidebar
- [ ] All services display with correct proxy/direct URLs
- [ ] Health status shows green/red indicators
- [ ] Links open services in new tabs
- [ ] Page follows existing responsive design patterns
- [ ] Component tests achieve 70% coverage threshold
- [ ] TypeScript type safety with no type errors

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully? This PRP provides comprehensive patterns, environment variables, testing setup, and specific implementation guidance._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://github.com/gethomepage/homepage
  why: Comprehensive service dashboard patterns and Docker service integration examples
  critical: Service health check implementation and environment variable configuration

- url: https://github.com/webscopeio/react-health-check
  why: React hook patterns for API health monitoring with SWR-like patterns
  critical: Proper error handling and loading states for service checks

- file: web-ui/src/components/layout/Sidebar.tsx
  why: Navigation integration pattern - adding new routes to navItems array
  pattern: Sidebar navigation structure with proper href/label configuration
  gotcha: Must add Services link to navItems array for navigation

- file: web-ui/src/app/status/page.tsx
  why: Simple page structure pattern for new routes
  pattern: Basic page component structure with proper TypeScript exports
  gotcha: Follows Next.js 13+ app router patterns with page.tsx naming

- file: web-ui/src/app/page.tsx
  why: Complex page with Suspense and hooks pattern
  pattern: Client component with Suspense boundary and loading states
  gotcha: Must wrap useSearchParams usage in Suspense boundary

- file: web-ui/src/app/api/config/route.ts
  why: Environment variable access pattern for service URLs
  pattern: Server-side environment variable exposure to client
  gotcha: Only expose safe variables, provide fallback defaults

- file: web-ui/__tests__/components/HomePage.test.tsx
  why: Component testing patterns with mocking
  pattern: Jest + React Testing Library setup with Next.js and Lucide mocks
  gotcha: Must mock Next.js Link and Lucide React icons
```

### Current Codebase Structure

```bash
torrents-services/
├── web-ui/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout with ThemeProvider
│   │   │   ├── page.tsx                # Search page (home)
│   │   │   ├── status/page.tsx         # Simple status page
│   │   │   ├── settings/page.tsx       # Settings page
│   │   │   └── api/config/route.ts     # Environment config API
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx          # Main layout component
│   │   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   │   ├── Header.tsx          # App header
│   │   │   │   └── Footer.tsx          # App footer
│   │   │   ├── common/
│   │   │   │   ├── LoadingSpinner.tsx  # Loading component
│   │   │   │   ├── ErrorMessage.tsx    # Error display
│   │   │   │   └── ErrorBoundary.tsx   # Error boundary
│   │   │   └── ServiceStatus.tsx       # Existing service status component
│   │   ├── hooks/
│   │   │   ├── use-service-status.ts   # Service status hook
│   │   │   └── use-settings.ts         # Settings management hook
│   │   └── __tests__/
│   │       └── components/             # Component tests location
│   ├── package.json                    # npm scripts and dependencies
│   └── jest.config.js                  # Testing configuration
├── docker-compose.yml                  # Service definitions and ports
├── .env                               # Environment variables
└── CLAUDE.md                         # Project constraints (VPN isolation)
```

### Desired Codebase Structure with New Files

```bash
torrents-services/web-ui/src/
├── app/
│   └── services/
│       └── page.tsx                    # NEW: Services dashboard page
├── components/
│   └── services/
│       ├── ServicesPage.tsx           # NEW: Main services page component
│       ├── ServiceCard.tsx            # NEW: Individual service card
│       ├── ServiceGrid.tsx            # NEW: Grid layout component
│       └── ServiceStatus.tsx          # NEW: Health status indicator
├── hooks/
│   ├── use-service-config.ts          # NEW: Service configuration hook
│   └── use-health-check.ts            # NEW: Health checking hook
├── lib/
│   └── types/
│       └── services.ts                # NEW: Service type definitions
└── __tests__/
    └── components/
        └── services/
            ├── ServicesPage.test.tsx  # NEW: Page component tests
            ├── ServiceCard.test.tsx   # NEW: Card component tests
            └── ServiceGrid.test.tsx   # NEW: Grid component tests
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: qBittorrent MUST remain VPN-isolated via network_mode: "container:vpn"
// NO direct port exposure - access only through nginx proxy for security

// Next.js 13+ App Router: Client components need 'use client' directive
// Suspense boundaries required for useSearchParams and other client hooks

// Environment Variables: Server-side only unless NEXT_PUBLIC_ prefix
// Must use API routes to expose environment variables to client

// VPN Network Isolation: qBittorrent uses VPN container network
// Access via: http://vpn:8081 internally, proxy port externally

// Health Check Endpoints: Different paths for each service
// - Prowlarr: /api/v1/system/status (needs API key)
// - Sonarr: /api/v3/system/status (needs API key)
// - Radarr: /api/v3/system/status (needs API key)
// - qBittorrent: / (basic HTTP check)
// - Plex: /web/index.html (basic HTTP check)

// Testing: Must mock Next.js components and Lucide React icons
// Coverage threshold: 70% for branches, functions, lines, statements
```

## Implementation Blueprint

### Data Models and Structure

Create type-safe service configuration models for consistency and validation.

```typescript
// src/lib/types/services.ts
export interface ServiceConfig {
  id: string
  name: string
  description: string
  icon: string
  url: string
  healthEndpoint: string
  requiresAuth: boolean
  category: 'media' | 'download' | 'indexer' | 'proxy'
}

export interface ServiceHealth {
  available: boolean
  lastCheck: Date | null
  status?: number
  error?: string
  responseTime?: number
}

export interface ServiceCardProps {
  service: ServiceConfig
  health: ServiceHealth
  loading: boolean
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/lib/types/services.ts
  - IMPLEMENT: ServiceConfig, ServiceHealth, ServiceCardProps interfaces
  - FOLLOW pattern: src/lib/types/index.ts (type definition structure)
  - NAMING: PascalCase for interfaces, camelCase for properties
  - PLACEMENT: Type definitions in src/lib/types/

Task 2: CREATE src/hooks/use-service-config.ts
  - IMPLEMENT: Service configuration hook with environment variable mapping
  - FOLLOW pattern: src/hooks/use-settings.ts (hook structure and error handling)
  - NAMING: useServiceConfig hook, camelCase for function names
  - DEPENDENCIES: Import ServiceConfig type from Task 1
  - PLACEMENT: Custom hooks in src/hooks/

Task 3: CREATE src/hooks/use-health-check.ts
  - IMPLEMENT: Health checking hook with polling and error handling
  - FOLLOW pattern: src/hooks/use-service-status.ts (status checking approach)
  - NAMING: useHealthCheck hook, async health checking function
  - DEPENDENCIES: Import ServiceHealth type from Task 1
  - PLACEMENT: Custom hooks in src/hooks/

Task 4: CREATE src/components/services/ServiceStatus.tsx
  - IMPLEMENT: Health status indicator component with visual feedback
  - FOLLOW pattern: src/components/common/LoadingSpinner.tsx (simple UI component)
  - NAMING: ServiceStatus component, status-related prop interfaces
  - DEPENDENCIES: Import ServiceHealth type from Task 1
  - PLACEMENT: Service components in src/components/services/

Task 5: CREATE src/components/services/ServiceCard.tsx
  - IMPLEMENT: Individual service card with link and status display
  - FOLLOW pattern: src/components/search/TorrentCard.tsx (card component structure)
  - NAMING: ServiceCard component, service-related props
  - DEPENDENCIES: Import ServiceCardProps from Task 1, ServiceStatus from Task 4
  - PLACEMENT: Service components in src/components/services/

Task 6: CREATE src/components/services/ServiceGrid.tsx
  - IMPLEMENT: Responsive grid layout for service cards
  - FOLLOW pattern: src/components/search/SearchResults.tsx (grid layout patterns)
  - NAMING: ServiceGrid component, grid-related props
  - DEPENDENCIES: Import ServiceCard from Task 5
  - PLACEMENT: Service components in src/components/services/

Task 7: CREATE src/components/services/ServicesPage.tsx
  - IMPLEMENT: Main page component orchestrating all service components
  - FOLLOW pattern: src/app/page.tsx (complex page with hooks and state)
  - NAMING: ServicesPage component, page-level state management
  - DEPENDENCIES: Import hooks from Tasks 2-3, ServiceGrid from Task 6
  - PLACEMENT: Service components in src/components/services/

Task 8: CREATE src/app/services/page.tsx
  - IMPLEMENT: Next.js page component with Suspense boundary
  - FOLLOW pattern: src/app/page.tsx (Suspense wrapper for client components)
  - NAMING: ServicesPageWrapper as default export
  - DEPENDENCIES: Import ServicesPage from Task 7
  - PLACEMENT: App pages in src/app/services/

Task 9: MODIFY src/components/layout/Sidebar.tsx
  - INTEGRATE: Add Services navigation link to navItems array
  - FIND pattern: existing navItems array structure (line 13-19)
  - ADD: { href: '/services', label: 'Services' } to navItems
  - PRESERVE: Existing navigation items and component structure

Task 10: CREATE src/__tests__/components/services/ServiceCard.test.tsx
  - IMPLEMENT: Unit tests for ServiceCard component
  - FOLLOW pattern: src/__tests__/components/HomePage.test.tsx (component testing)
  - NAMING: test_ServiceCard_scenario function naming
  - MOCK: Next.js Link and Lucide React icons
  - COVERAGE: Props handling, status display, link functionality

Task 11: CREATE src/__tests__/components/services/ServicesPage.test.tsx
  - IMPLEMENT: Integration tests for main page component
  - FOLLOW pattern: src/__tests__/components/HomePage.test.tsx (page testing)
  - NAMING: test_ServicesPage_scenario function naming
  - MOCK: Service hooks and external dependencies
  - COVERAGE: Loading states, error handling, service grid rendering
```

### Implementation Patterns & Key Details

```typescript
// Service Configuration Hook Pattern
export const useServiceConfig = () => {
  const [config, setConfig] = useState<ServiceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PATTERN: Fetch configuration from API route (follows web-ui/src/app/api/config/route.ts)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config')
        const envConfig = await response.json()
        const services = mapEnvToServices(envConfig) // Transform env vars to service configs
        setConfig(services)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  return { config, loading, error }
}

// Health Check Hook Pattern
export const useHealthCheck = (service: ServiceConfig, interval = 30000) => {
  const [health, setHealth] = useState<ServiceHealth>({
    available: false,
    lastCheck: null
  })

  // PATTERN: Polling with cleanup (follows existing hook patterns)
  useEffect(() => {
    const checkHealth = async () => {
      const startTime = Date.now()
      try {
        const response = await fetch(`${service.url}${service.healthEndpoint}`, {
          method: 'GET',
          timeout: 5000 // 5 second timeout
        })
        setHealth({
          available: response.ok,
          lastCheck: new Date(),
          status: response.status,
          responseTime: Date.now() - startTime
        })
      } catch (error) {
        setHealth({
          available: false,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkHealth() // Initial check
    const timer = setInterval(checkHealth, interval)
    return () => clearInterval(timer)
  }, [service.url, service.healthEndpoint, interval])

  return health
}

// Service Card Component Pattern
const ServiceCard: React.FC<ServiceCardProps> = ({ service, health, loading }) => {
  // PATTERN: Loading and error states (follows src/components/common patterns)
  if (loading) return <ServiceCardSkeleton />

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {service.name}
        </h3>
        <ServiceStatus health={health} />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {service.description}
      </p>

      <a
        href={service.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-primary w-full ${!health.available ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-disabled={!health.available}
      >
        Open {service.name}
      </a>
    </div>
  )
}
```

### Integration Points

```yaml
NAVIGATION:
  - file: src/components/layout/Sidebar.tsx
  - change: "Add { href: '/services', label: 'Services' } to navItems array"
  - line: 13-19

API_ENDPOINTS:
  - existing: /api/config (exposes environment variables)
  - pattern: "Use existing endpoint for service URL configuration"

ENVIRONMENT_VARIABLES:
  - NGINX_QBITTORRENT_PORT: "37178" (proxy port for qBittorrent)
  - NGINX_PROWLARR_PORT: "36096" (proxy port for Prowlarr)
  - NGINX_SONARR_PORT: "26013" (proxy port for Sonarr)
  - NGINX_RADARR_PORT: "38822" (proxy port for Radarr)
  - PLEX_PORT: "41586" (direct port for Plex)

STYLING:
  - framework: "Tailwind CSS with existing design system"
  - classes: "Use .btn, .btn-primary, .card classes from globals.css"
  - responsive: "Mobile-first responsive design with min-h-[44px] touch targets"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
cd web-ui
npm run lint                    # ESLint checking with Next.js config
npm run type-check             # TypeScript type checking with tsc --noEmit
npm run build                  # Next.js build validation

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each component as it's created
cd web-ui
npm run test src/__tests__/components/services/ServiceCard.test.tsx
npm run test src/__tests__/components/services/ServicesPage.test.tsx

# Full test suite for affected areas
npm run test src/__tests__/components/services/
npm run test:ci                # Full test suite with coverage

# Expected: All tests pass with ≥70% coverage. If failing, debug and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Service startup validation
cd web-ui
npm run dev &
sleep 5  # Allow startup time

# Health check validation
curl -f http://localhost:3000/services || echo "Services page failed to load"

# Service configuration API validation
curl -f http://localhost:3000/api/config | jq .

# Navigation integration validation
curl -s http://localhost:3000 | grep -q "Services" || echo "Navigation link missing"

# Docker service validation (ensure all services are healthy)
cd ..
docker-compose ps | grep -E "(Up|healthy)" || echo "Docker services not ready"

# Expected: All services accessible, proper responses, navigation working
```

### Level 4: Manual User Testing

```bash
# Browser Testing Checklist:
# 1. Navigate to http://localhost:3000/services
# 2. Verify all service cards display with correct information
# 3. Check health status indicators show appropriate colors
# 4. Test service links open in new tabs
# 5. Verify responsive design on mobile viewport
# 6. Test dark mode toggle functionality
# 7. Confirm navigation sidebar includes Services link
# 8. Validate error states when services are unreachable

# Accessibility Testing:
# 1. Tab navigation through service cards
# 2. Screen reader compatibility
# 3. Proper ARIA labels and roles
# 4. Keyboard-only navigation functionality

# Expected: All manual tests pass, no usability issues identified
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test:ci`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] Build succeeds: `npm run build`

### Feature Validation

- [ ] Services page accessible at `/services` route
- [ ] All configured services display with correct URLs
- [ ] Health status indicators show real-time service availability
- [ ] Service links open in new tabs with proper security attributes
- [ ] Navigation sidebar includes Services link
- [ ] Page follows responsive design patterns
- [ ] Error states handled gracefully with proper error messages

### Code Quality Validation

- [ ] Follows existing TypeScript interface patterns
- [ ] Uses established Tailwind CSS classes and design system
- [ ] File placement matches desired codebase tree structure
- [ ] Component testing achieves 70% coverage threshold
- [ ] Hook patterns consistent with existing codebase
- [ ] Environment variable access follows security patterns

### Security & Network Validation

- [ ] qBittorrent access only through nginx proxy (maintains VPN isolation)
- [ ] No direct Docker service port exposure in client code
- [ ] Service URLs use proper proxy configurations
- [ ] External links include `rel="noopener noreferrer"` security attributes
- [ ] Environment variable exposure limited to safe configuration only

---

## Anti-Patterns to Avoid

- ❌ Don't expose qBittorrent directly - must use nginx proxy for VPN isolation
- ❌ Don't hardcode service URLs - use environment variables for flexibility
- ❌ Don't skip Suspense boundaries for client components using Next.js hooks
- ❌ Don't ignore health check failures - provide meaningful error states
- ❌ Don't bypass existing navigation patterns - integrate with Sidebar component
- ❌ Don't skip TypeScript interfaces - maintain type safety throughout
- ❌ Don't ignore mobile responsiveness - follow existing touch-friendly design
- ❌ Don't skip test coverage - maintain 70% threshold for all metrics