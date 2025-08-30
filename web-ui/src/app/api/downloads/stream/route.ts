import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/api/errors'

const QB_URL = process.env.QBITTORRENT_URL || 'http://qbittorrent:8080'
const QB_USER = process.env.QBITTORRENT_USER || 'admin'
const QB_PASSWORD = process.env.QBITTORRENT_PASSWORD || 'admin'

// Stream configuration
const POLL_INTERVAL = 2000 // 2 seconds for real-time updates
const MAX_STREAM_DURATION = 10 * 60 * 1000 // 10 minutes max stream duration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second initial delay
const CONNECTION_TIMEOUT = 5000 // 5 seconds timeout

export async function GET(request: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      let sessionId: string | null = null
      let lastDataHash = ''

      // Function to test connection to qBittorrent
      const testConnection = async (): Promise<boolean> => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)
          
          const response = await fetch(`${QB_URL}/api/v2/app/version`, {
            method: 'GET',
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          return response.ok
        } catch (error) {
          console.error('qBittorrent connection test failed:', error)
          return false
        }
      }

      // Function to authenticate with qBittorrent with retry logic
      const authenticate = async (retryCount = 0): Promise<string | null> => {
        try {
          // Test connection first
          const isConnected = await testConnection()
          if (!isConnected) {
            throw new Error('qBittorrent service is unreachable. Please check the service status and network configuration.')
          }
          
          const loginParams = new URLSearchParams({
            username: QB_USER,
            password: QB_PASSWORD,
          })
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)
          
          const loginResponse = await fetch(`${QB_URL}/api/v2/auth/login`, {
            method: 'POST',
            body: loginParams,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (loginResponse.ok) {
            const setCookie = loginResponse.headers.get('Set-Cookie') || loginResponse.headers.get('set-cookie')
            if (setCookie) {
              const sidMatch = setCookie.match(/SID=([^;]+)/)
              if (sidMatch) {
                return sidMatch[1]
              }
            }
            throw new Error('Failed to get session ID from qBittorrent');
          } else if (loginResponse.status === 401 || loginResponse.status === 403) {
            throw new Error('Invalid qBittorrent username or password. Please check your credentials.');
          } else {
            throw new Error(`Authentication failed with status ${loginResponse.status}`)
          }
        } catch (error) {          
          // Retry logic with exponential backoff
          if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount)
            console.log(`Retrying authentication in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return authenticate(retryCount + 1)
          }

          console.error('qBittorrent authentication failed after multiple retries:', error)
          throw error;
        }
      }

      // Function to fetch torrent data with retry logic
      const fetchTorrents = async (retryCount = 0): Promise<any | null> => {
        try {
          if (!sessionId) {
            sessionId = await authenticate()
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)
          
          const response = await fetch(`${QB_URL}/api/v2/torrents/info`, {
            method: 'GET',
            headers: {
              'Cookie': `SID=${sessionId}`,
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)

          // Handle authentication failure
          if (response.status === 401 || response.status === 403) {
            sessionId = await authenticate()
            
            // Retry with new session
            const retryController = new AbortController()
            const retryTimeoutId = setTimeout(() => retryController.abort(), CONNECTION_TIMEOUT)
            
            const retryResponse = await fetch(`${QB_URL}/api/v2/torrents/info`, {
              method: 'GET',
              headers: {
                'Cookie': `SID=${sessionId}`,
              },
              signal: retryController.signal
            })
            
            clearTimeout(retryTimeoutId)
            
            if (!retryResponse.ok) {
              throw new Error(`qBittorrent API error after re-authentication: ${retryResponse.statusText}`)
            }
            
            const data = await retryResponse.json()
            return transformTorrentData(data)
          }

          if (!response.ok) {
            throw new Error(`qBittorrent API error: ${response.statusText}`)
          }

          const data = await response.json()
          return transformTorrentData(data)
        } catch (error) {
          // Retry logic with exponential backoff for network errors
          if (retryCount < MAX_RETRIES && (error instanceof Error && (error.name === 'TypeError' || error.name === 'AbortError'))) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount)
            console.log(`Retrying torrent fetch in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchTorrents(retryCount + 1)
          }
          
          console.error('Failed to fetch torrents after multiple retries:', error)
          throw error;
        }
      }

      // Function to transform torrent data
      const transformTorrentData = (data: any) => {
        // Transform data to match our Download interface
        const downloads = data.map((torrent: any) => ({
          hash: torrent.hash,
          name: torrent.name,
          size: torrent.size,
          progress: Math.round(torrent.progress * 100),
          state: mapQBittorrentState(torrent.state),
          eta: torrent.eta || 0,
          downloadSpeed: torrent.dlspeed || 0,
          uploadSpeed: torrent.upspeed || 0,
          priority: torrent.priority || 1,
          category: torrent.category || '',
          addedTime: torrent.added_on || Date.now() / 1000,
          completedTime: torrent.completed_on || undefined,
        }))

        // Calculate stats
        const stats = {
          totalSize: downloads.reduce((sum: number, d: any) => sum + d.size, 0),
          downloadSpeed: downloads.reduce((sum: number, d: any) => sum + d.downloadSpeed, 0),
          uploadSpeed: downloads.reduce((sum: number, d: any) => sum + d.uploadSpeed, 0),
          activeCount: downloads.filter((d: any) => 
            d.state === 'downloading' || d.state === 'seeding'
          ).length,
        }

        return { downloads, stats }
      }

      // Function to map qBittorrent states to our states
      const mapQBittorrentState = (qbState: string): string => {
        const stateMap: { [key: string]: string } = {
          'error': 'error',
          'pausedUP': 'paused',
          'pausedDL': 'paused', 
          'queuedUP': 'queued',
          'queuedDL': 'queued',
          'uploading': 'seeding',
          'stalledUP': 'seeding',
          'stalledDL': 'downloading',
          'downloading': 'downloading',
          'forcedDL': 'downloading',
          'metaDL': 'downloading',
          'allocating': 'downloading',
          'checkingUP': 'seeding',
          'checkingDL': 'downloading',
          'checkingResumeData': 'downloading',
        }
        return stateMap[qbState] || 'queued'
      }

      // Send initial connection message
      const encoder = new TextEncoder()
      
      // Test connection before sending initial message
      const isConnected = await testConnection()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
        type: 'connected', 
        timestamp: Date.now(),
        serviceStatus: isConnected ? 'online' : 'offline'
      })}\n\n`))

      // Polling loop
      const pollData = async () => {
        try {
          const data = await fetchTorrents()
          
          if (data) {
            // Create hash of data to detect changes
            const dataHash = JSON.stringify(data)
            
            // Only send update if data changed (debouncing)
            if (dataHash !== lastDataHash) {
              lastDataHash = dataHash
              
              const message = JSON.stringify({
                type: 'update',
                data,
                timestamp: Date.now()
              })
              
              controller.enqueue(encoder.encode(`data: ${message}\n\n`))
            }
          } else {
            // Send error message with more details
            const errorMessage = JSON.stringify({
              type: 'error',
              message: 'Failed to fetch download data from qBittorrent. Please check service status and configuration.',
              timestamp: Date.now()
            })
            
            controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`))
          }
        } catch (error) {
          console.error('Polling error:', error)
          
          const errorMessage = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred while fetching download data',
            timestamp: Date.now()
          })
          
          controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`))
        }
      }

      // Start polling
      const intervalId = setInterval(pollData, POLL_INTERVAL)
      
      // Initial data fetch
      await pollData()

      // Clean up function
      const cleanup = () => {
        if (intervalId) {
          clearInterval(intervalId)
        }
        try {
          controller.close()
        } catch {
          // Ignore close errors
        }
      }

      // Auto-cleanup after max duration
      setTimeout(() => {
        // Stream duration exceeded, closing connection
        cleanup()
      }, MAX_STREAM_DURATION)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        // Client disconnected from downloads stream
        cleanup()
      })
    },
  })

  return new Response(stream, { headers })
}

// Optional: Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}