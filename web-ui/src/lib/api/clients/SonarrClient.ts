import type { SonarrSeries, AddSeriesRequest, QualityProfile, RootFolder } from '@/lib/types/media'

class SonarrClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'http://sonarr:8989') {
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
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText}`)
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
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText}`)
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
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async delete(path: string, options?: RequestInit): Promise<void> {
    const response = await this.request(path, { ...options, method: 'DELETE' })
    if (!response.ok) {
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText}`)
    }
  }

  // Health check
  async getSystemStatus(): Promise<{ version: string; instanceName: string }> {
    return this.get<{ version: string; instanceName: string }>('system/status')
  }

  // Series operations
  async getSeries(): Promise<SonarrSeries[]> {
    return this.get<SonarrSeries[]>('series')
  }

  async getSeriesByTvdbId(tvdbId: number): Promise<SonarrSeries | null> {
    try {
      const series = await this.get<SonarrSeries[]>(`series?tvdbId=${tvdbId}`)
      return series.length > 0 ? series[0] : null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async lookupSeriesByTitle(title: string): Promise<SonarrSeries[]> {
    try {
      return this.get<SonarrSeries[]>(`series/lookup?term=${encodeURIComponent(title)}`)
    } catch (error) {
      console.error('Error looking up series by title:', error)
      return []
    }
  }

  async addSeries(seriesRequest: AddSeriesRequest): Promise<SonarrSeries> {
    return this.post<SonarrSeries>('series', seriesRequest)
  }

  async updateSeries(seriesId: number, series: Partial<SonarrSeries>): Promise<SonarrSeries> {
    return this.put<SonarrSeries>(`series/${seriesId}`, series)
  }

  async deleteSeries(seriesId: number, deleteFiles: boolean = false, addImportExclusion: boolean = false): Promise<void> {
    const params = new URLSearchParams()
    if (deleteFiles) params.append('deleteFiles', 'true')
    if (addImportExclusion) params.append('addImportExclusion', 'true')

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.delete(`series/${seriesId}${query}`)
  }

  // Configuration operations
  async getQualityProfiles(): Promise<QualityProfile[]> {
    return this.get<QualityProfile[]>('qualityprofile')
  }

  async getLanguageProfiles(): Promise<Array<{ id: number; name: string }>> {
    return this.get<Array<{ id: number; name: string }>>('languageprofile')
  }

  async getRootFolders(): Promise<RootFolder[]> {
    return this.get<RootFolder[]>('rootfolder')
  }

  // Search operations
  async searchSeries(seriesId: number): Promise<void> {
    await this.post(`command`, {
      name: 'SeriesSearch',
      seriesId
    })
  }

  async searchSeason(seriesId: number, seasonNumber: number): Promise<void> {
    await this.post(`command`, {
      name: 'SeasonSearch',
      seriesId,
      seasonNumber
    })
  }

  async searchEpisode(episodeIds: number[]): Promise<void> {
    await this.post(`command`, {
      name: 'EpisodeSearch',
      episodeIds
    })
  }

  // Episodes operations
  async getEpisodes(seriesId: number): Promise<any[]> {
    return this.get<any[]>(`episode?seriesId=${seriesId}`)
  }

  async getEpisodesBySeasonNumber(seriesId: number, seasonNumber: number): Promise<any[]> {
    return this.get<any[]>(`episode?seriesId=${seriesId}&seasonNumber=${seasonNumber}`)
  }

  // Import/Download operations
  async manualSearch(episodeId: number): Promise<any[]> {
    return this.get<any[]>(`release?episodeId=${episodeId}`)
  }

  async downloadRelease(guid: string, indexerId: number): Promise<void> {
    await this.post('release', {
      guid,
      indexerId
    })
  }

  // Season operations
  async updateSeason(seriesId: number, seasonNumber: number, monitored: boolean): Promise<void> {
    const series = await this.get<SonarrSeries>(`series/${seriesId}`)
    const season = series.seasons.find(s => s.seasonNumber === seasonNumber)
    if (season) {
      season.monitored = monitored
      await this.put(`series/${seriesId}`, series)
    }
  }
}

export default SonarrClient