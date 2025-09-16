// Force dynamic rendering so environment variables are available at runtime
export const dynamic = 'force-dynamic'

export async function GET() {
  // Return environment-based configuration
  const config = {
    PROWLARR_URL: process.env.PROWLARR_URL,
    QBITTORRENT_URL: process.env.QBITTORRENT_URL,
    PLEX_URL: process.env.PLEX_URL,
    SONARR_URL: process.env.SONARR_URL,
    RADARR_URL: process.env.RADARR_URL,
    API_BASE_URL: process.env.API_BASE_URL,
    WEB_UI_PORT: process.env.WEB_UI_PORT,
  };

  return Response.json(config);
}