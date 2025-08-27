# qBittorrent WebUI API Reference and Integration Guide

## Overview
This document provides a comprehensive reference for integrating the qBittorrent WebUI API into web applications, covering authentication, API endpoints, best practices, and implementation strategies.

## Versions and Compatibility
- Supported Versions: qBittorrent v3.1.x - v5.0
- Current Recommended Version: qBittorrent v5.0
- Web API Version: v2.11.4 (as of July 2025)

## Official Documentation Sources
- GitHub Wiki API Documentation:
  - v4.1+: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
  - v5.0: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-5.0)
  - v3.1.x: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-v3.1.x)

## Authentication Mechanisms

### Cookie-Based Authentication (v4.1+)
```http
POST /api/v2/auth/login
Parameters:
- username: WebUI username
- password: WebUI password

Response:
- Success: Set-Cookie with SID
- Failure: 403 Forbidden
```

### Digest Authentication (v3.1.x)
- Uses standard Digest Authorization with MD5 hash
- Requires Authorization header in GET/POST requests

## API Endpoint Namespaces
1. Authentication (`/api/v2/auth/`)
2. Application (`/api/v2/app/`)
3. Log (`/api/v2/log/`)
4. Sync (`/api/v2/sync/`)
5. Transfer (`/api/v2/transfer/`)
6. Torrent Management (`/api/v2/torrents/`)
7. Search (`/api/v2/search/`)
8. RSS (`/api/v2/rss/`)

## Torrent Management Endpoints

### Core Torrent Operations
- `GET /api/v2/torrents/info`: List all torrents
- `POST /api/v2/torrents/add`: Add new torrent
- `POST /api/v2/torrents/delete`: Remove torrents
- `POST /api/v2/torrents/pause`: Pause torrents
- `POST /api/v2/torrents/resume`: Resume torrents

## Best Practices

### Performance Optimization
1. Implement request throttling
2. Use batch operations when possible
3. Cache frequently accessed data
4. Optimize polling intervals (recommended: 5-10 seconds)

### Error Handling
- Always handle authentication failures
- Implement retry mechanisms for transient errors
- Log and monitor API interaction errors

### Security Considerations
- Never store WebUI credentials in client-side code
- Use backend proxy for API interactions
- Implement proper CORS configurations
- Rotate WebUI credentials periodically

## Integration Patterns

### Node.js Backend Example
```javascript
const axios = require('axios');

class QBittorrentClient {
  constructor(baseURL, username, password) {
    this.client = axios.create({ baseURL });
    this.login(username, password);
  }

  async login(username, password) {
    await this.client.post('/api/v2/auth/login', 
      new URLSearchParams({ username, password })
    );
  }

  async listTorrents() {
    const response = await this.client.get('/api/v2/torrents/info');
    return response.data;
  }
}
```

### React Frontend Hook
```typescript
function useTorrents() {
  const [torrents, setTorrents] = useState([]);
  
  useEffect(() => {
    const fetchTorrents = async () => {
      try {
        const data = await qbittorrentClient.listTorrents();
        setTorrents(data);
      } catch (error) {
        // Handle errors
      }
    };

    const intervalId = setInterval(fetchTorrents, 10000);
    return () => clearInterval(intervalId);
  }, []);

  return torrents;
}
```

## Recommended Libraries
- Python: `qbittorrent-api`
- Node.js: `qbittorrent-api-v2`
- TypeScript: `@ctrl/qbittorrent`

## Community Resources
- Official Documentation: https://qbittorrent.org
- API Reference: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API
- Python Client: https://pypi.org/project/qbittorrent-api/

## Limitations and Considerations
- API methods are version-specific
- Some endpoints may require admin privileges
- Network performance depends on local qBittorrent instance configuration

## Contributing
Contributions to this documentation are welcome. Please submit pull requests or open issues on our GitHub repository.

---

**Last Updated**: 2025-08-27
**API Version**: v2.11.4