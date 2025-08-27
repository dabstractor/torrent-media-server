const QB_URL = process.env.TRANSMISSION_URL || 'http://transmission:9091';
const QB_USER = process.env.TRANSMISSION_USERNAME || 'admin';
const QB_PASSWORD = process.env.TRANSMISSION_PASSWORD || 'adminpass123';

// In-memory session store (in production, use Redis or similar)
const sessionStore = new Map<string, { sid: string; timestamp: number }>();

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'POST');
}

async function handleProxyRequest(request: Request, pathSegments: string[], method: string) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const targetUrl = `${QB_URL}/api/v2/${path}${url.search}`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // Handle qBittorrent authentication
    const sessionId = url.searchParams.get('sessionId');
    if (sessionId && sessionStore.has(sessionId)) {
      // Use existing session
      const session = sessionStore.get(sessionId)!;
      headers.set('Cookie', `SID=${session.sid}`);
    } else {
      // Create new session by logging in
      const loginParams = new URLSearchParams({
        username: QB_USER,
        password: QB_PASSWORD,
      });
      
      const loginResponse = await fetch(`${QB_URL}/api/v2/auth/login`, {
        method: 'POST',
        body: loginParams,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      if (loginResponse.ok) {
        const setCookie = loginResponse.headers.get('Set-Cookie') || loginResponse.headers.get('set-cookie');
        if (setCookie) {
          const sidMatch = setCookie.match(/SID=([^;]+)/);
          if (sidMatch) {
            headers.set('Cookie', `SID=${sidMatch[1]}`);
            // Store session for reuse
            sessionStore.set(sessionId || Date.now().toString(), {
              sid: sidMatch[1],
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    };

    if (method !== 'GET') {
      const body = await request.text();
      if (body) {
        config.body = body;
      }
    }

    const response = await fetch(targetUrl, config);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('qBittorrent proxy error:', error);
    return Response.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}