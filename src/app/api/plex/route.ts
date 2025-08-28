// src/app/api/plex/route.ts
import { NextResponse } from 'next/server';
import { PlexService } from '@/lib/services/PlexService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const plexService = new PlexService();
    const results = await plexService.searchMedia(query);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching Plex media:', error);
    return NextResponse.json(
      { error: 'Failed to search Plex media' },
      { status: 500 }
    );
  }
}