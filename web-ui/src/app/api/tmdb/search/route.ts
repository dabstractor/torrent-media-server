import TMDBClient from '@/lib/api/clients/TMDBClient'

const TMDB_API_KEY = process.env.TMDB_API_KEY

export async function GET(request: Request) {
  try {
    // Validate API key is configured
    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY environment variable is not set')
      return Response.json(
        { error: 'TMDB API key not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const page = parseInt(searchParams.get('page') || '1')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year') as string) : undefined

    if (!query) {
      return Response.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    if (query.length < 2) {
      return Response.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const tmdbClient = new TMDBClient(TMDB_API_KEY)
    const results = await tmdbClient.searchMovies(query, page, year)

    return Response.json(results, {
      headers: {
        'Content-Type': 'application/json',
        // Enable caching for search results (1 hour)
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('TMDB search error:', error)
    return Response.json(
      {
        error: 'Service unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}