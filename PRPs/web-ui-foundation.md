
# PRP-02: Web UI Foundation

**Confidence Score**: 8/10

## 1. Goal

- **Feature Goal**: Establish the foundational structure for the torrent web UI using Next.js and Tailwind CSS.
- **Deliverable**: A responsive, mobile-first Next.js application with a basic layout, navigation, API integration framework, and service status monitoring.
- **Success Definition**: The application shell is fully functional, builds successfully in Docker, and is ready for the integration of specific features like search and download management.

## 2. Context

| Context Type          | Reference                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `codebase_references` | `web-ui/` - The root directory for the new application.                                                 |
|                       | `web-ui/package.json` - Defines existing dependencies like Next.js, React, and SWR.                     |
|                       | `web-ui/src/hooks/use-downloads.ts` - Example of current data fetching patterns using SWR.                |
|                       | `docker-compose.yml` - Contains service definitions for backend APIs (Prowlarr, qBittorrent).           |
| `external_references` | [Next.js with Tailwind CSS](https://nextjs.org/docs/pages/building-your-application/styling/tailwind-css) |
|                       | [Responsive Design Patterns](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)              |
| `conventions`         | - **Framework**: Use Next.js with the App Router.                                                       |
|                       | - **Language**: TypeScript.                                                                             |
|                       | - **Styling**: Utility-first CSS with Tailwind CSS.                                                     |
|                       | - **Data Fetching**: Use SWR for client-side data fetching and state management.                        |
|                       | - **API Routes**: Next.js API routes should be used to proxy requests to backend services.              |
| `gotchas`             | - Ensure `tailwind.config.js` `content` property correctly scans all component and page files.          |
|                       | - A strict mobile-first approach is necessary for all components.                                       |
|                       | - All API communication must be proxied through Next.js API routes to hide sensitive keys and origins.  |

## 3. Implementation Tasks

### Task 1: Project & Tooling Setup
- **Description**: Initialize the Next.js project and configure essential development tools.
- **Tasks**:
  - [x] Verify Next.js 14+ with TypeScript is set up.
  - [x] Configure ESLint and Prettier for code quality.
  - [x] Ensure Tailwind CSS is configured for responsive and dark mode variants.
  - [x] Create a `Dockerfile` for the web UI that supports multi-stage builds for development and production.
  - [x] Implement environment variable handling using `.env.local` for local development.

### Task 2: Core Layout and Responsive Navigation
- **Description**: Build the main application layout and navigation system.
- **Tasks**:
  - [x] Create a main `Layout` component in `src/components/layout/`.
  - [x] Implement a responsive sidebar that collapses into a hamburger menu/drawer on mobile.
  - [x] Create the header component to house navigation controls and status indicators.
  - [x] Create the footer component.
  - [x] Define page structure in `src/app/layout.tsx` and `src/app/page.tsx`.

### Task 3: API Integration Framework
- **Description**: Build the client-side framework for communicating with backend services.
- **Tasks**:
  - [x] Create proxy API routes under `src/app/api/` for `prowlarr` and `qbittorrent` to avoid CORS and hide credentials.
  - [x] Implement the `ProwlarrClient` and `QBittorrentClient` classes as defined in the PRD, to be used server-side within API routes.
  - [x] Create a generic `apiClient` utility using `fetch` for the frontend to call the Next.js proxy routes.
  - [x] Define TypeScript interfaces for all API request and response objects in `src/lib/types/`.

### Task 4: State Management & Custom Hooks
- **Description**: Set up global state and data-fetching hooks.
- **Tasks**:
  - [x] Use `SWR` for managing server state (API data).
  - [x] Create custom hooks for primary data types (e.g., `useTorrents`, `useIndexers`, `useServiceStatus`).
  - [x] Use React Context or Zustand for managing global UI state (e.g., theme, sidebar open/closed).

### Task 5: Core Components & Pages
- **Description**: Develop placeholder pages and essential UI components.
- **Tasks**:
  - [x] Create page files for each route specified in the PRD (`search`, `downloads`, `completed`, `settings`, `status`).
  - [x] Build generic `LoadingSpinner` and `ErrorMessage` components.
  - [x] Develop the initial `ServiceStatus` component to display connectivity to backend services.

## 4. Validation Gates

- **Linting**: Run `npm run lint` and ensure no errors.
- **Type Checking**: Run `npm run type-check` and ensure no type errors.
- **Unit Tests**: Run `npm run test` to execute Jest tests for hooks and components.
- **Build**: Run `npm run build` to ensure the application compiles successfully for production.
- **E2E Tests**: Run `npm run e2e` to validate critical user flows with Playwright.

## 5. Final Validation Checklist

- [x] The application runs locally using `npm run dev`.
- [x] The application builds and runs in a Docker container.
- [x] The UI is fully responsive and adapts to mobile, tablet, and desktop breakpoints.
- [x] Navigation works correctly on all screen sizes.
- [x] API proxy routes for Prowlarr and qBittorrent are functional.
- [x] The service status component correctly reflects the backend connection status.
- [x] All validation gates pass without errors.
