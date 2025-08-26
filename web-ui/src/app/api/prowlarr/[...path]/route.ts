const PROWLARR_URL = process.env.PROWLARR_URL || 'http://prowlarr:9696';
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY;

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

export async function PUT(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'DELETE');
}

async function handleProxyRequest(request: Request, pathSegments: string[], method: string) {
  try {
    // Validate API key is configured
    if (!PROWLARR_API_KEY) {
      console.error('PROWLARR_API_KEY environment variable is not set');
      return Response.json(
        { error: 'Prowlarr API key not configured' },
        { status: 500 }
      );
    }

    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const targetUrl = `${PROWLARR_URL}/api/v1/${path}${url.search}`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('X-Api-Key', PROWLARR_API_KEY);

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    };

    if (method !== 'GET' && method !== 'DELETE') {
      const body = await request.text();
      if (body) {
        config.body = body;
      }
    }

    const response = await fetch(targetUrl, config);
    const data = await response.text();

    // Forward the response with appropriate headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
    
    // Forward other important headers
    const forwardHeaders = ['X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'];
    forwardHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    return new Response(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Prowlarr proxy error:', error);
    return Response.json(
      { error: 'Service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}