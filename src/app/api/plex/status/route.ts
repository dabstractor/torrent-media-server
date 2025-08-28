// src/app/api/plex/status/route.ts
import { NextResponse } from 'next/server';
import { PlexService } from '@/lib/services/PlexService';

export async function GET() {
  try {
    const plexService = new PlexService();
    const serverInfo = await plexService.getServerInfo();

    if (!serverInfo) {
      return NextResponse.json(
        { error: 'Unable to connect to Plex server' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'online',
      server: serverInfo,
    });
  } catch (error) {
    console.error('Error fetching Plex status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Plex status' },
      { status: 500 }
    );
  }
}