const TRANSMISSION_URL = process.env.TRANSMISSION_URL || 'http://transmission:9091';

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
    const targetUrl = `${TRANSMISSION_URL}/transmission/${path}${url.search}`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    // Transmission uses basic auth
    if (process.env.TRANSMISSION_USERNAME && process.env.TRANSMISSION_PASSWORD) {
      const credentials = btoa(`${process.env.TRANSMISSION_USERNAME}:${process.env.TRANSMISSION_PASSWORD}`);
      headers.set('Authorization', `Basic ${credentials}`);
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
    console.error('Transmission proxy error:', error);
    return Response.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}