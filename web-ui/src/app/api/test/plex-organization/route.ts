import { NextRequest, NextResponse } from 'next/server'
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager'
import { settingsService } from '@/lib/services/SettingsService'

/**
 * Simplified Plex connectivity test endpoint
 * Note: File organization is now handled by Radarr/Sonarr automatically
 * This endpoint only tests Plex server connectivity and basic functionality
 */

export async function POST(request: NextRequest) {
  try {
    console.log(`🧪 TEST: Testing Plex connectivity (organization handled by Radarr/Sonarr)`)

    // Get settings and test Plex connectivity
    const settings = await settingsService.getSettings()

    if (!settings.plex.token) {
      return NextResponse.json({
        success: false,
        error: 'Plex token not configured'
      }, { status: 400 })
    }

    // Initialize and test Plex connection
    const initSuccess = await plexIntegrationManager.initialize(settings.plex.token)

    if (!initSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Plex integration'
      }, { status: 500 })
    }

    // Test Plex server status
    const statusOk = await plexIntegrationManager.checkStatus()

    return NextResponse.json({
      success: true,
      data: {
        plexConnectivity: statusOk,
        note: 'File organization is handled by Radarr/Sonarr - this test only verifies Plex connectivity',
        message: statusOk
          ? 'Plex server is accessible and ready for library refreshes'
          : 'Plex server connectivity issues detected'
      }
    })

  } catch (error) {
    console.error('Plex connectivity test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Connectivity test failed: ' + (error as Error).message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        endpoint: '/api/test/plex-organization',
        purpose: 'Test Plex server connectivity',
        method: 'POST',
        note: 'File organization is automatically handled by Radarr and Sonarr',
        automation: {
          movies: 'Radarr manages movie downloads and organization',
          tv: 'Sonarr manages TV show downloads and organization',
          plex: 'PlexIntegrationManager handles library refresh only'
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get endpoint info: ' + (error as Error).message
    }, { status: 500 })
  }
}