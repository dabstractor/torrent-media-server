// Force dynamic rendering so environment variables are available at runtime
export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('=== CONFIG API CALLED ===')

  // Return hardcoded values to test if route works
  const config = {
    PROWLARR_URL: 'http://localhost:36096',
    QBITTORRENT_URL: 'http://localhost:37178',
    PLEX_URL: 'http://localhost:41586',
    SONARR_URL: 'http://localhost:26013',
    RADARR_URL: 'http://localhost:38822',
    API_BASE_URL: 'http://localhost',
    WEB_UI_PORT: process.env.WEB_UI_PORT,
  };

  console.log('Returning hardcoded config:', config)
  return Response.json(config);
}