# Torrent Web UI

A modern, mobile-first React/Next.js application for managing torrents with real-time updates and responsive design.

## Features

- 📱 **Mobile-first responsive design** - Optimized for touch interfaces
- 🔄 **Real-time updates** - Live download progress via Server-Sent Events
- 🎨 **Modern UI/UX** - Built with Tailwind CSS and Lucide icons
- 🔧 **Type-safe** - Full TypeScript integration
- 🧪 **Well-tested** - Jest + React Testing Library + Playwright E2E
- 🐳 **Docker ready** - Multi-stage builds for production optimization
- ⚡ **Performance optimized** - Code splitting, image optimization, caching

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + SWR
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (for containerized deployment)

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API endpoints
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Start with Docker (recommended)**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

The application will be available at `http://localhost:3000`

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Type checking
npm run type-check
```

## Project Structure

```
web-ui/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── search/            # Search torrents
│   │   ├── downloads/         # Manage downloads  
│   │   ├── settings/          # App settings
│   │   └── api/               # API routes
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Base components (buttons, inputs)
│   │   ├── layout/            # Layout components
│   │   ├── search/            # Search-specific components
│   │   └── downloads/         # Download-specific components
│   ├── lib/                   # Utilities and configurations
│   │   ├── api/               # API client functions
│   │   ├── utils/             # Helper functions
│   │   └── types/             # TypeScript definitions
│   ├── hooks/                 # Custom React hooks
│   └── stores/                # Zustand state stores
├── __tests__/                 # Unit tests
├── e2e/                       # E2E tests
└── public/                    # Static assets
```

## API Integration

The application integrates with external services:

- **Prowlarr** - Torrent indexer aggregation and search
- **qBittorrent** - Torrent client management

### API Client Usage

```typescript
import { searchTorrents, addTorrent } from '@/lib/api/torrents'

// Search for torrents
const results = await searchTorrents('search query', 'movies')

// Add torrent to download client
await addTorrent({ downloadUrl: 'magnet:...' })
```

### Real-time Updates

```typescript
import { useRealtimeDownloads } from '@/hooks/use-realtime'

function DownloadsPage() {
  const { data, isConnected } = useRealtimeDownloads()
  
  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      {/* Render download progress */}
    </div>
  )
}
```

## Mobile-First Design

### Responsive Breakpoints (Tailwind CSS)

- **Default**: 0px+ (Mobile)
- **sm**: 640px+ (Small tablets)
- **md**: 768px+ (Medium tablets/laptops)
- **lg**: 1024px+ (Large screens)
- **xl**: 1280px+ (Extra large)

### Touch-Friendly Components

```typescript
// All interactive elements meet 44px minimum touch target
<button className="btn btn-primary min-h-[44px]">
  Touch Friendly Button
</button>
```

## Performance Optimizations

- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component with WebP/AVIF
- **Bundle Analysis** - Use `ANALYZE=true npm run build`
- **Caching** - SWR for client-side caching
- **Real-time Updates** - Efficient SSE instead of polling

## Docker Deployment

### Production Build

```bash
docker build -t torrent-web-ui .
docker run -p 3000:3000 torrent-web-ui
```

### Development with Services

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts the web UI along with Prowlarr and qBittorrent services.

## Configuration

### Environment Variables

- `PROWLARR_URL` - Prowlarr instance URL
- `PROWLARR_API_KEY` - Prowlarr API key
- `QBITTORRENT_URL` - qBittorrent WebUI URL
- `QBITTORRENT_USERNAME` - qBittorrent username
- `QBITTORRENT_PASSWORD` - qBittorrent password

### Security

- CORS configured for LAN-only access
- Security headers enabled
- Input validation with Zod schemas
- No external CDNs (self-hosted assets)

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run test         # Run unit tests
npm run test:watch   # Watch mode for tests
npm run e2e          # Run E2E tests
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

## Contributing

1. Follow the mobile-first design principles
2. Write tests for new features
3. Ensure TypeScript types are properly defined
4. Test on both desktop and mobile viewports
5. Maintain accessibility standards (WCAG 2.1)

## Architecture Decisions

See `/ARCHITECTURE.md` for detailed architectural decisions, patterns, and best practices used in this project.

## License

MIT License - see LICENSE file for details.