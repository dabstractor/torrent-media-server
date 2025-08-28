import { NextResponse } from 'next/server';
import { plexService } from '@/lib/services/PlexService';

export async function GET() {
  try {
    // In a real implementation, this would fetch actual Plex server info
    // For now, we'll return mock data to demonstrate the API structure
    const serverInfo = await plexService.getServerInfo();
    
    if (!serverInfo) {
      return NextResponse.json(
        { error: 'Plex server not configured or unreachable' },
        { status: 503 }
      );
    }

    return NextResponse.json(serverInfo);
  } catch (error) {
    console.error('Error fetching Plex status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Plex status' },
      { status: 500 }
    );
  }
}