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
    JELLYFIN_URL: process.env.JELLYFIN_URL,
    OVERSEERR_URL: process.env.OVERSEERR_URL,
    JELLYSEER_URL: process.env.JELLYSEER_URL,
    API_BASE_URL: process.env.API_BASE_URL,
    WEB_UI_PORT: process.env.WEB_UI_PORT,
  };

  console.log('[DEBUG] Config API returning:', config);

  return Response.json(config);
}