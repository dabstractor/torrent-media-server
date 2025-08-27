import React, { useState } from 'react'
import type { SearchRequest } from '@/lib/api/search'

interface SearchFormProps {
  onSearch: (params: SearchRequest) => void
  isLoading?: boolean
}

interface FormData {
  query: string
  categories: string[]
  minSeeders: number
  sortBy: 'seeders' | 'size' | 'date' | 'relevance'
  sortOrder: 'asc' | 'desc'
}

// Common torrent categories based on standard category IDs
const CATEGORIES = [
  { id: '4000', label: 'PC/Software' },
  { id: '2000', label: 'Movies' },
  { id: '5000', label: 'TV Shows' },
  { id: '3000', label: 'Music' },
  { id: '7000', label: 'Books' }
]

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading = false }) => {
  const [formData, setFormData] = useState<FormData>({
    query: '',
    categories: [],
    minSeeders: 0,
    sortBy: 'seeders',
    sortOrder: 'desc'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.query.trim()) {
      return
    }

    const searchParams: SearchRequest = {
      query: formData.query.trim(),
      categories: formData.categories.length > 0 ? formData.categories : undefined,
      minSeeders: formData.minSeeders > 0 ? formData.minSeeders : undefined,
      sortBy: formData.sortBy,
      sortOrder: formData.sortOrder,
      limit: 50,
      offset: 0
    }

    onSearch(searchParams)
  }

  const handleInputChange = (field: keyof FormData, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const categories = prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
      
      return { ...prev, categories }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Main search input */}
        <div className="flex-1">
          <input
            type="text"
            value={formData.query}
            onChange={(e) => handleInputChange('query', e.target.value)}
            placeholder="Search torrents..."
            className="input w-full min-h-[44px]"
            disabled={isLoading}
            autoFocus={true}
          />
        </div>
        
        {/* Search button */}
        <button
          type="submit"
          disabled={!formData.query.trim() || isLoading}
          className="btn btn-primary min-h-[44px] px-6 sm:px-8"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryToggle(category.id)}
              className={`btn min-h-[36px] px-3 py-1 text-sm ${
                formData.categories.includes(category.id)
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
              disabled={isLoading}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced filters */}
      <div className="flex flex-wrap gap-4 text-sm">
        {/* Minimum seeders */}
        <div className="flex items-center gap-2">
          <label htmlFor="minSeeders" className="text-gray-700">
            Min Seeders:
          </label>
          <input
            id="minSeeders"
            type="number"
            min="0"
            value={formData.minSeeders}
            onChange={(e) => handleInputChange('minSeeders', parseInt(e.target.value) || 0)}
            className="input w-20 min-h-[36px] text-center"
            disabled={isLoading}
          />
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-2">
          <label htmlFor="sortBy" className="text-gray-700">
            Sort by:
          </label>
          <select
            id="sortBy"
            value={formData.sortBy}
            onChange={(e) => handleInputChange('sortBy', e.target.value as FormData['sortBy'])}
            className="input min-h-[36px] pr-8"
            disabled={isLoading}
          >
            <option value="seeders">Seeders</option>
            <option value="size">Size</option>
            <option value="date">Date</option>
            <option value="relevance">Relevance</option>
          </select>
        </div>

        {/* Sort order */}
        <div className="flex items-center gap-2">
          <label htmlFor="sortOrder" className="text-gray-700">
            Order:
          </label>
          <select
            id="sortOrder"
            value={formData.sortOrder}
            onChange={(e) => handleInputChange('sortOrder', e.target.value as FormData['sortOrder'])}
            className="input min-h-[36px] pr-8"
            disabled={isLoading}
          >
            <option value="desc">High to Low</option>
            <option value="asc">Low to High</option>
          </select>
        </div>
      </div>
    </form>
  )
}

export default SearchForm