import { NextRequest, NextResponse } from 'next/server';
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manually initializing PlexIntegrationManager for testing...');

    // Initialize with test settings
    const testSettings = {
      enabled: true,
      token: 'oKYPzYJozUhkMV2_oFNs',
      url: 'http://localhost:32400',
      movieLibrary: 'Movies',
      tvLibrary: 'tv',
      mediaPath: '/media',
      autoUpdate: true,
      refreshDelay: 10,
      scanAllLibraries: false,
      organizationEnabled: true,
      updateLibraryOnComplete: true,
      categories: []
    };

    const success = await plexIntegrationManager.initialize('oKYPzYJozUhkMV2_oFNs', testSettings);
    
    if (success) {
      console.log('✓ PlexIntegrationManager initialized successfully');
      
      return NextResponse.json({
        success: true,
        message: 'PlexIntegrationManager initialized for testing',
        isReady: plexIntegrationManager.isReady()
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to initialize PlexIntegrationManager' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Error initializing PlexIntegrationManager:', error);
    return NextResponse.json(
      { error: 'Initialization failed', details: error.message },
      { status: 500 }
    );
  }
}