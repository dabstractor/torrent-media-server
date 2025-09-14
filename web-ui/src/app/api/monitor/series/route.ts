import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/errors'
import SonarrClient from '@/lib/api/clients/SonarrClient'
import type { AddSeriesRequest } from '@/lib/types/media'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { tvdbId, title, year, rootFolderPath, qualityProfileId, languageProfileId } = body
    if (!title) {
      return createErrorResponse(
        'Missing required field: title',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Get configuration from environment or settings
    const sonarrApiKey = process.env.SONARR_API_KEY
    const sonarrBaseUrl = process.env.SONARR_BASE_URL || 'http://sonarr:8989'

    if (!sonarrApiKey) {
      return createErrorResponse(
        'Sonarr not configured. Please configure Sonarr API settings.',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    }

    const sonarr = new SonarrClient(sonarrApiKey, sonarrBaseUrl)

    // Determine tvdbId - either provided or looked up by title
    let finalTvdbId = tvdbId
    if (!finalTvdbId || finalTvdbId <= 0) {
      // Try to lookup series by title to get tvdbId
      const lookupResults = await sonarr.lookupSeriesByTitle(title)
      if (lookupResults.length > 0) {
        finalTvdbId = lookupResults[0].tvdbId
      } else {
        return createErrorResponse(
          `Could not find series "${title}" in Sonarr. Please verify the title or manually add it in Sonarr first.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Validate tvdbId is a valid number
    if (typeof finalTvdbId !== 'number' || finalTvdbId <= 0) {
      return createErrorResponse(
        'Invalid tvdbId: must be a positive number',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Check if series already exists
    const existingSeries = await sonarr.getSeriesByTvdbId(finalTvdbId)
    if (existingSeries) {
      return createErrorResponse(
        `Series "${title}" is already being monitored by Sonarr`,
        HTTP_STATUS.CONFLICT
      )
    }

    // Get default configuration if not provided
    let finalRootFolderPath = rootFolderPath
    let finalQualityProfileId = qualityProfileId
    let finalLanguageProfileId = languageProfileId

    if (!finalRootFolderPath || !finalQualityProfileId || !finalLanguageProfileId) {
      const [rootFolders, qualityProfiles, languageProfiles] = await Promise.all([
        sonarr.getRootFolders(),
        sonarr.getQualityProfiles(),
        sonarr.getLanguageProfiles()
      ])

      if (!finalRootFolderPath && rootFolders.length > 0) {
        finalRootFolderPath = rootFolders[0].path
      }

      if (!finalQualityProfileId && qualityProfiles.length > 0) {
        finalQualityProfileId = qualityProfiles[0].id
      }

      if (!finalLanguageProfileId && languageProfiles.length > 0) {
        finalLanguageProfileId = languageProfiles[0].id
      }
    }

    if (!finalRootFolderPath || !finalQualityProfileId || !finalLanguageProfileId) {
      return createErrorResponse(
        'Unable to determine root folder, quality profile, or language profile. Please configure Sonarr properly.',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Create the series request
    const seriesRequest: AddSeriesRequest = {
      tvdbId: finalTvdbId,
      title,
      rootFolderPath: finalRootFolderPath,
      qualityProfileId: finalQualityProfileId,
      languageProfileId: finalLanguageProfileId,
      monitored: true,
      seasonFolder: true,
      seriesType: 'standard',
      addOptions: {
        searchForMissingEpisodes: true,
        monitor: 'all'
      }
    }

    // Add the series to Sonarr
    const addedSeries = await sonarr.addSeries(seriesRequest)

    return createSuccessResponse({
      message: `Series "${title}" added to Sonarr monitoring`,
      series: addedSeries
    }, HTTP_STATUS.CREATED)

  } catch (error) {
    console.error('Error adding series to Sonarr:', error)

    if (error instanceof Error) {
      if (error.message.includes('400')) {
        return createErrorResponse(
          'Invalid request data. Please check the series information.',
          HTTP_STATUS.BAD_REQUEST
        )
      }

      if (error.message.includes('401') || error.message.includes('403')) {
        return createErrorResponse(
          'Sonarr authentication failed. Please check API key.',
          HTTP_STATUS.UNAUTHORIZED
        )
      }
    }

    return createErrorResponse(
      'Failed to add series to Sonarr monitoring',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

export async function GET() {
  try {
    // Get configuration from environment
    const sonarrApiKey = process.env.SONARR_API_KEY
    const sonarrBaseUrl = process.env.SONARR_BASE_URL || 'http://sonarr:8989'

    if (!sonarrApiKey) {
      return createSuccessResponse({
        configured: false,
        available: false,
        message: 'Sonarr API key not configured'
      }, HTTP_STATUS.OK)
    }

    const sonarr = new SonarrClient(sonarrApiKey, sonarrBaseUrl)

    // Test connection and get configuration
    try {
      const [status, rootFolders, qualityProfiles, languageProfiles] = await Promise.all([
        sonarr.getSystemStatus(),
        sonarr.getRootFolders(),
        sonarr.getQualityProfiles(),
        sonarr.getLanguageProfiles()
      ])

      return createSuccessResponse({
        configured: true,
        available: true,
        status,
        config: {
          rootFolders,
          qualityProfiles,
          languageProfiles
        }
      }, HTTP_STATUS.OK)

    } catch (connectionError) {
      return createSuccessResponse({
        configured: true,
        available: false,
        message: 'Unable to connect to Sonarr service'
      }, HTTP_STATUS.OK)
    }

  } catch (error) {
    console.error('Error checking Sonarr status:', error)

    return createErrorResponse(
      'Failed to check Sonarr status',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}