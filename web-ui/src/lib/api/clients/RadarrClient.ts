import type { RadarrMovie, AddMovieRequest, QualityProfile, RootFolder } from '@/lib/types/media'

class RadarrClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'http://radarr:7878') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}/api/v3/${path}`
    const headers = new Headers(options.headers)
    headers.set('X-Api-Key', this.apiKey)
    headers.set('Content-Type', 'application/json')

    const config: RequestInit = {
      ...options,
      headers,
    }

    return fetch(url, config)
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await this.request(path, { ...options, method: 'GET' })
    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async post<T>(path: string, data: any, options?: RequestInit): Promise<T> {
    const response = await this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async put<T>(path: string, data: any, options?: RequestInit): Promise<T> {
    const response = await this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async delete(path: string, options?: RequestInit): Promise<void> {
    const response = await this.request(path, { ...options, method: 'DELETE' })
    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`)
    }
  }

  // Health check
  async getSystemStatus(): Promise<{ version: string; instanceName: string }> {
    return this.get<{ version: string; instanceName: string }>('system/status')
  }

  // Movie operations
  async getMovies(): Promise<RadarrMovie[]> {
    return this.get<RadarrMovie[]>('movie')
  }

  async getMovieByTmdbId(tmdbId: number): Promise<RadarrMovie | null> {
    try {
      const movies = await this.get<RadarrMovie[]>(`movie?tmdbId=${tmdbId}`)
      return movies.length > 0 ? movies[0] : null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async addMovie(movieRequest: AddMovieRequest): Promise<RadarrMovie> {
    return this.post<RadarrMovie>('movie', movieRequest)
  }

  async updateMovie(movieId: number, movie: Partial<RadarrMovie>): Promise<RadarrMovie> {
    return this.put<RadarrMovie>(`movie/${movieId}`, movie)
  }

  async deleteMovie(movieId: number, deleteFiles: boolean = false, addImportExclusion: boolean = false): Promise<void> {
    const params = new URLSearchParams()
    if (deleteFiles) params.append('deleteFiles', 'true')
    if (addImportExclusion) params.append('addImportExclusion', 'true')

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.delete(`movie/${movieId}${query}`)
  }

  // Configuration operations
  async getQualityProfiles(): Promise<QualityProfile[]> {
    return this.get<QualityProfile[]>('qualityprofile')
  }

  async getRootFolders(): Promise<RootFolder[]> {
    return this.get<RootFolder[]>('rootfolder')
  }

  // Search operations
  async searchMovie(movieId: number): Promise<void> {
    await this.post(`command`, {
      name: 'MoviesSearch',
      movieIds: [movieId]
    })
  }

  // Import/Download operations
  async manualSearch(movieId: number): Promise<any[]> {
    return this.get<any[]>(`release?movieId=${movieId}`)
  }

  async downloadRelease(guid: string, indexerId: number): Promise<void> {
    await this.post('release', {
      guid,
      indexerId
    })
  }
}

export default RadarrClient