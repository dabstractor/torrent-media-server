# Torrent Management Web UI Architecture

## Tech Stack Recommendations

Based on current best practices and the requirements for mobile-first responsive design with real-time updates:

### Core Framework
- **Next.js 14+** with App Router (latest stable)
- **TypeScript** for type safety
- **React 18+** with Server Components support
- **Tailwind CSS** for mobile-first responsive design

### State Management & Data Fetching
- **Zustand** for global state management (lightweight, TypeScript-first)
- **SWR** or **TanStack Query** for server state management and caching
- **React Hook Form** with **Zod** for form validation

### Real-time Updates
- **Server-Sent Events (SSE)** for download progress updates (simpler than WebSocket)
- **Polling fallback** for browsers without SSE support
- **React Query** with real-time invalidation

### Testing
- **Jest** + **React Testing Library** for unit/integration tests
- **Playwright** for E2E testing
- **MSW** (Mock Service Worker) for API mocking

### Docker & Deployment
- **Multi-stage Docker build** for production optimization
- **Docker Compose** for development environment
- **Node.js Alpine** base image for smaller container size

## Key URLs & Documentation

### Official Documentation
- **Next.js App Router**: https://nextjs.org/docs/app/building-your-application/routing
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Tailwind Responsive Design**: https://tailwindcss.com/docs/responsive-design
- **React 18 Features**: https://react.dev/reference/react
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Docker Node.js Guide**: https://docs.docker.com/language/nodejs/

### Best Practices Resources
- **Next.js Project Structure**: https://nextjs.org/docs/app/building-your-application/routing/colocation
- **TypeScript with Next.js**: https://nextjs.org/docs/app/building-your-application/configuring/typescript
- **React Performance Patterns**: https://react.dev/reference/react/memo
- **Mobile-First Design**: https://tailwindcss.com/docs/responsive-design#working-mobile-first

## Mobile-First Design Principles

### Tailwind CSS Breakpoints (Mobile-First)
```css
/* Default: Mobile (0px+) */
.w-full 

/* Small tablets (640px+) */
.sm:w-1/2 

/* Medium tablets/small laptops (768px+) */
.md:w-1/3 

/* Large screens (1024px+) */
.lg:w-1/4 

/* Extra large screens (1280px+) */
.xl:w-1/5 
```

### Responsive Design Strategy
1. **Design for mobile first** - Start with smallest screen (320px)
2. **Progressive enhancement** - Add features/layout for larger screens
3. **Touch-friendly interface** - Minimum 44px touch targets
4. **Readable typography** - 16px base font size, adequate line height
5. **Optimized images** - Use Next.js Image component for automatic optimization

## Real-time Update Strategies

### Server-Sent Events (Recommended)
```javascript
// API Route: /api/downloads/stream
export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Setup interval to send progress updates
      const interval = setInterval(async () => {
        const progress = await getDownloadProgress();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
      }, 1000);
      
      // Cleanup on close
      return () => clearInterval(interval);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### WebSocket Alternative (if needed)
- Use **ws** library for Node.js WebSocket server
- **Socket.IO** for more complex real-time features
- Consider **Pusher** or **Ably** for managed WebSocket services

### Polling Fallback
- **5-second intervals** for download progress
- **30-second intervals** for general status
- **Exponential backoff** on API failures

## Project Structure Design

The recommended structure follows Next.js App Router conventions with clear separation of concerns:

```
web-ui/
├── README.md
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.dev.yml
├── .env.example
├── .env.local
├── public/
│   ├── icons/
│   └── images/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   ├── search/             # Search page
│   │   ├── downloads/          # Downloads management
│   │   ├── settings/           # Settings page
│   │   └── api/                # API routes
│   │       ├── search/
│   │       ├── downloads/
│   │       ├── settings/
│   │       └── stream/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base UI components
│   │   ├── layout/             # Layout components
│   │   ├── search/             # Search-specific components
│   │   └── downloads/          # Download-specific components
│   ├── lib/                    # Utilities and configurations
│   │   ├── api/                # API client functions
│   │   ├── utils/              # Helper functions
│   │   ├── constants/          # App constants
│   │   ├── types/              # TypeScript type definitions
│   │   └── validations/        # Zod schemas
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-downloads.ts    # Downloads management
│   │   ├── use-search.ts       # Search functionality
│   │   └── use-realtime.ts     # Real-time updates
│   └── stores/                 # State management
│       ├── downloads-store.ts  # Zustand store for downloads
│       ├── search-store.ts     # Search state
│       └── settings-store.ts   # App settings
├── __tests__/                  # Test files
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── api/
├── e2e/                        # End-to-end tests
└── docs/                       # Additional documentation
```

## API Integration Patterns

### External Service Integration
- **Prowlarr API Client** - Centralized API client with retry logic
- **qBittorrent API Client** - WebUI API integration with authentication
- **Type-safe API responses** - Zod schemas for runtime validation
- **Error handling** - Standardized error responses and user feedback

### Custom Hooks for Data Fetching
```typescript
// hooks/use-downloads.ts
export function useDownloads() {
  return useSWR('/api/downloads', fetcher, {
    refreshInterval: 5000, // Poll every 5 seconds
    revalidateOnFocus: true,
  });
}

// hooks/use-realtime-downloads.ts  
export function useRealtimeDownloads() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/downloads/stream');
    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };
    
    return () => eventSource.close();
  }, []);
  
  return data;
}
```

## Performance Optimizations

### Code Splitting
- **Dynamic imports** for heavy components
- **Route-based splitting** built into Next.js App Router
- **Lazy loading** for non-critical components

### Image Optimization
```typescript
import Image from 'next/image'

// Automatic optimization, lazy loading, responsive images
<Image 
  src="/poster.jpg" 
  alt="Movie poster"
  width={300}
  height={450}
  placeholder="blur"
  priority={false}
/>
```

### Bundle Analysis
- **@next/bundle-analyzer** for bundle size analysis
- **webpack-bundle-analyzer** for detailed analysis
- Target: <244KB initial bundle size

## Security Considerations

### API Security
- **CORS configuration** for LAN-only access
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas
- **Sanitization** of torrent file names/paths

### Content Security Policy
```javascript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  connect-src 'self';
`
```

This architecture provides a solid foundation for building a modern, responsive torrent management interface with excellent developer experience and maintainable code structure.