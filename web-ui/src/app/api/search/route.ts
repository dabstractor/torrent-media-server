import { NextRequest, NextResponse } from 'next/server'
import { searchTorrents } from '@/lib/api/search'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const params = {
      query: searchParams.get('query') || '',
      categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
      minSeeders: searchParams.get('minSeeders') ? parseInt(searchParams.get('minSeeders')!) : undefined,
      maxSize: searchParams.get('maxSize') ? parseInt(searchParams.get('maxSize')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'seeders' | 'size' | 'date' | 'relevance') || 'seeders',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    }

    if (!params.query || params.query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const result = await searchTorrents(params)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}