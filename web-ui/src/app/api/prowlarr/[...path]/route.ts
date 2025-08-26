const PROWLARR_URL = process.env.PROWLARR_URL || 'http://prowlarr:9696';

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
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const targetUrl = `${PROWLARR_URL}/api/v1/${path}${url.search}`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (process.env.PROWLARR_API_KEY) {
      headers.set('X-Api-Key', process.env.PROWLARR_API_KEY);
    }

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

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Prowlarr proxy error:', error);
    return Response.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}