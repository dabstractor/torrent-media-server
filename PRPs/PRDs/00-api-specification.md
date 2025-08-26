# API Specifications - Local Torrent + Plex Media Hub

## Service API Contracts

### 1. Prowlarr API Interface

**Base URL**: `http://prowlarr:9696/api/v1`
**Authentication**: API Key in headers: `X-Api-Key: <api-key>`

#### Search Torrents
```http
GET /search
Query Parameters:
- query: string (search term)
- categories: string[] (optional, torrent categories)
- limit: number (default: 100)
- offset: number (default: 0)

Response:
{
  "results": [
    {
      "title": "string",
      "size": number,
      "seeders": number,
      "leechers": number,
      "downloadUrl": "string",
      "magnetUrl": "string",
      "indexer": "string",
      "category": "string",
      "publishDate": "ISO8601"
    }
  ],
  "total": number
}
```

#### Get Indexers Status
```http
GET /indexer
Response:
{
  "indexers": [
    {
      "id": number,
      "name": "string",
      "enable": boolean,
      "status": "string",
      "lastRun": "ISO8601"
    }
  ]
}
```

### 2. qBittorrent API Interface

**Base URL**: `http://qbittorrent:8080/api/v2`
**Authentication**: Cookie-based session after login

#### Login
```http
POST /auth/login
Body: username=admin&password=adminpass
Response: Sets SID cookie for session
```

#### Get Torrent List
```http
GET /torrents/info
Query Parameters:
- filter: string (all|downloading|completed|paused|active|inactive)
- category: string (optional)
- sort: string (name|priority|num_seeds|etc.)
- reverse: boolean

Response:
[
  {
    "hash": "string",
    "name": "string",
    "size": number,
    "progress": number,
    "dlspeed": number,
    "upspeed": number,
    "priority": number,
    "num_seeds": number,
    "num_leechs": number,
    "ratio": number,
    "eta": number,
    "state": "string",
    "category": "string",
    "tags": "string",
    "added_on": number,
    "completion_on": number
  }
]
```

#### Add Torrent
```http
POST /torrents/add
Content-Type: multipart/form-data
Body:
- urls: string (magnet links or URLs)
- torrents: file[] (torrent files)
- savepath: string (optional)
- category: string (optional)
- tags: string (optional)
- skip_checking: boolean (optional)
- paused: boolean (optional)

Response: "Ok." or error message
```

#### Control Torrent
```http
POST /torrents/pause
POST /torrents/resume  
POST /torrents/delete
Body: hashes=hash1|hash2|hash3&deleteFiles=true/false
```

### 3. Web UI Internal API

**Base URL**: `http://web-ui:3000/api`
**Authentication**: None (LAN-only)

#### Search Interface
```http
GET /search
Query Parameters:
- q: string (search query)
- category: string (optional)
- page: number (default: 1)
- limit: number (default: 50)

Response:
{
  "results": [
    {
      "id": "string",
      "title": "string", 
      "size": "string",
      "seeders": number,
      "leechers": number,
      "magnet": "string",
      "torrentUrl": "string",
      "indexer": "string",
      "category": "string",
      "publishDate": "string"
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "pages": number
  }
}
```

#### Download Management
```http
GET /downloads
Response:
{
  "active": [...torrent objects...],
  "completed": [...torrent objects...],
  "paused": [...torrent objects...]
}

POST /downloads
Body: {
  "magnet": "string",
  "category": "string",
  "priority": "normal|high|low"
}

PUT /downloads/:hash/pause
PUT /downloads/:hash/resume
DELETE /downloads/:hash?deleteFiles=boolean
```

#### System Status
```http
GET /status
Response:
{
  "services": {
    "prowlarr": "online|offline",
    "qbittorrent": "online|offline", 
    "plex": "online|offline"
  },
  "stats": {
    "activeDownloads": number,
    "completedToday": number,
    "totalDownloaded": "string",
    "diskSpace": {
      "total": "string",
      "free": "string",
      "used": "string"
    }
  }
}
```

#### Settings Management
```http
GET /settings
Response:
{
  "maxConcurrentDownloads": number,
  "downloadSpeedLimit": number,
  "uploadSpeedLimit": number,
  "defaultCategory": "string",
  "autoDeleteRatio": number
}

PUT /settings
Body: { ...settings object... }
```

### 4. File System API (Internal)

#### Torrent File Management
```http
GET /api/torrents
Response: List of stored .torrent files

POST /api/torrents/redownload
Body: { "filename": "string" }

GET /api/media/completed
Response: List of completed media files with metadata
```

## Error Handling Standards

All APIs should return consistent error format:
```json
{
  "error": {
    "code": "string",
    "message": "string", 
    "details": {}
  }
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized  
- 404: Not Found
- 500: Internal Server Error
- 503: Service Unavailable

## Rate Limiting

- Prowlarr: 1 request per second per indexer
- qBittorrent: 10 requests per second
- Web UI: No limits (internal only)

## WebSocket Events (Web UI)

```javascript
// Real-time download progress
ws://web-ui:3000/ws
Events:
- download_progress: { hash, progress, speed, eta }
- download_completed: { hash, name, size }
- download_error: { hash, error }
- system_status: { services, stats }
```