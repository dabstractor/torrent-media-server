# Transmission RPC API Integration Guide

## Overview
This document provides complete integration details for implementing Transmission RPC API client in the torrent management system, specifically for migrating from qBittorrent frontend to Transmission backend.

## Official Documentation
- **Primary Source**: https://github.com/transmission/transmission/blob/main/docs/rpc-spec.md
- **GitHub Repository**: https://github.com/transmission/transmission

## Core Differences: qBittorrent vs Transmission

### Authentication
**qBittorrent**:
```http
POST /api/v2/auth/login
Content-Type: application/x-www-form-urlencoded
Cookie: SID=session_id_value
```

**Transmission**:
```http
POST /transmission/rpc
X-Transmission-Session-Id: session_id_value
Authorization: Basic base64(username:password)
Content-Type: application/json
```

### Request Format
**qBittorrent**: RESTful endpoints with form data
```typescript
const response = await fetch('/api/v2/torrents/info', {
  method: 'GET',
  headers: { 'Cookie': `SID=${this.sid}` }
});
```

**Transmission**: JSON-RPC over HTTP
```typescript
const response = await fetch('/transmission/rpc', {
  method: 'POST',
  headers: {
    'X-Transmission-Session-Id': this.sessionId,
    'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'torrent-get',
    arguments: { fields: ['id', 'name', 'status', 'percentDone'] }
  })
});
```

## Recommended TypeScript Library: @brielov/transmission-rpc

### Installation
```bash
npm install @brielov/transmission-rpc
```

### Basic Usage
```typescript
import { Transmission } from '@brielov/transmission-rpc';

const client = new Transmission({
  host: 'localhost',
  port: 9091,
  username: 'transmission',
  password: 'password'
});

// Get all torrents
const torrents = await client.torrents();

// Add torrent
await client.add({ 
  filename: 'https://example.com/torrent.torrent',
  'download-dir': '/downloads'
});

// Remove torrent
await client.remove(torrentId, deleteLocalData);
```

## Core RPC Methods

### Session Management
- `session-get` - Get session configuration
- `session-set` - Update session configuration  
- `session-stats` - Get statistics
- `port-test` - Test port connectivity

### Torrent Operations
- `torrent-get` - Retrieve torrent info
- `torrent-add` - Add new torrent
- `torrent-remove` - Remove torrent
- `torrent-start` - Start torrent
- `torrent-stop` - Stop torrent
- `torrent-set` - Modify torrent properties
- `torrent-move` - Move torrent data

## Settings Mapping: AppSettings to Transmission

### Bandwidth Settings
```typescript
const bandwidthMapping = {
  'speed-limit-down-enabled': appSettings.downloads.globalDownloadLimit > 0,
  'speed-limit-down': appSettings.downloads.globalDownloadLimit,
  'speed-limit-up-enabled': appSettings.downloads.globalUploadLimit > 0,
  'speed-limit-up': appSettings.downloads.globalUploadLimit,
  'alt-speed-enabled': appSettings.bandwidth.alternativeEnabled,
  'alt-speed-down': appSettings.bandwidth.alternativeDownloadLimit,
  'alt-speed-up': appSettings.bandwidth.alternativeUploadLimit,
};
```

### Queue Settings  
```typescript
const queueMapping = {
  'download-queue-enabled': appSettings.downloads.maxConcurrentDownloads > 0,
  'download-queue-size': appSettings.downloads.maxConcurrentDownloads,
  'seed-queue-enabled': appSettings.downloads.maxConcurrentUploads > 0,
  'seed-queue-size': appSettings.downloads.maxConcurrentUploads,
};
```

### Scheduler Settings
```typescript
const schedulerMapping = {
  'alt-speed-time-enabled': appSettings.bandwidth.scheduler.enabled,
  'alt-speed-time-begin': appSettings.bandwidth.scheduler.fromHour * 60 + appSettings.bandwidth.scheduler.fromMin,
  'alt-speed-time-end': appSettings.bandwidth.scheduler.toHour * 60 + appSettings.bandwidth.scheduler.toMin,
  'alt-speed-time-day': appSettings.bandwidth.scheduler.days, // Bitmask: 1=Sunday, 2=Monday, 4=Tuesday, etc.
};
```

## Error Handling Patterns

### 409 Conflict (Session ID Required)
```typescript
if (response.status === 409) {
  const sessionId = response.headers.get('X-Transmission-Session-Id');
  if (sessionId) {
    this.sessionId = sessionId;
    // Retry request with new session ID
    return this.request(method, arguments, sessionId);
  }
  throw new Error('Failed to obtain session ID from Transmission');
}
```

### Authentication Errors
```typescript
if (response.status === 401) {
  throw new Error('Transmission authentication failed. Check username and password.');
}
```

### Connection Validation
```typescript
async validateConnection(): Promise<{ connected: boolean; error?: string; version?: string }> {
  try {
    const response = await this.request('session-get', {});
    return {
      connected: true,
      version: response.arguments.version
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}
```

## Implementation Patterns for React/Next.js

### Client Service Structure
```typescript
class TransmissionClient {
  private sessionId: string | null = null;
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: { baseUrl: string; username?: string; password?: string }) {
    this.baseUrl = config.baseUrl;
    this.username = config.username || '';
    this.password = config.password || '';
  }

  private async request(method: string, arguments?: any): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['X-Transmission-Session-Id'] = this.sessionId;
    }

    if (this.username && this.password) {
      headers['Authorization'] = `Basic ${btoa(`${this.username}:${this.password}`)}`;
    }

    const response = await fetch(`${this.baseUrl}/transmission/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method,
        arguments: arguments || {}
      })
    });

    // Handle 409 session ID requirement
    if (response.status === 409) {
      const newSessionId = response.headers.get('X-Transmission-Session-Id');
      if (newSessionId) {
        this.sessionId = newSessionId;
        return this.request(method, arguments);
      }
    }

    if (!response.ok) {
      throw new Error(`Transmission RPC error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.result !== 'success') {
      throw new Error(`Transmission RPC error: ${data.result}`);
    }

    return data;
  }
}
```

### Settings Synchronization
```typescript
class TransmissionSyncService {
  async syncToTransmission(appSettings: AppSettings): Promise<SyncResult> {
    const transmissionPrefs = this.mapAppSettingsToTransmission(appSettings);
    
    try {
      await this.transmissionClient.request('session-set', transmissionPrefs);
      return { success: true, conflicts: [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        conflicts: []
      };
    }
  }

  private mapAppSettingsToTransmission(appSettings: AppSettings): any {
    return {
      // Bandwidth
      'speed-limit-down-enabled': appSettings.downloads.globalDownloadLimit > 0,
      'speed-limit-down': appSettings.downloads.globalDownloadLimit,
      'speed-limit-up-enabled': appSettings.downloads.globalUploadLimit > 0,
      'speed-limit-up': appSettings.downloads.globalUploadLimit,
      
      // Alternative speed limits
      'alt-speed-enabled': appSettings.bandwidth.alternativeEnabled,
      'alt-speed-down': appSettings.bandwidth.alternativeDownloadLimit,
      'alt-speed-up': appSettings.bandwidth.alternativeUploadLimit,
      
      // Scheduler
      'alt-speed-time-enabled': appSettings.bandwidth.scheduler.enabled,
      'alt-speed-time-begin': appSettings.bandwidth.scheduler.fromHour * 60 + appSettings.bandwidth.scheduler.fromMin,
      'alt-speed-time-end': appSettings.bandwidth.scheduler.toHour * 60 + appSettings.bandwidth.scheduler.toMin,
      'alt-speed-time-day': appSettings.bandwidth.scheduler.days,
      
      // Queue
      'download-queue-enabled': appSettings.downloads.maxConcurrentDownloads > 0,
      'download-queue-size': appSettings.downloads.maxConcurrentDownloads,
      'seed-queue-enabled': appSettings.downloads.maxConcurrentUploads > 0,
      'seed-queue-size': appSettings.downloads.maxConcurrentUploads,
      
      // Downloads
      'start-added-torrents': appSettings.downloads.startTorrentsImmediately,
      'download-dir': appSettings.downloads.defaultDownloadPath,
    };
  }
}
```

## Critical Gotchas

1. **Session ID Management**: Always handle 409 responses and extract new session IDs
2. **Authentication**: Use Basic Auth for username/password, not cookies
3. **Time Format**: Transmission scheduler times are in minutes since midnight
4. **Day Bitmask**: Scheduler days use bitmask (1=Sunday, 2=Monday, 4=Tuesday, etc.)
5. **Field Names**: Transmission uses hyphenated field names, not underscores
6. **Response Validation**: Always check `result` field in RPC response
7. **Content-Type**: Must be `application/json` for RPC calls

## Testing Strategy

### Mock RPC Responses
```typescript
const mockTransmissionResponse = {
  result: 'success',
  arguments: {
    torrents: [
      {
        id: 1,
        name: 'test.torrent',
        status: 4, // TR_STATUS_DOWNLOAD
        percentDone: 0.5,
        rateDownload: 1024000,
        rateUpload: 512000
      }
    ]
  }
};
```

### Integration Test Pattern
```typescript
describe('TransmissionClient', () => {
  let client: TransmissionClient;
  
  beforeEach(() => {
    client = new TransmissionClient({
      baseUrl: 'http://localhost:9091',
      username: 'test',
      password: 'test'
    });
  });

  it('should handle session ID requirement', async () => {
    // Mock 409 response followed by successful request
    fetchMock
      .mockResponseOnce('', { 
        status: 409, 
        headers: { 'X-Transmission-Session-Id': 'test-session-id' } 
      })
      .mockResponseOnce(JSON.stringify(mockTransmissionResponse));
      
    const result = await client.request('session-get');
    expect(result.result).toBe('success');
  });
});
```

This guide provides the complete foundation for implementing Transmission RPC API integration while maintaining compatibility with the existing application architecture.