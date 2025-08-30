const TRANSMISSION_URL = process.env.TRANSMISSION_URL || 'http://transmission:9091';
const TRANSMISSION_USER = process.env.TRANSMISSION_USERNAME || 'admin';
const TRANSMISSION_PASSWORD = process.env.TRANSMISSION_PASSWORD || 'adminpass123';

// In-memory session store (in production, use Redis or similar)
const sessionStore = new Map<string, { sessionId: string; timestamp: number }>();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessionStore.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      sessionStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleRPCRequest(request, params.path);
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  // For GET requests, we can provide some basic info or redirect to RPC
  const path = params.path.join('/');
  
  if (path === 'session-get' || path === 'status') {
    // Convert GET to POST for Transmission RPC
    const body = JSON.stringify({
      method: 'session-get',
      arguments: {}
    });
    
    const rpcRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    
    return handleRPCRequest(rpcRequest, ['session-get']);
  }
  
  return Response.json(
    { error: 'GET requests not supported. Use POST with JSON-RPC format.' },
    { status: 405 }
  );
}

async function handleRPCRequest(request: Request, pathSegments: string[]) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId') || 'default';
    
    // Parse request body for RPC method
    let rpcMethod: string;
    let rpcArguments: any = {};
    
    try {
      const body = await request.json();
      rpcMethod = body.method;
      rpcArguments = body.arguments || {};
    } catch {
      // If no valid JSON body, try to infer from path
      rpcMethod = pathSegments.join('-') || 'session-get';
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Handle session ID management
    let sessionId: string | null = null;
    const storedSession = sessionStore.get(clientId);
    
    if (storedSession && (Date.now() - storedSession.timestamp < SESSION_TIMEOUT)) {
      sessionId = storedSession.sessionId;
      headers['X-Transmission-Session-Id'] = sessionId;
    }

    // Add Basic Auth
    if (TRANSMISSION_USER && TRANSMISSION_PASSWORD) {
      headers['Authorization'] = `Basic ${btoa(`${TRANSMISSION_USER}:${TRANSMISSION_PASSWORD}`)}`;
    }

    // Prepare RPC request
    const rpcRequest = {
      method: rpcMethod,
      arguments: rpcArguments
    };

    const transmissionResponse = await fetch(`${TRANSMISSION_URL}/transmission/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rpcRequest),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Handle 409 Conflict - Session ID required
    if (transmissionResponse.status === 409) {
      const newSessionId = transmissionResponse.headers.get('X-Transmission-Session-Id');
      if (newSessionId) {
        // Store new session ID
        sessionStore.set(clientId, {
          sessionId: newSessionId,
          timestamp: Date.now()
        });

        // Retry request with new session ID
        const retryHeaders = {
          ...headers,
          'X-Transmission-Session-Id': newSessionId
        };

        const retryResponse = await fetch(`${TRANSMISSION_URL}/transmission/rpc`, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(rpcRequest),
          signal: AbortSignal.timeout(30000),
        });

        if (!retryResponse.ok) {
          return Response.json(
            { error: `Transmission RPC error: ${retryResponse.statusText}` },
            { status: retryResponse.status }
          );
        }

        const data = await retryResponse.json();
        return Response.json(data, {
          headers: {
            'Content-Type': 'application/json',
            'X-Transmission-Session-Id': newSessionId,
          }
        });
      } else {
        return Response.json(
          { error: 'Failed to obtain session ID from Transmission' },
          { status: 409 }
        );
      }
    }

    if (!transmissionResponse.ok) {
      if (transmissionResponse.status === 401) {
        return Response.json(
          { error: 'Transmission authentication failed. Check credentials.' },
          { status: 401 }
        );
      }
      
      return Response.json(
        { error: `Transmission connection failed: ${transmissionResponse.statusText}` },
        { status: transmissionResponse.status }
      );
    }

    const data = await transmissionResponse.json();
    
    // Update session timestamp if we have a stored session
    if (sessionId && sessionStore.has(clientId)) {
      sessionStore.set(clientId, {
        sessionId,
        timestamp: Date.now()
      });
    }

    return Response.json(data, {
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && { 'X-Transmission-Session-Id': sessionId })
      }
    });

  } catch (error) {
    console.error('Transmission RPC proxy error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return Response.json(
          { error: 'Transmission request timeout' },
          { status: 504 }
        );
      }
      
      if (error.message.includes('fetch')) {
        return Response.json(
          { error: 'Unable to connect to Transmission daemon' },
          { status: 503 }
        );
      }
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

