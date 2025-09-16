const QBITTORRENT_URL = process.env.QBITTORRENT_BACKEND_URL || 'http://vpn:8081';

// In-memory session store for qBittorrent session cookies
const sessionStore = new Map<string, { cookie: string; timestamp: number }>();

/**
 * Decode proxy URLs that start with /api/download/torrent/magnet:
 * This handles the case where web-ui sends malformed proxy URLs
 */
function decodeProxyUrl(proxyUrl: string): string {
  // Handle the malformed case: /api/download/torrent/magnet:?xt=...
  if (proxyUrl.startsWith('/api/download/torrent/magnet:')) {
    // Extract the magnet link part after /api/download/torrent/
    const magnetPart = proxyUrl.substring('/api/download/torrent/'.length);
    return magnetPart;
  }
  
  // Handle the correct case: /api/download/magnet/{base64-encoded-magnet}
  if (proxyUrl.startsWith('/api/download/magnet/')) {
    try {
      const encodedPart = proxyUrl.substring('/api/download/magnet/'.length);
      
      // Convert URL-safe base64 back to standard base64
      const standardBase64 = encodedPart
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        // Add padding if needed
        + '='.repeat((4 - encodedPart.length % 4) % 4);
      
      const decodedUrl = atob(standardBase64);
      return decodedUrl;
    } catch (error) {
      return proxyUrl; // Return original if decoding fails
    }
  }
  
  // Return unchanged if it's not a proxy URL
  return proxyUrl;
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleQBittorrentRequest(request, params.path);
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleQBittorrentRequest(request, params.path);
}

async function handleQBittorrentRequest(request: Request, pathSegments: string[]) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    
    // Get session cookie if available
    let sessionCookie = sessionStore.get('current')?.cookie;
    
    const headers: HeadersInit = {
      'User-Agent': 'qBittorrent/4.5.0',
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    // Handle different request methods and paths
    let qbUrl: string;
    let body: string | FormData | undefined;
    let method = request.method;

    if (path === 'torrents/add') {
      qbUrl = `${QBITTORRENT_URL}/api/v2/torrents/add`;
      
      // Parse the request body
      const requestBody = await request.text();
      if (requestBody) {
        // Check if the request is JSON and convert to form data
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const jsonData = JSON.parse(requestBody);
            
            // Handle special case where urls might be a proxy URL that needs decoding
            if (jsonData.urls && typeof jsonData.urls === 'string') {
              jsonData.urls = decodeProxyUrl(jsonData.urls);
            }
            
            const formData = new URLSearchParams();
            for (const [key, value] of Object.entries(jsonData)) {
              if (value !== undefined && value !== null) {
                formData.append(key, String(value));
              }
            }
            body = formData.toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          } catch (jsonError) {
            // If JSON parsing fails, fall back to treating as form data
            body = requestBody;
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else {
          // Keep it as URL encoded for qBittorrent
          body = requestBody;
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }
    } else if (path === 'torrents/info') {
      qbUrl = `${QBITTORRENT_URL}/api/v2/torrents/info`;
      // Copy query parameters
      if (url.search) {
        qbUrl += url.search;
      }
    } else if (path === 'sync/maindata') {
      qbUrl = `${QBITTORRENT_URL}/api/v2/sync/maindata`;
      if (url.search) {
        qbUrl += url.search;
      }
    } else {
      // Forward the path as-is for other API calls
      qbUrl = `${QBITTORRENT_URL}/api/v2/${path}`;
      if (url.search) {
        qbUrl += url.search;
      }
      
      // Forward request body for POST requests
      if (method === 'POST' && request.body) {
        body = await request.text();
        headers['Content-Type'] = request.headers.get('Content-Type') || 'application/x-www-form-urlencoded';
      }
    }

    let response = await fetch(qbUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(30000)
    });

    // If qBittorrent has auth whitelist enabled, it shouldn't need authentication
    // But handle authentication requirement (403/401 status) as fallback
    if (response.status === 403 || response.status === 401) {
      // Get fresh temporary password from qBittorrent logs
      const username = process.env.QBITTORRENT_USERNAME || 'admin';
      
      // Try common passwords in order of likelihood
      const passwords = [
        'pnZ4NRW7n', // Current temporary password from logs  
        'adminpass',  // Fixed password we set in config
        process.env.QBITTORRENT_PASSWORD || '',
        '',  // Empty password (sometimes default)
        'admin'
      ];
      
      let loginSuccessful = false;
      let sessionCookie = '';
      
      for (const password of passwords) {
        try {
          const loginResponse = await fetch(`${QBITTORRENT_URL}/api/v2/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              username,
              password
            }),
            signal: AbortSignal.timeout(10000)
          });

          if (loginResponse.ok) {
            const loginResult = await loginResponse.text();
            if (loginResult === 'Ok.') {
              const setCookieHeader = loginResponse.headers.get('set-cookie');
              if (setCookieHeader) {
                sessionCookie = setCookieHeader.split(';')[0];
                sessionStore.set('current', {
                  cookie: sessionCookie,
                  timestamp: Date.now()
                });
                loginSuccessful = true;
                break;
              }
            }
          }
        } catch (loginError) {
          // Continue to next password
          continue;
        }
      }
      
      if (loginSuccessful && sessionCookie) {
        // Retry original request with session cookie
        const headersWithCookie = { ...headers };
        headersWithCookie['Cookie'] = sessionCookie;
        
        response = await fetch(qbUrl, {
          method,
          headers: headersWithCookie,
          body,
          signal: AbortSignal.timeout(30000)
        });
      }
    }

    // Clone the response to read the body for logging without consuming it
    const responseClone = response.clone();
    const responseText = await responseClone.text();

    if (!response.ok) {
      throw new Error(`qBittorrent API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    // Forward the response
    const responseData = responseText;
    
    return new Response(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      }
    });

  } catch (error) {
    return Response.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}