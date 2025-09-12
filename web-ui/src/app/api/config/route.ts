export async function GET() {
  // Only expose the variables that the frontend needs and are safe to expose
  const config = {
    PROWLARR_URL: process.env.PROWLARR_URL || 'http://prowlarr:9696',
    QBITTORRENT_URL: process.env.QBITTORRENT_URL || 'http://qbittorrent:8080',
    PLEX_URL: process.env.PLEX_URL || 'http://plex:32400',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost',
  };

  return Response.json(config);
}