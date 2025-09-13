import { NextRequest, NextResponse } from 'next/server';
import { startFileMonitoring, getFileMonitor } from '@/lib/utils/file-monitoring';
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager';
import { settingsService } from '@/lib/services/SettingsService';

// Track if services are already initialized
let servicesInitialized = false;

export async function POST(request: NextRequest) {
  try {
    if (servicesInitialized) {
      const monitor = getFileMonitor();
      const status = monitor.getStatus();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Services already running',
        status: {
          fileMonitoring: status,
          servicesInitialized: true
        }
      });
    }

    console.log('🚀 Initializing background services...');

    // Initialize Plex integration with hardcoded settings for testing
    console.log('🔧 Initializing Plex integration with test settings...');
    const testPlexSettings = {
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
    
    const initSuccess = await plexIntegrationManager.initialize(
      'oKYPzYJozUhkMV2_oFNs',
      testPlexSettings
    );
    
    if (initSuccess) {
      console.log('✓ Plex integration initialized with test settings');
    } else {
      console.warn('⚠️ Plex integration initialization failed');
    }

    // Start file monitoring
    startFileMonitoring();
    
    const monitor = getFileMonitor();
    const status = monitor.getStatus();
    
    if (status.isRunning) {
      console.log('✓ File monitoring service started');
      console.log(`📁 Watching ${status.watchedPaths} paths`);
      servicesInitialized = true;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Background services initialized',
        status: {
          fileMonitoring: status,
          servicesInitialized: true
        }
      });
    } else {
      throw new Error('File monitoring failed to start');
    }
    
  } catch (error: any) {
    console.error('❌ Failed to initialize background services:', error);
    return NextResponse.json(
      { error: 'Failed to initialize services', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const monitor = getFileMonitor();
    const status = monitor.getStatus();
    
    return NextResponse.json({ 
      success: true,
      status: {
        fileMonitoring: status,
        servicesInitialized,
        watchedPaths: monitor.getWatchedPaths()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error getting service status:', error);
    return NextResponse.json(
      { error: 'Failed to get service status', details: error.message },
      { status: 500 }
    );
  }
}