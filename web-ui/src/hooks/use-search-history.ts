import { useState, useCallback, useEffect } from 'react'
import type { SearchRequest } from '@/lib/api/search'

export interface SearchHistoryItem {
  id: string
  query: string
  filters: {
    categories: string[]
    minSeeders: number
    maxSize: number
    sortBy: 'seeders' | 'size' | 'date' | 'relevance'
    sortOrder: 'asc' | 'desc'
  }
  timestamp: string
  resultCount: number
}

const STORAGE_KEY = 'search-history-v1'
const MAX_HISTORY_ITEMS = 50

// Utility functions for localStorage operations
const getStoredHistory = (): SearchHistoryItem[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error reading search history from localStorage:', error)
    return []
  }
}

const setStoredHistory = (history: SearchHistoryItem[]): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Error saving search history to localStorage:', error)
  }
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const createHistoryItem = (
  searchParams: SearchRequest, 
  resultCount: number = 0
): SearchHistoryItem => {
  return {
    id: generateId(),
    query: searchParams.query,
    filters: {
      categories: searchParams.categories || [],
      minSeeders: searchParams.minSeeders || 0,
      maxSize: searchParams.maxSize || 0,
      sortBy: searchParams.sortBy || 'seeders',
      sortOrder: searchParams.sortOrder || 'desc'
    },
    timestamp: new Date().toISOString(),
    resultCount
  }
}

interface UseSearchHistoryReturn {
  history: SearchHistoryItem[]
  addToHistory: (searchParams: SearchRequest, resultCount?: number) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
  getRecentSearches: (limit?: number) => SearchHistoryItem[]
  getPopularSearches: (limit?: number) => SearchHistoryItem[]
  searchExists: (searchParams: SearchRequest) => SearchHistoryItem | null
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  // Load history on mount
  useEffect(() => {
    setHistory(getStoredHistory())
  }, [])

  const addToHistory = useCallback((searchParams: SearchRequest, resultCount = 0) => {
    if (!searchParams.query || searchParams.query.length < 2) return

    setHistory(prevHistory => {
      // Check if this exact search already exists
      const existingIndex = prevHistory.findIndex(item => 
        item.query.toLowerCase() === searchParams.query.toLowerCase() &&
        JSON.stringify(item.filters.categories.sort()) === JSON.stringify((searchParams.categories || []).sort()) &&
        item.filters.minSeeders === (searchParams.minSeeders || 0) &&
        item.filters.maxSize === (searchParams.maxSize || 0) &&
        item.filters.sortBy === (searchParams.sortBy || 'seeders') &&
        item.filters.sortOrder === (searchParams.sortOrder || 'desc')
      )

      let newHistory: SearchHistoryItem[]

      if (existingIndex !== -1) {
        // Update existing item with new timestamp and result count
        const existingItem = prevHistory[existingIndex]
        const updatedItem: SearchHistoryItem = {
          ...existingItem,
          timestamp: new Date().toISOString(),
          resultCount: resultCount > 0 ? resultCount : existingItem.resultCount
        }
        
        // Move to front
        newHistory = [updatedItem, ...prevHistory.filter((_, index) => index !== existingIndex)]
      } else {
        // Add new item to front
        const newItem = createHistoryItem(searchParams, resultCount)
        newHistory = [newItem, ...prevHistory]
      }

      // Limit history size
      if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS)
      }

      // Save to localStorage
      setStoredHistory(newHistory)
      return newHistory
    })
  }, [])

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.id !== id)
      setStoredHistory(newHistory)
      return newHistory
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setStoredHistory([])
  }, [])

  const getRecentSearches = useCallback((limit = 10): SearchHistoryItem[] => {
    return history
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }, [history])

  const getPopularSearches = useCallback((limit = 10): SearchHistoryItem[] => {
    // Group by query and sum result counts, keeping the most recent timestamp
    const queryGroups = history.reduce((acc, item) => {
      const query = item.query.toLowerCase()
      if (!acc[query]) {
        acc[query] = {
          ...item,
          totalResults: item.resultCount,
          searches: 1
        }
      } else {
        acc[query].totalResults += item.resultCount
        acc[query].searches += 1
        // Keep most recent timestamp
        if (new Date(item.timestamp) > new Date(acc[query].timestamp)) {
          acc[query].timestamp = item.timestamp
        }
      }
      return acc
    }, {} as Record<string, SearchHistoryItem & { totalResults: number, searches: number }>)

    return Object.values(queryGroups)
      .sort((a, b) => {
        // Sort by number of searches first, then by total results
        if (a.searches !== b.searches) {
          return b.searches - a.searches
        }
        return b.totalResults - a.totalResults
      })
      .slice(0, limit)
  }, [history])

  const searchExists = useCallback((searchParams: SearchRequest): SearchHistoryItem | null => {
    const found = history.find(item =>
      item.query.toLowerCase() === searchParams.query.toLowerCase() &&
      JSON.stringify(item.filters.categories.sort()) === JSON.stringify((searchParams.categories || []).sort()) &&
      item.filters.minSeeders === (searchParams.minSeeders || 0) &&
      item.filters.maxSize === (searchParams.maxSize || 0) &&
      item.filters.sortBy === (searchParams.sortBy || 'seeders') &&
      item.filters.sortOrder === (searchParams.sortOrder || 'desc')
    )
    
    return found || null
  }, [history])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentSearches,
    getPopularSearches,
    searchExists
  }
}

// Hook for search suggestions based on history
export function useSearchSuggestions() {
  const { history } = useSearchHistory()

  const getSuggestions = useCallback((query: string, limit = 5): string[] => {
    if (!query || query.length < 2) return []

    const suggestions = history
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .map(item => item.query)
      .reduce((unique, query) => {
        if (!unique.includes(query)) {
          unique.push(query)
        }
        return unique
      }, [] as string[])
      .slice(0, limit)

    return suggestions
  }, [history])

  return { getSuggestions }
}