import React, { useState } from 'react'

export interface SearchFilters {
  categories: string[]
  minSeeders: number
  maxSize: number
  sortBy: 'seeders' | 'size' | 'date' | 'relevance'
  sortOrder: 'asc' | 'desc'
}

interface SearchFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  isOpen?: boolean
  onToggle?: () => void
}

// Extended category list with proper IDs and descriptions
const CATEGORIES = [
  { id: '1000', label: 'Console', description: 'Gaming consoles' },
  { id: '2000', label: 'Movies', description: 'Films and cinema' },
  { id: '3000', label: 'Audio', description: 'Music and audio' },
  { id: '4000', label: 'PC Games', description: 'PC gaming' },
  { id: '5000', label: 'TV', description: 'Television shows' },
  { id: '6000', label: 'XXX', description: 'Adult content' },
  { id: '7000', label: 'Books', description: 'E-books and literature' },
  { id: '8000', label: 'Other', description: 'Miscellaneous' }
]

const SIZE_PRESETS = [
  { label: 'Any Size', value: 0 },
  { label: '< 1 GB', value: 1024 * 1024 * 1024 },
  { label: '< 5 GB', value: 5 * 1024 * 1024 * 1024 },
  { label: '< 10 GB', value: 10 * 1024 * 1024 * 1024 },
  { label: '< 50 GB', value: 50 * 1024 * 1024 * 1024 }
]

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const onToggle = controlledOnToggle || (() => setInternalIsOpen(!internalIsOpen))

  const handleFilterChange = (field: keyof SearchFilters, value: string[] | number | string) => {
    onChange({
      ...filters,
      [field]: value
    })
  }

  const handleCategoryToggle = (categoryId: string) => {
    const categories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId]

    handleFilterChange('categories', categories)
  }

  const handleClearCategories = () => {
    handleFilterChange('categories', [])
  }

  const handleResetFilters = () => {
    onChange({
      categories: [],
      minSeeders: 0,
      maxSize: 0,
      sortBy: 'seeders',
      sortOrder: 'desc'
    })
  }

  const activeFiltersCount = (
    filters.categories.length +
    (filters.minSeeders > 0 ? 1 : 0) +
    (filters.maxSize > 0 ? 1 : 0)
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Filter header with toggle button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors min-h-[56px]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3">
          <span className="font-medium text-gray-900">
            Advanced Filters
          </span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
              {activeFiltersCount} active
            </span>
          )}
        </div>

        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible filter content */}
      {isOpen && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Categories</h3>
              {filters.categories.length > 0 && (
                <button
                  onClick={handleClearCategories}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`btn min-h-[40px] px-3 py-2 text-sm ${filters.categories.includes(category.id)
                    ? 'btn-primary'
                    : 'btn-secondary'
                    }`}
                  title={category.description}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Minimum seeders */}
            <div>
              <label htmlFor="minSeeders" className="block text-sm font-medium text-gray-900 mb-2">
                Minimum Seeders
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="minSeeders"
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={filters.minSeeders}
                  onChange={(e) => handleFilterChange('minSeeders', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="min-w-[3rem] text-sm font-medium text-gray-700">
                  {filters.minSeeders}
                </span>
              </div>
            </div>

            {/* Maximum file size */}
            <div>
              <label htmlFor="maxSize" className="block text-sm font-medium text-gray-900 mb-2">
                Maximum Size
              </label>
              <select
                id="maxSize"
                value={filters.maxSize}
                onChange={(e) => handleFilterChange('maxSize', parseInt(e.target.value))}
                className="input w-full min-h-[40px]"
              >
                {SIZE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sorting options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Sort by */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-900 mb-2">
                Sort by
              </label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="input w-full min-h-[40px]"
              >
                <option value="seeders">Seeders</option>
                <option value="size">File Size</option>
                <option value="date">Date Added</option>
                <option value="relevance">Relevance</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-900 mb-2">
                Sort order
              </label>
              <select
                id="sortOrder"
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                className="input w-full min-h-[40px]"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
          </div>

          {/* Reset button */}
          {activeFiltersCount > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary min-h-[44px] px-6"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilters
