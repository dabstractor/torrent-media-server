import { NextRequest, NextResponse } from 'next/server';

const PLEX_BASE_URL = 'http://172.28.0.1:32400';

export async function GET(request: NextRequest) {
  try {
    // Get Plex token from environment or hardcoded
    const plexToken = process.env.PLEX_TOKEN || 'oKYPzYJozUhkMV2_oFNs';
    
    if (!plexToken) {
      return NextResponse.json(
        { error: 'Plex token not configured' },
        { status: 500 }
      );
    }

    // Get library sections from Plex API
    const sectionsUrl = `${PLEX_BASE_URL}/library/sections?X-Plex-Token=${plexToken}`;
    
    const response = await fetch(sectionsUrl, {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to get Plex libraries: HTTP ${response.status}`);
      return NextResponse.json(
        { error: `Plex API returned ${response.status}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();
    
    // Simple XML parsing to extract library info
    const libraries: any[] = [];
    const directoryMatches = xmlText.match(/<Directory[^>]*>/g);
    
    if (directoryMatches) {
      for (const match of directoryMatches) {
        const keyMatch = match.match(/key="([^"]*)"/);
        const titleMatch = match.match(/title="([^"]*)"/);
        const typeMatch = match.match(/type="([^"]*)"/);
        
        if (keyMatch && titleMatch && typeMatch) {
          libraries.push({
            id: keyMatch[1],
            title: titleMatch[1],
            type: typeMatch[1]
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: libraries 
    });
    
  } catch (error: any) {
    console.error('Plex libraries fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Plex libraries' },
      { status: 500 }
    );
  }
}