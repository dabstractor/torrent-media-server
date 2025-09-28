const TRANSMISSION_URL = process.env.TRANSMISSION_BACKEND_URL || 'http://vpn:9091';

// In-memory session store for Transmission session IDs
const sessionStore = new Map<string, { sessionId: string; timestamp: number }>();

/**
 * Transmission RPC API proxy
 * Handles the unique session ID protocol required by Transmission
 */

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleTransmissionRequest(request, params.path, 'GET');
}

export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  return handleTransmissionRequest(request, params.path, 'POST');
}

async function handleTransmissionRequest(request: Request, pathSegments: string[], method: string) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(request.url);

    // Get session ID if available
    let sessionId = sessionStore.get('current')?.sessionId;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (sessionId) {
      headers['X-Transmission-Session-Id'] = sessionId;
    }

    // Transmission uses /transmission/rpc endpoint for all API calls
    const transmissionUrl = `${TRANSMISSION_URL}/transmission/rpc`;

    let requestBody: any;
    let transmissionMethod = '';
    let transmissionArguments: any = {};

    // Handle different paths and convert to Transmission RPC format
    if (path === 'torrents/info' || path === 'sync/maindata') {
      // Get torrent list
      transmissionMethod = 'torrent-get';
      transmissionArguments = {
        fields: [
          'id', 'name', 'status', 'totalSize', 'percentDone',
          'downloadedEver', 'uploadedEver', 'rateDownload', 'rateUpload',
          'eta', 'addedDate', 'doneDate', 'error', 'errorString',
          'downloadDir', 'isFinished', 'queuePosition'
        ]
      };
    } else if (path === 'torrents/add') {
      // Add torrent
      transmissionMethod = 'torrent-add';

      if (method === 'POST') {
        const requestBodyText = await request.text();
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const jsonData = JSON.parse(requestBodyText);

          // Convert qBittorrent-style parameters to Transmission format
          transmissionArguments = {};

          if (jsonData.urls) {
            if (jsonData.urls.startsWith('magnet:')) {
              transmissionArguments.filename = jsonData.urls;
            } else {
              transmissionArguments.filename = jsonData.urls;
            }
          }

          if (jsonData.savepath || jsonData.downloadPath) {
            transmissionArguments['download-dir'] = jsonData.savepath || jsonData.downloadPath;
          }

          if (jsonData.category) {
            // Transmission doesn't have categories, but we can use download directory
            transmissionArguments['download-dir'] = `/downloads/complete/${jsonData.category}`;
          }

          if (jsonData.paused === 'true' || jsonData.paused === true) {
            transmissionArguments.paused = true;
          }
        } else {
          // Handle form data
          const formData = new URLSearchParams(requestBodyText);
          transmissionArguments = {};

          if (formData.get('urls')) {
            transmissionArguments.filename = formData.get('urls');
          }

          if (formData.get('savepath')) {
            transmissionArguments['download-dir'] = formData.get('savepath');
          }

          if (formData.get('category')) {
            transmissionArguments['download-dir'] = `/downloads/complete/${formData.get('category')}`;
          }
        }
      }
    } else if (path.startsWith('torrents/') && path.includes('/')) {
      // Handle torrent-specific actions (pause, resume, delete, etc.)
      const pathParts = path.split('/');
      const action = pathParts[1];

      // Parse torrent IDs from query or body
      const torrentIds: number[] = [];
      if (url.searchParams.has('hashes')) {
        // Note: Transmission uses numeric IDs, not hashes like qBittorrent
        // This is a limitation that would need mapping in a production system
        const hashes = url.searchParams.get('hashes')?.split('|') || [];
        // For demo purposes, we'll assume sequential IDs
        torrentIds.push(...hashes.map((_, index) => index + 1));
      }

      switch (action) {
        case 'pause':
          transmissionMethod = 'torrent-stop';
          transmissionArguments = { ids: torrentIds };
          break;
        case 'resume':
          transmissionMethod = 'torrent-start';
          transmissionArguments = { ids: torrentIds };
          break;
        case 'delete':
          transmissionMethod = 'torrent-remove';
          transmissionArguments = {
            ids: torrentIds,
            'delete-local-data': url.searchParams.has('deleteFiles')
          };
          break;
        default:
          transmissionMethod = 'torrent-get';
          transmissionArguments = { fields: ['id', 'name'], ids: torrentIds };
      }
    } else {
      // Default to session stats
      transmissionMethod = 'session-stats';
      transmissionArguments = {};
    }

    // Build Transmission RPC request
    requestBody = {
      method: transmissionMethod,
      arguments: transmissionArguments,
      tag: Date.now()
    };

    let response = await fetch(transmissionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    });

    // Handle 409 response (session ID required/expired)
    if (response.status === 409) {
      const newSessionId = response.headers.get('X-Transmission-Session-Id');
      if (newSessionId) {
        sessionStore.set('current', {
          sessionId: newSessionId,
          timestamp: Date.now()
        });

        // Retry with new session ID
        const headersWithSession = { ...headers };
        headersWithSession['X-Transmission-Session-Id'] = newSessionId;

        response = await fetch(transmissionUrl, {
          method: 'POST',
          headers: headersWithSession,
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000)
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transmission RPC error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();

    // Convert Transmission response to qBittorrent-compatible format for web UI
    let convertedResponse = responseData;

    if (responseData.result === 'success' && responseData.arguments) {
      if (transmissionMethod === 'torrent-get' && responseData.arguments.torrents) {
        // Convert torrent list to qBittorrent format
        convertedResponse = responseData.arguments.torrents.map((torrent: any) => ({
          hash: `transmission_${torrent.id}`, // Fake hash for compatibility
          name: torrent.name,
          size: torrent.totalSize,
          progress: torrent.percentDone,
          dlspeed: torrent.rateDownload,
          upspeed: torrent.rateUpload,
          eta: torrent.eta > 0 ? torrent.eta : 8640000,
          state: getQBittorrentState(torrent.status),
          completed: torrent.downloadedEver,
          uploaded: torrent.uploadedEver,
          added_on: torrent.addedDate,
          completed_on: torrent.doneDate || 0,
          category: extractCategoryFromPath(torrent.downloadDir),
          save_path: torrent.downloadDir
        }));
      } else if (transmissionMethod === 'torrent-add') {
        // Convert add response
        if (responseData.arguments['torrent-added']) {
          convertedResponse = { status: 'success' };
        } else if (responseData.arguments['torrent-duplicate']) {
          convertedResponse = { status: 'duplicate' };
        }
      }
    }

    return new Response(JSON.stringify(convertedResponse), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Transmission API error:', error);
    return Response.json(
      { error: 'Transmission service unavailable' },
      { status: 503 }
    );
  }
}

/**
 * Convert Transmission status codes to qBittorrent-compatible states
 */
function getQBittorrentState(transmissionStatus: number): string {
  switch (transmissionStatus) {
    case 0: return 'pausedDL'; // TR_STATUS_STOPPED
    case 1: return 'queuedDL'; // TR_STATUS_CHECK_WAIT
    case 2: return 'checkingDL'; // TR_STATUS_CHECK
    case 3: return 'queuedDL'; // TR_STATUS_DOWNLOAD_WAIT
    case 4: return 'downloading'; // TR_STATUS_DOWNLOAD
    case 5: return 'queuedUP'; // TR_STATUS_SEED_WAIT
    case 6: return 'uploading'; // TR_STATUS_SEED
    default: return 'unknown';
  }
}

/**
 * Extract category from download directory path
 */
function extractCategoryFromPath(downloadDir: string): string {
  if (!downloadDir) return '';

  const parts = downloadDir.split('/');
  const completePart = parts.indexOf('complete');

  if (completePart >= 0 && completePart < parts.length - 1) {
    return parts[completePart + 1];
  }

  return '';
}