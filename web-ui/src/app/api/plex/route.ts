import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This is a placeholder for the main Plex API route
    // In a real implementation, this might return general Plex integration info
    return NextResponse.json({
      message: 'Plex API endpoint',
      version: '1.0.0',
      status: 'active'
    });
  } catch (error) {
    console.error('Error in Plex API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}