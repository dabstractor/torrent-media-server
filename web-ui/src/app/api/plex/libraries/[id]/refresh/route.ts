import { NextRequest, NextResponse } from 'next/server';

const PLEX_BASE_URL = 'http://172.28.0.1:32400';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const libraryId = params.id;
    
    // Get Plex token from environment or headers
    const plexToken = process.env.PLEX_TOKEN || 'oKYPzYJozUhkMV2_oFNs';
    
    if (!plexToken) {
      return NextResponse.json(
        { error: 'Plex token not configured' },
        { status: 500 }
      );
    }

    // Trigger library refresh via Plex API
    const refreshUrl = `${PLEX_BASE_URL}/library/sections/${libraryId}/refresh?X-Plex-Token=${plexToken}`;
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      console.log(`Successfully triggered Plex library refresh for section ${libraryId}`);
      return NextResponse.json({ 
        success: true, 
        message: `Library ${libraryId} refresh triggered` 
      });
    } else {
      console.error(`Failed to refresh Plex library ${libraryId}: HTTP ${response.status}`);
      return NextResponse.json(
        { error: `Plex API returned ${response.status}` },
        { status: response.status }
      );
    }
    
  } catch (error: any) {
    console.error('Plex library refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh Plex library' },
      { status: 500 }
    );
  }
}