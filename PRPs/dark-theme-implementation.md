name: "Dark Theme Implementation PRP - Complete UI Theme System"
description: |

---

## Goal

**Feature Goal**: Implement a comprehensive dark theme system that dynamically switches between light and dark modes across all UI components with proper accessibility, performance, and user preference persistence.

**Deliverable**: Complete dark theme implementation with theme toggle, context management, and fully styled dark variants for all 50+ UI components in the torrent management web application.

**Success Definition**: Users can seamlessly switch between light/dark themes with their preference persisted, all components display correctly with WCAG AA contrast ratios, and no flash of unstyled content (FOUC) occurs during theme switches.

## User Persona

**Target User**: Torrent management application users who prefer dark interfaces for reduced eye strain during extended usage sessions, especially during evening/night hours.

**Use Case**: Users want to toggle between light and dark themes based on personal preference, time of day, or system settings while maintaining full application functionality.

**User Journey**: 
1. User opens application → theme loads based on saved preference or system setting
2. User navigates to theme toggle → clicks to switch themes
3. Application instantly switches all UI elements to new theme
4. Preference is saved and persists across sessions

**Pain Points Addressed**: 
- Eye strain from bright interfaces during low-light usage
- Inconsistent theming across different components
- Lack of system preference respect
- Poor accessibility in current light-only interface

## Why

- **User Experience**: Dark themes reduce eye strain and battery usage on OLED displays, improving user satisfaction during extended usage sessions
- **Accessibility**: Provides better contrast options for users with visual sensitivities and adheres to modern accessibility standards
- **Modern Standards**: Dark theme support is expected in contemporary web applications, matching user expectations from other apps
- **Integration**: Leverages existing Tailwind CSS dark mode infrastructure (~80% already implemented) to complete the theme system

## What

A complete dark theme implementation that transforms the torrent management interface with:

### User-Visible Behavior
- Theme toggle button in application header/settings
- Instant visual switching between light and dark modes  
- Consistent dark styling across all pages (search, downloads, files, settings, status)
- Smooth transition animations between theme changes
- Automatic system preference detection and respect
- Theme preference persistence across browser sessions

### Technical Requirements
- Theme context provider managing global theme state
- Dynamic CSS class application (`dark` class on HTML element)
- Complete dark variants for all UI components and utility classes
- WCAG AA compliant color contrast ratios
- No flash of unstyled content (FOUC) prevention
- SSR-compatible theme initialization

### Success Criteria

- [ ] All 50+ identified UI components render correctly in dark theme
- [ ] Theme preference persists across browser sessions
- [ ] System preference detection works (prefers-color-scheme)
- [ ] WCAG AA contrast ratios met for all text and interactive elements
- [ ] No FOUC during theme switches or page loads
- [ ] Performance impact <100ms for theme switching
- [ ] All existing functionality works identically in both themes

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validated: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?" - YES, comprehensive context provided below._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://nextjs.org/docs/app/api-reference/functions/use-router#theme-detection
  why: Next.js App Router theme handling patterns and SSR considerations
  critical: Prevents hydration mismatches and FOUC during theme initialization

- url: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually
  why: Official Tailwind CSS dark mode implementation patterns and class strategies
  critical: Proper dark: prefix usage and CSS cascade management

- url: https://github.com/pacocoursey/next-themes#readme
  why: Production-ready theme management library with SSR support and persistence
  critical: Prevents common theme implementation pitfalls like FOUC and hydration issues

- url: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
  why: WCAG 2.2 contrast requirements for accessibility compliance
  critical: Ensures dark theme colors meet AA standards (4.5:1 normal text, 3:1 large text)

- file: web-ui/tailwind.config.js
  why: Current Tailwind configuration with custom colors and dark mode setup
  pattern: Custom color palette (primary, success, warning, error) already defined
  gotcha: darkMode: 'class' already configured, custom colors need dark variants

- file: web-ui/src/app/globals.css  
  why: Global CSS with utility classes (.btn, .card, .input) that need dark variants
  pattern: @layer components approach for utility classes
  gotcha: Utility classes use light colors only, need dark: variants added

- file: web-ui/src/components/settings/inputs/ToggleSwitch.tsx
  why: Example component with complete dark mode implementation
  pattern: Comprehensive dark: class usage and state-specific styling
  gotcha: Shows proper approach for interactive component theming

- file: web-ui/src/components/layout/Layout.tsx
  why: Main layout component with existing dark mode classes
  pattern: bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 approach
  gotcha: Theme context provider needs to wrap this component

- docfile: PRPs/ai_docs/next-themes-integration.md
  why: Complete integration guide for next-themes with Next.js App Router
  section: SSR setup, provider configuration, and FOUC prevention
```

### Current Codebase Tree

```bash
web-ui/src/
├── app/
│   ├── layout.tsx              # Root layout - needs theme provider
│   ├── globals.css             # Global styles - needs dark variants
│   ├── page.tsx                # Home page
│   ├── search/page.tsx         # Search interface
│   ├── downloads/page.tsx      # Downloads dashboard  
│   ├── files/page.tsx          # File management
│   ├── settings/page.tsx       # Settings interface
│   └── status/page.tsx         # System status
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Navigation header - needs theme toggle
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── Layout.tsx          # Main layout wrapper
│   │   └── Footer.tsx          # Page footer
│   ├── search/
│   │   ├── SearchForm.tsx      # Search interface
│   │   ├── TorrentCard.tsx     # Torrent result cards
│   │   └── SearchResults.tsx   # Results container
│   ├── downloads/
│   │   ├── DownloadCard.tsx    # Download status cards
│   │   ├── ProgressBar.tsx     # Progress visualization
│   │   └── BatchControls.tsx   # Batch operations
│   ├── settings/
│   │   ├── SettingsLayout.tsx  # Settings navigation
│   │   └── inputs/             # Form components
│   └── common/
│       ├── ErrorMessage.tsx    # Error display
│       └── LoadingSpinner.tsx  # Loading states
└── hooks/
    └── (existing hooks)        # No theme hook exists yet
```

### Desired Codebase Tree with Files to be Added

```bash
web-ui/src/
├── components/
│   ├── theme/
│   │   ├── ThemeProvider.tsx   # Theme context provider wrapper
│   │   ├── ThemeToggle.tsx     # Theme toggle button component
│   │   └── index.ts            # Theme exports
├── hooks/
│   └── use-theme.ts            # Theme context hook (or use next-themes)
├── lib/
│   └── theme/
│       ├── colors.ts           # Dark theme color definitions  
│       └── utils.ts            # Theme utility functions
└── PRPs/
    └── ai_docs/
        └── next-themes-integration.md  # Integration documentation
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Next.js App Router requires theme provider in layout.tsx
// Example: Theme provider must wrap all content to prevent hydration mismatch

// CRITICAL: Tailwind dark mode classes require 'dark' class on parent element
// Example: HTML element needs dynamic class="dark" application

// CRITICAL: SSR mismatch prevention requires theme initialization before hydration
// Example: Script tag in _document.tsx to set theme class immediately

// CRITICAL: next-themes useTheme hook causes hydration issues without proper mounting check
// Example: Always use mounted state before rendering theme-dependent content

// GOTCHA: Existing utility classes (.card, .btn, .input) only have light variants
// Must add dark: variants in globals.css @layer components

// GOTCHA: Custom color palette in tailwind.config.js needs dark variants
// Current colors optimized for light theme only

// GOTCHA: ToggleSwitch component shows proper dark theme pattern to follow
// Other components need similar comprehensive dark: class coverage
```

## Implementation Blueprint

### Data Models and Structure

Define theme configuration and color system for type safety and consistency.

```typescript
// Theme types and configuration
interface ThemeConfig {
  theme: 'light' | 'dark' | 'system';
  colors: {
    light: ColorPalette;
    dark: ColorPalette; 
  };
}

interface ColorPalette {
  background: {
    primary: string;
    secondary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: {
    primary: string;
    success: string;
    warning: string;
    error: string;
  };
}

// Settings integration
interface AppSettings {
  // ... existing settings
  theme: 'light' | 'dark' | 'system';
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE PRPs/ai_docs/next-themes-integration.md
  - DOCUMENT: Complete next-themes setup guide with App Router patterns
  - INCLUDE: SSR configuration, FOUC prevention, provider setup
  - REFERENCE: https://github.com/pacocoursey/next-themes documentation
  - PURPOSE: Prevent common implementation pitfalls and ensure proper setup

Task 2: INSTALL next-themes dependency
  - COMMAND: cd web-ui && npm install next-themes
  - VERIFY: Package appears in package.json with latest stable version
  - PURPOSE: Production-ready theme management with SSR support and persistence

Task 3: CREATE web-ui/src/components/theme/ThemeProvider.tsx
  - IMPLEMENT: Next-themes ThemeProvider wrapper with proper configuration
  - FOLLOW pattern: Provider component pattern with children prop
  - NAMING: ThemeProvider component, exported as default
  - CONFIG: attribute="data-theme", defaultTheme="system", enableSystem=true
  - PLACEMENT: Theme provider wrapper in components/theme/

Task 4: CREATE web-ui/src/components/theme/ThemeToggle.tsx  
  - IMPLEMENT: Theme toggle button with icon switching and accessibility
  - FOLLOW pattern: web-ui/src/components/settings/inputs/ToggleSwitch.tsx (accessibility approach)
  - NAMING: ThemeToggle component with proper ARIA labels
  - DEPENDENCIES: useTheme hook from next-themes, Lucide icons
  - STATES: Handle mounted state to prevent hydration mismatch
  - PLACEMENT: Reusable theme toggle component

Task 5: MODIFY web-ui/src/app/layout.tsx
  - INTEGRATE: Wrap app content with ThemeProvider from Task 3
  - PRESERVE: Existing layout structure, metadata, and styling
  - PATTERN: Provider wraps children, maintains all existing functionality
  - PLACEMENT: ThemeProvider as outermost wrapper around body content

Task 6: MODIFY web-ui/src/components/layout/Header.tsx
  - ADD: ThemeToggle component from Task 4 to header navigation
  - FIND pattern: Existing navigation button placement and styling
  - PRESERVE: All existing header functionality and navigation
  - STYLING: Match existing header button styling and responsive behavior

Task 7: MODIFY web-ui/src/app/globals.css
  - ADD: Dark variants for all utility classes (.card, .btn-*, .input)
  - PATTERN: @layer components with dark: prefixed classes
  - COLORS: Use Tailwind dark mode color tokens (gray-800, gray-700, etc.)
  - EXAMPLE: .card { @apply bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700; }
  - COVERAGE: All utility classes identified in component analysis

Task 8: UPDATE web-ui/tailwind.config.js
  - ADD: Custom dark theme color variants for existing palette
  - EXTEND: Current primary/success/warning/error colors with dark variants
  - PATTERN: Maintain existing color structure, add dark-optimized values
  - CONTRAST: Ensure all colors meet WCAG AA contrast requirements
  - PRESERVE: Existing configuration, only extend colors section

Task 9: MODIFY web-ui/src/components/downloads/ProgressBar.tsx
  - ADD: Dark theme variants for background and progress colors
  - FOLLOW pattern: bg-gray-200 dark:bg-gray-700 for backgrounds
  - COLORS: Update gradient colors for dark theme visibility
  - CONTRAST: Ensure progress text remains readable in both themes
  - PRESERVE: All existing progress calculation and animation logic

Task 10: MODIFY web-ui/src/components/downloads/BatchControls.tsx
  - ADD: Dark variants for selection info bar and button states
  - PATTERN: bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800
  - STYLING: Update all blue-tinted backgrounds for dark theme
  - PRESERVE: All existing batch operation functionality

Task 11: MODIFY web-ui/src/components/plex/PlexStatusDashboard.tsx
  - ADD: Dark theme support for status cards and indicators
  - FOLLOW pattern: Existing Layout component dark styling approach
  - STYLING: Update status indicator colors for dark theme visibility
  - PRESERVE: All existing Plex integration functionality

Task 12: CREATE web-ui/src/__tests__/theme/ThemeToggle.test.tsx
  - IMPLEMENT: Unit tests for theme toggle functionality
  - FOLLOW pattern: web-ui/src/__tests__/components/ existing test structure
  - COVERAGE: Toggle behavior, accessibility, mounted state handling
  - MOCK: next-themes useTheme hook for testing
  - PLACEMENT: Theme-specific tests in __tests__/theme/

Task 13: CREATE web-ui/e2e/theme-switching.spec.ts
  - IMPLEMENT: End-to-end tests for theme switching across all pages
  - FOLLOW pattern: web-ui/e2e/ existing Playwright test structure
  - COVERAGE: Theme persistence, visual testing, accessibility
  - PAGES: Test theme switching on all major pages (search, downloads, files, settings)
  - PLACEMENT: E2E theme tests alongside existing tests
```

### Implementation Patterns & Key Details

```typescript
// Theme Provider Pattern - Preventing FOUC and hydration issues
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute="data-theme" 
      defaultTheme="system" 
      enableSystem={true}
      themes={['light', 'dark']}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Theme Toggle Pattern - Preventing hydration mismatch
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true) // CRITICAL: Prevent hydration mismatch
  }, [])

  if (!mounted) return null // CRITICAL: Return null during SSR

  // Component implementation...
}

// Utility Class Dark Variants Pattern
.card {
  @apply bg-white dark:bg-gray-800 
         border-gray-200 dark:border-gray-700 
         text-gray-900 dark:text-gray-100 
         shadow-sm dark:shadow-gray-900/10;
}

.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600
         text-white dark:text-white
         border-primary-600 dark:border-primary-500;
}

// GOTCHA: Always include text colors explicitly for dark variants
// GOTCHA: Use semantic color names (gray-800) rather than arbitrary values
// CRITICAL: Test all interactive states (hover, active, focus) in both themes
```

### Integration Points

```yaml
DEPENDENCIES:
  - install: "next-themes@^0.2.1"
  - verify: "Compatible with Next.js 14 App Router"

SETTINGS:
  - integrate: existing settings system in web-ui/src/lib/types/settings.ts
  - add: theme preference to AppSettings interface
  - sync: theme state with settings persistence

LAYOUT:
  - modify: web-ui/src/app/layout.tsx root layout wrapper
  - preserve: all existing metadata, viewport, and structure
  - wrap: entire app with ThemeProvider

NAVIGATION:
  - add: ThemeToggle to Header component
  - position: alongside existing navigation elements
  - responsive: maintain mobile navigation behavior

TESTING:
  - add: theme-specific test suites
  - coverage: visual regression testing for theme switching
  - accessibility: WCAG contrast validation in both themes
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each component modification - fix before proceeding
cd web-ui
npm run lint                     # ESLint validation with Next.js rules
npm run type-check               # TypeScript compilation check  
npm run format                   # Prettier formatting

# Expected: Zero linting errors, successful TypeScript compilation
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test theme components as created
npm run test -- --testPathPattern=theme
npm run test -- components/theme/ThemeToggle.test.tsx

# Test theme-related functionality
npm run test -- --testNamePattern="theme"
npm run test:coverage           # Ensure theme code coverage

# Expected: All theme tests pass, coverage >80% for theme components
```

### Level 3: Integration Testing (System Validation)

```bash
# Development server startup with theme support
npm run dev
sleep 3  # Allow startup time

# Theme switching functionality testing
curl -f http://localhost:3000/ | grep -q "data-theme" || echo "Theme attribute missing"

# Visual testing across all pages
npm run e2e                     # Run Playwright tests including theme switching
npm run e2e -- theme-switching.spec.ts  # Specific theme tests

# Accessibility testing
npm run test:a11y              # Run accessibility tests (if configured)

# Performance testing - theme switch speed
# Use browser dev tools to measure theme switching performance (<100ms target)

# Expected: All pages load correctly, theme switching works, no visual regressions
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Visual regression testing
npm run test:visual            # Compare screenshots across themes (if configured)

# Cross-browser theme testing
# Test in Chrome, Firefox, Safari, Edge for consistent theme behavior

# Mobile device testing  
# Verify responsive theme switching on mobile devices

# Accessibility validation
npx axe-cli http://localhost:3000 --tags wcag22aa  # WCAG 2.2 AA compliance

# Color contrast validation
# Use tools like WebAIM Colour Contrast Analyser to verify all color combinations

# Theme persistence testing
# Test theme persistence across browser sessions, incognito mode, different devices

# System preference testing
# Test automatic theme detection with OS dark/light mode changes

# Performance profiling
# Use browser dev tools to ensure theme switching doesn't cause layout thrashing

# Expected: WCAG AA compliance, consistent cross-browser behavior, <100ms theme switch
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`  
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] E2E tests pass: `npm run e2e`

### Feature Validation

- [ ] Theme toggle button works in header
- [ ] Theme preference persists across browser sessions  
- [ ] System preference detection works (prefers-color-scheme)
- [ ] All identified components render correctly in dark theme
- [ ] No FOUC during theme switches or page loads
- [ ] Smooth transition animations between themes
- [ ] Settings integration maintains theme preference

### Code Quality Validation

- [ ] Follows existing component patterns and naming conventions
- [ ] Theme components properly handle SSR and hydration  
- [ ] No duplicate theme management logic across components
- [ ] Proper TypeScript types for all theme-related code
- [ ] Accessibility attributes on all interactive theme elements

### Accessibility Validation

- [ ] WCAG AA contrast ratios met for all text (4.5:1) and large text (3:1)
- [ ] Theme toggle has proper ARIA labels and keyboard navigation
- [ ] Focus indicators visible in both light and dark themes
- [ ] Screen reader compatibility for theme switching
- [ ] Color is not the only means of conveying information

### Performance Validation

- [ ] Theme switching completes in <100ms
- [ ] No layout shift during theme transitions
- [ ] Bundle size increase <10KB for theme functionality
- [ ] No memory leaks from theme state management
- [ ] CSS transitions don't block main thread

---

## Anti-Patterns to Avoid

- ❌ Don't render theme-dependent content before mounted check (hydration mismatch)
- ❌ Don't use inline styles for theme colors (breaks Tailwind optimization)
- ❌ Don't hardcode theme colors in JavaScript (use CSS classes)
- ❌ Don't skip FOUC prevention script (causes flash of wrong theme)
- ❌ Don't forget focus states in dark theme (accessibility requirement)
- ❌ Don't assume system preference without explicit detection
- ❌ Don't nest theme providers (causes context conflicts)
- ❌ Don't skip testing theme switching on all pages
- ❌ Don't use arbitrary color values (use Tailwind semantic tokens)
- ❌ Don't ignore contrast ratios for custom colors (WCAG requirement)