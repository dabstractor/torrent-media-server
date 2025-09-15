export interface ServiceConfig {
  id: string
  name: string
  description: string
  icon: string
  url: string
  healthEndpoint: string
  requiresAuth: boolean
  category: 'media' | 'download' | 'indexer' | 'proxy'
}

export interface ServiceHealth {
  available: boolean
  lastCheck: Date | null
  status?: number
  error?: string
  responseTime?: number
}

export interface ServiceCardProps {
  service: ServiceConfig
  health: ServiceHealth
  loading: boolean
}