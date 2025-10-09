"use client"

import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  Square3Stack3DIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useRef } from 'react'

import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

type Listing = {
  id: string
  title: string
  description?: string | null
  address?: string | null
  city?: string | null
  subCity?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  areaSqm?: number | null
  basePrice: number
  currency?: string | null
  coverImage?: string | null
  has3D?: boolean
  amenities?: string | null
  features?: string | null
  propertyType?: string | null // Add property type field
  createdAt?: string
  updatedAt?: string
}

type Filters = {
  query: string
  minPrice: string
  maxPrice: string
  bedrooms: string[]
  bathrooms: string[]
  propertyType: string[]
  has3D: string
  city: string
}

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'area-low' | 'area-high' | 'bedrooms-low' | 'bedrooms-high'

// Property type options from the details page
const RESIDENTIAL_TYPES = [
  'Apartment',
  'Townhouse',
  'Villa Compound',
  'Land',
  'Building',
  'Villa',
  'Penthouse',
  'Hotel Apartment',
  'Floor',
] as const

const COMMERCIAL_TYPES = [
  'Office',
  'Shop',
  'Warehouse',
  'Labour Camp',
  'Bulk Unit',
  'Floor',
  'Building',
  'Factory',
  'Industrial Land',
  'Mixed Use Land',
  'Showroom',
  'Other Commercial',
] as const

const BED_OPTIONS = ['Studio', '1', '2', '3', '4', '5', '6', '7', '8+'] as const
const BATH_OPTIONS = ['1', '2', '3', '4', '5', '6+'] as const

export default function ListingsIndexPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState<Filters>({
    query: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: [],
    bathrooms: [],
    propertyType: [],
    has3D: '',
    city: ''
  })
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  const [isLoading, setIsLoading] = useState(false)
  const [showBedBathDropdown, setShowBedBathDropdown] = useState(false)
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false)
  const [propertyCategory, setPropertyCategory] = useState<'Residential' | 'Commercial'>('Residential')
  const bedBathRef = useRef<HTMLDivElement>(null)
  const propertyTypeRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setStatus('Loading listings…')
      try {
        const response = await fetch('/api/listings?published=true')
        const json = await response.json()
        if (!response.ok) {
          setStatus(json.error || 'Unable to load listings right now')
          return
        }
        setListings(json)
        setStatus('')
      } catch (error) {
        console.error('Failed to load listings', error)
        setStatus('Unable to load listings right now')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, sortBy])

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bedBathRef.current && !bedBathRef.current.contains(event.target as Node)) {
        setShowBedBathDropdown(false)
      }
      if (propertyTypeRef.current && !propertyTypeRef.current.contains(event.target as Node)) {
        setShowPropertyTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredAndSortedListings = useMemo(() => {
    const { query, minPrice, maxPrice, bedrooms, bathrooms, propertyType, has3D, city } = filters
    
    let filtered = listings.filter((listing) => {
      // Text search
      if (query.trim()) {
        const location = [listing.address, listing.city, listing.subCity].filter(Boolean).join(' ')
        const haystack = `${listing.title} ${listing.description || ''} ${location}`.toLowerCase()
        if (!haystack.includes(query.trim().toLowerCase())) return false
      }
      
      // Price range
      if (minPrice) {
        const min = Number(minPrice)
        if (listing.basePrice < min) return false
      }
      if (maxPrice) {
        const max = Number(maxPrice)
        if (listing.basePrice > max) return false
      }
      
      // Bedrooms - check if any selected bedroom count matches
      if (bedrooms.length > 0) {
        const listingBeds = listing.bedrooms ?? 0
        const bedMatch = bedrooms.some(bed => {
          if (bed === 'Studio') return listingBeds === 0
          if (bed === '8+') return listingBeds >= 8
          return listingBeds === Number(bed)
        })
        if (!bedMatch) return false
      }
      
      // Bathrooms - check if any selected bathroom count matches
      if (bathrooms.length > 0) {
        const listingBaths = listing.bathrooms ?? 0
        const bathMatch = bathrooms.some(bath => {
          if (bath === '6+') return listingBaths >= 6
          return listingBaths === Number(bath)
        })
        if (!bathMatch) return false
      }
      
      // Property type filter
      if (propertyType.length > 0) {
        const listingPropertyType = listing.propertyType
        if (!listingPropertyType) return false // Skip if no property type set
        
        // Check if listing's property type matches any selected types
        const matchesPropertyType = propertyType.some(selectedType => 
          listingPropertyType.toLowerCase() === selectedType.toLowerCase()
        )
        if (!matchesPropertyType) return false
      }
      
      // 3D availability
      if (has3D) {
        const wants3D = has3D === 'yes'
        if (wants3D && !listing.has3D) return false
        if (!wants3D && listing.has3D) return false
      }
      
      // City filter
      if (city) {
        if (listing.city?.toLowerCase() !== city.toLowerCase()) return false
      }
      
      return true
    })
    
    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || b.updatedAt || '').getTime() - new Date(a.createdAt || a.updatedAt || '').getTime()
        case 'oldest':
          return new Date(a.createdAt || a.updatedAt || '').getTime() - new Date(b.createdAt || b.updatedAt || '').getTime()
        case 'price-low':
          return a.basePrice - b.basePrice
        case 'price-high':
          return b.basePrice - a.basePrice
        case 'area-low':
          return (a.areaSqm || 0) - (b.areaSqm || 0)
        case 'area-high':
          return (b.areaSqm || 0) - (a.areaSqm || 0)
        case 'bedrooms-low':
          return (a.bedrooms || 0) - (b.bedrooms || 0)
        case 'bedrooms-high':
          return (b.bedrooms || 0) - (a.bedrooms || 0)
        default:
          return 0
      }
    })
    
    return filtered
  }, [listings, filters, sortBy])

  // Helper functions
  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleBedroomFilter = (bedroom: string) => {
    setFilters(prev => ({
      ...prev,
      bedrooms: prev.bedrooms.includes(bedroom)
        ? prev.bedrooms.filter(b => b !== bedroom)
        : [...prev.bedrooms, bedroom]
    }))
  }

  const toggleBathroomFilter = (bathroom: string) => {
    setFilters(prev => ({
      ...prev,
      bathrooms: prev.bathrooms.includes(bathroom)
        ? prev.bathrooms.filter(b => b !== bathroom)
        : [...prev.bathrooms, bathroom]
    }))
  }

  const togglePropertyTypeFilter = (propertyType: string) => {
    setFilters(prev => ({
      ...prev,
      propertyType: prev.propertyType.includes(propertyType)
        ? prev.propertyType.filter(p => p !== propertyType)
        : [...prev.propertyType, propertyType]
    }))
  }

  const clearPropertyTypeFilters = () => {
    setFilters(prev => ({
      ...prev,
      propertyType: []
    }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: [],
      bathrooms: [],
      propertyType: [],
      has3D: '',
      city: ''
    })
  }

  const toggleFavorite = (listingId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(listingId)) {
        newSet.delete(listingId)
      } else {
        newSet.add(listingId)
      }
      return newSet
    })
  }

  const getUniqueCities = () => {
    return Array.from(new Set(listings.map(l => l.city).filter(Boolean))).sort()
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0
      return value.trim() !== ''
    }).length
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedListings.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedListings = filteredAndSortedListings.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="container space-y-12">
      <header className="pt-4 text-primary">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted">Marketplace</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl text-primary">Premium listings ready for 3D exploration</h1>
            <p className="mt-3 max-w-2xl text-sm text-secondary">
              Explore immersive-ready inventory processed through EstatePro. Every listing includes a GLB model, IFC export, and customizable material library.
            </p>
          </div>
          {isAuthenticated && user?.role === 'AGENT' && (
            <Link href="/agent/upload" className="btn btn-primary whitespace-nowrap">
              Publish your listing
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </header>

      <div className="glass space-y-6 border border-[color:var(--surface-border)] p-6">
        {/* Search and Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-primary">Search the marketplace</h2>
            <p className="text-sm text-secondary">Find the perfect property with advanced filters and sorting.</p>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <MapPinIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9"
                placeholder="Search by address, city, or keyword"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-primary">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input pr-8 appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="area-low">Area: Small to Large</option>
                <option value="area-high">Area: Large to Small</option>
                <option value="bedrooms-low">Bedrooms: Few to Many</option>
                <option value="bedrooms-high">Bedrooms: Many to Few</option>
              </select>
              <AdjustmentsHorizontalIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">Advanced Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-muted hover:text-primary"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>
              
              {/* Property Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Property Type</label>
                <div className="relative" ref={propertyTypeRef}>
                  <button
                    onClick={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
                    className={`w-full input text-left flex items-center justify-between ${filters.propertyType.length > 0 ? 'text-[color:var(--accent-500)]' : 'text-gray-500'}`}
                  >
                    {filters.propertyType.length > 0 
                      ? `${filters.propertyType.length} selected`
                      : 'Select Property Type'
                    }
                    <svg className={`h-4 w-4 transition-transform ${showPropertyTypeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showPropertyTypeDropdown && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                      <div className="p-4">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mb-4">
                          <button
                            onClick={() => setPropertyCategory('Residential')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              propertyCategory === 'Residential'
                                ? 'text-[color:var(--accent-500)] border-[color:var(--accent-500)]'
                                : 'text-gray-600 border-transparent hover:text-gray-900'
                            }`}
                          >
                            Residential
                          </button>
                          <button
                            onClick={() => setPropertyCategory('Commercial')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                              propertyCategory === 'Commercial'
                                ? 'text-[color:var(--accent-500)] border-[color:var(--accent-500)]'
                                : 'text-gray-600 border-transparent hover:text-gray-900'
                            }`}
                          >
                            Commercial
                          </button>
                        </div>
                        
                        {/* Property Types Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {(propertyCategory === 'Residential' ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES).map((type) => (
                            <label
                              key={type}
                              className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                                filters.propertyType.includes(type)
                                  ? 'border-gray-400 bg-gray-200'
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={filters.propertyType.includes(type)}
                                onChange={() => togglePropertyTypeFilter(type)}
                                className="mr-3 w-4 h-4 rounded border-2 border-[color:var(--accent-500)] bg-white checked:bg-[color:var(--accent-500)] checked:border-[color:var(--accent-500)] focus:ring-[color:var(--accent-500)] focus:ring-2"
                                style={{ 
                                  accentColor: 'var(--accent-500)',
                                  colorScheme: 'light'
                                }}
                              />
                              <span className="text-sm text-gray-700">{type}</span>
                            </label>
                          ))}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t border-gray-200">
                          <button
                            onClick={() => {
                              clearPropertyTypeFilters()
                              setShowPropertyTypeDropdown(false)
                            }}
                            className="px-4 py-2 text-sm font-medium text-[color:var(--accent-500)] border border-[color:var(--accent-500)] rounded-lg hover:bg-[color:var(--accent-500)]/5"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => setShowPropertyTypeDropdown(false)}
                            className="px-4 py-2 text-sm font-medium text-white bg-[color:var(--accent-500)] rounded-lg hover:bg-[color:var(--accent-500)]/90"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Beds & Baths Combined */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Beds & Baths</label>
                <div className="relative" ref={bedBathRef}>
                  <button
                    onClick={() => setShowBedBathDropdown(!showBedBathDropdown)}
                    className={`w-full input text-left flex items-center justify-between ${(filters.bedrooms.length > 0 || filters.bathrooms.length > 0) ? 'text-[color:var(--accent-500)]' : 'text-gray-500'}`}
                  >
                    {(filters.bedrooms.length > 0 || filters.bathrooms.length > 0) 
                      ? `${filters.bedrooms.length + filters.bathrooms.length} selected`
                      : 'Select Beds & Baths'
                    }
                    <svg className={`h-4 w-4 transition-transform ${showBedBathDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showBedBathDropdown && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                      <div className="p-4">
                        {/* Beds Section */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Beds</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {BED_OPTIONS.map((bed) => (
                              <button
                                key={bed}
                                onClick={() => toggleBedroomFilter(bed)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                  filters.bedrooms.includes(bed)
                                    ? 'bg-gray-300 text-gray-900 border border-gray-400'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {bed}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Baths Section */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Baths</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {BATH_OPTIONS.map((bath) => (
                              <button
                                key={bath}
                                onClick={() => toggleBathroomFilter(bath)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                  filters.bathrooms.includes(bath)
                                    ? 'bg-gray-300 text-gray-900 border border-gray-400'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {bath}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t border-gray-200">
                          <button
                            onClick={() => {
                              clearBedBathFilters()
                              setShowBedBathDropdown(false)
                            }}
                            className="px-4 py-2 text-sm font-medium text-[color:var(--accent-500)] border border-[color:var(--accent-500)] rounded-lg hover:bg-[color:var(--accent-500)]/5"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => setShowBedBathDropdown(false)}
                            className="px-4 py-2 text-sm font-medium text-white bg-[color:var(--accent-500)] rounded-lg hover:bg-[color:var(--accent-500)]/90"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">City</label>
                <select
                  value={filters.city || ''}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  className="input"
                >
                  <option value="">All Cities</option>
                  {getUniqueCities().map(city => (
                    <option key={city} value={city || ''}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 3D Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-primary">3D Virtual Tour</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="has3D"
                    value=""
                    checked={filters.has3D === ''}
                    onChange={(e) => updateFilter('has3D', e.target.value)}
                    className="text-[color:var(--accent-500)]"
                  />
                  <span className="text-sm">Any</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="has3D"
                    value="yes"
                    checked={filters.has3D === 'yes'}
                    onChange={(e) => updateFilter('has3D', e.target.value)}
                    className="text-[color:var(--accent-500)]"
                  />
                  <span className="text-sm">3D Available</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="has3D"
                    value="no"
                    checked={filters.has3D === 'no'}
                    onChange={(e) => updateFilter('has3D', e.target.value)}
                    className="text-[color:var(--accent-500)]"
                  />
                  <span className="text-sm">Standard Only</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">
            {isLoading ? (
              <span>Loading...</span>
            ) : status ? (
              <span>{status}</span>
            ) : (
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedListings.length)} of {filteredAndSortedListings.length} properties
                {getActiveFiltersCount() > 0 && ' match your filters'}
              </span>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[color:var(--accent-500)] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[color:var(--accent-500)] text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="divider" />
        
        {/* Listings Grid/List */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-2xl mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginatedListings.map((listing, index) => {
              const imageSrc = listing.coverImage
                ? `/api/files/binary?path=${encodeURIComponent(listing.coverImage)}&listingId=${encodeURIComponent(listing.id)}`
                : null
              const isFavorite = favorites.has(listing.id)

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {/* Quick Actions */}
                  <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
                    {isAuthenticated && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(listing.id)
                        }}
                        className="rounded-full bg-white/90 p-2 shadow-sm hover:bg-white transition-colors"
                      >
                        {isFavorite ? (
                          <HeartSolidIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <HeartIcon className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigator.share?.({
                          title: listing.title,
                          text: listing.description || '',
                          url: window.location.origin + `/listings/${listing.id}`
                        })
                      }}
                      className="rounded-full bg-white/90 p-2 shadow-sm hover:bg-white transition-colors"
                    >
                      <ShareIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>

                  <Link href={`/listings/${listing.id}`} className="flex h-full flex-col">
                    {/* Image Section */}
                    <div className="relative h-64 overflow-hidden">
                      {imageSrc ? (
                        <Image
                          alt={listing.title}
                          src={imageSrc}
                          width={640}
                          height={420}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">No Image Available</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback for failed images */}
                      <div className="h-full w-full bg-gray-200 items-center justify-center hidden">
                        <div className="text-center text-gray-500">
                          <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">Image failed to load</p>
                        </div>
                      </div>
                      
                      {/* Status Tags */}
                      <div className="absolute left-4 top-4 flex flex-col gap-2">
                        {listing.has3D ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-600)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            <Square3Stack3DIcon className="h-3 w-3" />
                            Immersive Ready
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            <BuildingOffice2Icon className="h-3 w-3" />
                            Standard Listing
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6">
                      {/* Title and Location */}
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[color:var(--brand-600)] transition-colors mb-2">
                          {listing.title}
                        </h3>
                        <div className="space-y-1">
                          {listing.address && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPinIcon className="h-4 w-4" />
                              <span>{listing.address}</span>
                            </div>
                          )}
                          {(listing.subCity || listing.city) && (
                            <div className="text-sm text-gray-500">
                              {(() => {
                                const parts = []
                                if (listing.subCity) parts.push(listing.subCity)
                                if (listing.city && listing.city.toLowerCase() !== listing.subCity?.toLowerCase()) {
                                  parts.push(listing.city)
                                }
                                return parts.join(', ')
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="mb-4 space-y-3">
                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="h-5 w-5 text-[color:var(--brand-600)]" />
                          <span className="text-xl font-bold text-gray-900">
                            {formatPrice(listing.basePrice, listing.currency || 'ETB')}
                          </span>
                        </div>
                        
                        {/* Property Specs */}
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          {listing.bedrooms !== null && listing.bedrooms !== undefined && (
                            <div className="flex items-center gap-1">
                              <HomeIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.bedrooms}</span>
                            </div>
                          )}
                          {listing.bathrooms !== null && listing.bathrooms !== undefined && (
                            <div className="flex items-center gap-1">
                              <WrenchScrewdriverIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.bathrooms}</span>
                            </div>
                          )}
                          {listing.areaSqm && listing.areaSqm > 0 && (
                            <div className="flex items-center gap-1">
                              <Square3Stack3DIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.areaSqm}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {listing.description && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {listing.description}
                          </p>
                        </div>
                      )}

                      {/* Action Footer */}
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          View Details
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-[color:var(--brand-600)] transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {paginatedListings.map((listing, index) => {
              const imageSrc = listing.coverImage
                ? `/api/files/binary?path=${encodeURIComponent(listing.coverImage)}&listingId=${encodeURIComponent(listing.id)}`
                : null
              const isFavorite = favorites.has(listing.id)

              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="group overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link href={`/listings/${listing.id}`} className="flex min-h-48">
                    {/* Image Section */}
                    <div className="relative w-80 flex-shrink-0 overflow-hidden">
                      {imageSrc ? (
                        <Image
                          alt={listing.title}
                          src={imageSrc}
                          width={320}
                          height={192}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">No Image</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback for failed images */}
                      <div className="h-full w-full bg-gray-200 items-center justify-center hidden">
                        <div className="text-center text-gray-500">
                          <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">Image failed to load</p>
                        </div>
                      </div>
                      
                      {/* Status Tags */}
                      <div className="absolute left-4 top-4">
                        {listing.has3D ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-600)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            <Square3Stack3DIcon className="h-3 w-3" />
                            Immersive Ready
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                            <BuildingOffice2Icon className="h-3 w-3" />
                            Standard Listing
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6 flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[color:var(--brand-600)] transition-colors mb-2">
                            {listing.title}
                          </h3>
                          <div className="space-y-1">
                            {listing.address && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPinIcon className="h-4 w-4" />
                                <span>{listing.address}</span>
                              </div>
                            )}
                            {(listing.subCity || listing.city) && (
                              <div className="text-sm text-gray-500">
                                {(() => {
                                  const parts = []
                                  if (listing.subCity) parts.push(listing.subCity)
                                  if (listing.city && listing.city.toLowerCase() !== listing.subCity?.toLowerCase()) {
                                    parts.push(listing.city)
                                  }
                                  return parts.join(', ')
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {isAuthenticated && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(listing.id)
                              }}
                              className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
                            >
                              {isFavorite ? (
                                <HeartSolidIcon className="h-5 w-5 text-red-500" />
                              ) : (
                                <HeartIcon className="h-5 w-5 text-gray-600" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              navigator.share?.({
                                title: listing.title,
                                text: listing.description || '',
                                url: window.location.origin + `/listings/${listing.id}`
                              })
                            }}
                            className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
                          >
                            <ShareIcon className="h-5 w-5 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="h-5 w-5 text-[color:var(--brand-600)]" />
                          <span className="text-xl font-bold text-gray-900">
                            {formatPrice(listing.basePrice, listing.currency || 'ETB')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          {listing.bedrooms !== null && listing.bedrooms !== undefined && (
                            <div className="flex items-center gap-1">
                              <HomeIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.bedrooms}</span>
                            </div>
                          )}
                          {listing.bathrooms !== null && listing.bathrooms !== undefined && (
                            <div className="flex items-center gap-1">
                              <WrenchScrewdriverIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.bathrooms}</span>
                            </div>
                          )}
                          {listing.areaSqm && listing.areaSqm > 0 && (
                            <div className="flex items-center gap-1">
                              <Square3Stack3DIcon className="h-4 w-4" />
                              <span className="font-medium">{listing.areaSqm}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {listing.description && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {listing.description}
                          </p>
                        </div>
                      )}

                      {/* Action Footer */}
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          View Details
                        </div>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-[color:var(--brand-600)] transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredAndSortedListings.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 pt-8">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 rounded ${
                      currentPage === pageNum
                        ? 'bg-[color:var(--accent-500)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {filteredAndSortedListings.length === 0 && !status && !isLoading && (
          <div className="rounded-3xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-12 text-center text-secondary">
            {getActiveFiltersCount() > 0 ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-primary">No properties match your filters</div>
                <p className="text-sm">Try adjusting your search criteria or clearing some filters to see more results.</p>
                <button
                  onClick={clearFilters}
                  className="btn btn-outline"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-primary">No listings available</div>
                <p className="text-sm">Check back soon for new property listings.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
