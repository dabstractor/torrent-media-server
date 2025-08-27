# Prowlarr Search API Documentation

## Overview

Prowlarr aggregates torrent indexers and provides a unified REST API for searching across multiple sources. This document covers the essential search API patterns needed for integration.

## Authentication

All API requests require the `X-Api-Key` header:

```http
X-Api-Key: your_prowlarr_api_key_here
Content-Type: application/json
```

## Search Endpoint

### Base URL Structure
```
GET http://prowlarr:9696/api/v1/search
```

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `query` | string | Yes | Search term | `ubuntu linux` |
| `categories` | string | No | Comma-separated category IDs | `2000,5000` |
| `indexerIds` | string | No | Comma-separated indexer IDs | `1,2,3` |
| `minSeeders` | integer | No | Minimum number of seeders | `5` |
| `maxAge` | integer | No | Maximum age in days | `365` |
| `offset` | integer | No | Pagination offset | `0` |
| `limit` | integer | No | Results per page (max 100) | `50` |

### Example Request

```bash
curl -X GET "http://prowlarr:9696/api/v1/search?query=ubuntu&categories=2000&limit=50" \
  -H "X-Api-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

## Response Format

### Successful Response

```json
{
  "results": [
    {
      "guid": "unique_torrent_identifier",
      "title": "Ubuntu 22.04.3 Desktop amd64.iso",
      "size": 4294967296,
      "publishDate": "2023-08-10T12:00:00Z",
      "indexer": "IndexerName",
      "indexerId": 1,
      "infoUrl": "https://indexer.com/torrent/123",
      "downloadUrl": "https://indexer.com/download/123.torrent",
      "magnetUrl": "magnet:?xt=urn:btih:...",
      "seeders": 150,
      "peers": 25,
      "categories": [2000, 2020],
      "categoryDesc": "PC/Software"
    }
  ],
  "offset": 0,
  "limit": 50,
  "total": 250
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `guid` | string | Unique torrent identifier |
| `title` | string | Torrent title |
| `size` | number | File size in bytes |
| `publishDate` | string | ISO 8601 publish date |
| `indexer` | string | Indexer display name |
| `indexerId` | number | Indexer ID |
| `downloadUrl` | string | .torrent file download URL |
| `magnetUrl` | string | Magnet link (may be null) |
| `seeders` | number | Current seeder count |
| `peers` | number | Current peer count |
| `categories` | array | Category ID array |

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable (indexer issues)

### Error Response Format

```json
{
  "error": "Invalid query parameter",
  "details": "Query parameter 'query' is required"
}
```

## Category IDs

Common torrent categories:

| Category | ID | Description |
|----------|----|-----------| 
| PC | 2000 | PC Software/Games |
| Movies | 2000 | Movies |
| TV | 5000 | TV Shows |
| Audio | 3000 | Music/Audio |
| Books | 7000 | E-books/Comics |

## Rate Limiting

- **Default**: 60 requests per minute per API key
- **Indexer-specific**: Some indexers have stricter limits
- **Recommendation**: Implement client-side debouncing (500ms minimum)
- **Headers**: Check `X-RateLimit-*` response headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
```

## Best Practices

### 1. Query Optimization
- Use specific search terms (avoid single characters)
- Implement minimum query length (2-3 characters)
- Cache search results locally (5-10 minutes TTL)

### 2. Error Resilience
- Handle individual indexer failures gracefully
- Implement exponential backoff for retries
- Show partial results when some indexers fail

### 3. Performance
- Debounce search inputs (500ms recommended)
- Use pagination for large result sets
- Limit concurrent search requests

### 4. User Experience
- Display indexer-specific errors to users
- Show search progress for slow indexers
- Implement search suggestions and history

## Implementation Example

```typescript
interface ProwlarrSearchParams {
  query: string;
  categories?: string;
  indexerIds?: string;
  minSeeders?: number;
  offset?: number;
  limit?: number;
}

interface ProwlarrSearchResult {
  guid: string;
  title: string;
  size: number;
  publishDate: string;
  indexer: string;
  downloadUrl: string;
  magnetUrl?: string;
  seeders: number;
  peers: number;
  categories: number[];
}

interface ProwlarrSearchResponse {
  results: ProwlarrSearchResult[];
  offset: number;
  limit: number;
  total: number;
}

async function searchProwlarr(params: ProwlarrSearchParams): Promise<ProwlarrSearchResponse> {
  const url = new URL('/api/v1/search', 'http://prowlarr:9696');
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': process.env.PROWLARR_API_KEY!,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Prowlarr API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

## Common Issues & Solutions

### 1. No Results Returned
- Check if indexers are configured and healthy
- Verify query parameters are valid
- Ensure API key has proper permissions

### 2. Slow Response Times
- Indexers may be slow or unresponsive
- Implement client-side timeout (30 seconds)
- Consider indexer health checks

### 3. Rate Limiting
- Implement exponential backoff
- Cache results to reduce API calls
- Monitor rate limit headers

### 4. Authentication Failures
- Verify API key is correct
- Check API key permissions in Prowlarr settings
- Ensure `X-Api-Key` header format is correct

## Security Considerations

- Store API keys securely (environment variables)
- Use HTTPS in production environments
- Implement proper CORS policies
- Validate and sanitize search queries
- Consider API key rotation policies

This documentation provides the essential information needed to integrate with Prowlarr's search API effectively, following best practices for performance, reliability, and user experience.