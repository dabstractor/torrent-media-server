import type { TMDBMovie, TMDBMovieDetails, MediaSearchResponse } from '@/lib/types/media'

class TMDBClient {
  private readonly apiKey: string
  private readonly baseUrl: string = 'https://api.themoviedb.org/3'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const urlObj = new URL(url)
    urlObj.searchParams.set('api_key', this.apiKey)

    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')

    const config: RequestInit = {
      ...options,
      headers,
    }

    const response = await fetch(urlObj.toString(), config)
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`)
    }
    return response.json()
  }

  async searchMovies(query: string, page: number = 1, year?: number): Promise<MediaSearchResponse<TMDBMovie>> {
    let endpoint = `/search/movie?query=${encodeURIComponent(query)}&page=${page}`
    if (year) {
      endpoint += `&year=${year}`
    }
    return this.request<MediaSearchResponse<TMDBMovie>>(endpoint)
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
    return this.request<TMDBMovieDetails>(`/movie/${movieId}?append_to_response=credits,images,videos`)
  }

  async getPopularMovies(page: number = 1): Promise<MediaSearchResponse<TMDBMovie>> {
    return this.request<MediaSearchResponse<TMDBMovie>>(`/movie/popular?page=${page}`)
  }

  async discoverMovies(filters: {
    sortBy?: string
    withGenres?: string
    primaryReleaseYear?: number
    page?: number
  } = {}): Promise<MediaSearchResponse<TMDBMovie>> {
    const params = new URLSearchParams()
    params.set('sort_by', filters.sortBy || 'popularity.desc')
    if (filters.withGenres) params.set('with_genres', filters.withGenres)
    if (filters.primaryReleaseYear) params.set('primary_release_year', filters.primaryReleaseYear.toString())
    params.set('page', (filters.page || 1).toString())

    return this.request<MediaSearchResponse<TMDBMovie>>(`/discover/movie?${params.toString()}`)
  }

  // Helper method to construct image URLs
  static getImageUrl(path: string | null, size: string = 'w500'): string {
    if (!path) return '/placeholder-poster.jpg'
    return `https://image.tmdb.org/t/p/${size}${path}`
  }

  // Helper method to get backdrop URL
  static getBackdropUrl(path: string | null, size: string = 'w1280'): string {
    if (!path) return '/placeholder-backdrop.jpg'
    return `https://image.tmdb.org/t/p/${size}${path}`
  }
}

export default TMDBClient