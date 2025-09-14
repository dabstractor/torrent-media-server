import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/errors'
import RadarrClient from '@/lib/api/clients/RadarrClient'
import type { AddMovieRequest } from '@/lib/types/media'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { tmdbId, title, year, rootFolderPath, qualityProfileId } = body
    if (!tmdbId || !title || !year) {
      return createErrorResponse(
        'Missing required fields: tmdbId, title, year',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Validate tmdbId is a valid number
    if (typeof tmdbId !== 'number' || tmdbId <= 0) {
      return createErrorResponse(
        'Invalid tmdbId: must be a positive number',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Get configuration from environment or settings
    const radarrApiKey = process.env.RADARR_API_KEY
    const radarrBaseUrl = process.env.RADARR_BASE_URL || 'http://radarr:7878'

    if (!radarrApiKey) {
      return createErrorResponse(
        'Radarr not configured. Please configure Radarr API settings.',
        HTTP_STATUS.SERVICE_UNAVAILABLE
      )
    }

    const radarr = new RadarrClient(radarrApiKey, radarrBaseUrl)

    // Check if movie already exists
    const existingMovie = await radarr.getMovieByTmdbId(tmdbId)
    if (existingMovie) {
      return createErrorResponse(
        `Movie "${title}" (${year}) is already being monitored by Radarr`,
        HTTP_STATUS.CONFLICT
      )
    }

    // Get default configuration if not provided
    let finalRootFolderPath = rootFolderPath
    let finalQualityProfileId = qualityProfileId

    if (!finalRootFolderPath || !finalQualityProfileId) {
      const [rootFolders, qualityProfiles] = await Promise.all([
        radarr.getRootFolders(),
        radarr.getQualityProfiles()
      ])

      if (!finalRootFolderPath && rootFolders.length > 0) {
        finalRootFolderPath = rootFolders[0].path
      }

      if (!finalQualityProfileId && qualityProfiles.length > 0) {
        finalQualityProfileId = qualityProfiles[0].id
      }
    }

    if (!finalRootFolderPath || !finalQualityProfileId) {
      return createErrorResponse(
        'Unable to determine root folder or quality profile. Please configure Radarr properly.',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Create the movie request
    const movieRequest: AddMovieRequest = {
      tmdbId,
      rootFolderPath: finalRootFolderPath,
      qualityProfileId: finalQualityProfileId,
      monitored: true,
      minimumAvailability: 'released',
      addOptions: {
        searchForMovie: true,
        monitor: 'movieOnly'
      }
    }

    // Add the movie to Radarr
    const addedMovie = await radarr.addMovie(movieRequest)

    return createSuccessResponse({
      message: `Movie "${title}" (${year}) added to Radarr monitoring`,
      movie: addedMovie
    }, HTTP_STATUS.CREATED)

  } catch (error) {
    console.error('Error adding movie to Radarr:', error)

    if (error instanceof Error) {
      if (error.message.includes('400')) {
        return createErrorResponse(
          'Invalid request data. Please check the movie information.',
          HTTP_STATUS.BAD_REQUEST
        )
      }

      if (error.message.includes('401') || error.message.includes('403')) {
        return createErrorResponse(
          'Radarr authentication failed. Please check API key.',
          HTTP_STATUS.UNAUTHORIZED
        )
      }
    }

    return createErrorResponse(
      'Failed to add movie to Radarr monitoring',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

export async function GET() {
  try {
    // Get configuration from environment
    const radarrApiKey = process.env.RADARR_API_KEY
    const radarrBaseUrl = process.env.RADARR_BASE_URL || 'http://radarr:7878'

    if (!radarrApiKey) {
      return createSuccessResponse({
        configured: false,
        available: false,
        message: 'Radarr API key not configured'
      }, HTTP_STATUS.OK)
    }

    const radarr = new RadarrClient(radarrApiKey, radarrBaseUrl)

    // Test connection and get configuration
    try {
      const [status, rootFolders, qualityProfiles] = await Promise.all([
        radarr.getSystemStatus(),
        radarr.getRootFolders(),
        radarr.getQualityProfiles()
      ])

      return createSuccessResponse({
        configured: true,
        available: true,
        status,
        config: {
          rootFolders,
          qualityProfiles
        }
      }, HTTP_STATUS.OK)

    } catch (connectionError) {
      return createSuccessResponse({
        configured: true,
        available: false,
        message: 'Unable to connect to Radarr service'
      }, HTTP_STATUS.OK)
    }

  } catch (error) {
    console.error('Error checking Radarr status:', error)

    return createErrorResponse(
      'Failed to check Radarr status',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}