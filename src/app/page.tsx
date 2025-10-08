'use client'

import {
  AdjustmentsHorizontalIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { formatPrice } from '@/lib/utils'

type Listing = {
  id: string
  title: string
  address?: string | null
  city?: string | null
  basePrice: number
  coverImage?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  sqft?: number | null
}

type Filters = {
  query: string
  minPrice: string
  maxPrice: string
  bedrooms: string
  bathrooms: string
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState<Filters>({ query: '', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '' })

  useEffect(() => {
    const load = async () => {
      setStatus('Loading listings…')
      try {
        const response = await fetch('/api/listings?published=true', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) {
          setStatus(data?.error || 'Unable to load listings right now')
          return
        }
        setListings(Array.isArray(data) ? data : [])
        setStatus('')
      } catch (err) {
        console.error('Failed to load listings', err)
        setStatus('Unable to load listings right now')
      }
    }

    void load()
  }, [])

  const filteredListings = useMemo(() => {
    const { query, minPrice, maxPrice, bedrooms, bathrooms } = filters
    const min = minPrice ? Number(minPrice) : undefined
    const max = maxPrice ? Number(maxPrice) : undefined
    const minBeds = bedrooms ? Number(bedrooms) : undefined
    const minBaths = bathrooms ? Number(bathrooms) : undefined

    return listings.filter((listing) => {
      const location = [listing.address, listing.city].filter(Boolean).join(' ')
      const haystack = `${listing.title} ${location}`.toLowerCase()
      const matchesQuery = query ? haystack.includes(query.trim().toLowerCase()) : true
      const matchesMin = typeof min === 'number' ? listing.basePrice >= min : true
      const matchesMax = typeof max === 'number' ? listing.basePrice <= max : true
      const matchesBeds = typeof minBeds === 'number' ? (listing.bedrooms ?? 0) >= minBeds : true
      const matchesBaths = typeof minBaths === 'number' ? (listing.bathrooms ?? 0) >= minBaths : true
      return matchesQuery && matchesMin && matchesMax && matchesBeds && matchesBaths
    })
  }, [filters, listings])

  const handleFilterChange = (key: keyof Filters) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }))
  }

  return (
    <div className="space-y-16 pb-20">
      <section className="container grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-muted">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Immersive listings
          </span>
          <div className="space-y-4">
            <h1 className="text-[32px] font-semibold leading-snug text-primary md:text-[38px]">
              Discover premium residences with ready-to-share virtual walkthroughs
            </h1>
            <p className="max-w-xl text-sm text-muted">
              EstatePro transforms architectural drawings and 3D models into polished buyer experiences. Search the public marketplace, or sign in as an agent to publish your own portfolio.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-secondary">
            <span className="rounded-full border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-0)] px-3 py-1">GLB · IFC · USDZ exports</span>
            <span className="rounded-full border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-0)] px-3 py-1">Configurable finishes with live pricing</span>
            <span className="rounded-full border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-0)] px-3 py-1">Shareable buyer presentations</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/listings" className="btn btn-primary px-5 py-2 text-xs">
              Browse all listings
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/agent/upload" className="btn btn-secondary px-5 py-2 text-xs">
              Upload drawings or 3D model
            </Link>
          </div>
          <p className="text-[11px] text-muted">
            Supported formats include IFC, GLB, USDZ, RVT, DXF/DWG, and structured point clouds. Upload once—EstatePro optimizes everything for web, mobile, and VR.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl"
        >
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-primary">Search the marketplace</h2>
              <p className="mt-1 text-[11px] text-muted">Filter by budget, bedrooms, and keywords to find the right residence.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Keyword</label>
                <input
                  className="input text-sm"
                  placeholder="City, address, or listing title"
                  value={filters.query}
                  onChange={handleFilterChange('query')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Min price</label>
                  <input
                    className="input text-sm"
                    inputMode="numeric"
                    placeholder="$"
                    value={filters.minPrice}
                    onChange={handleFilterChange('minPrice')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Max price</label>
                  <input
                    className="input text-sm"
                    inputMode="numeric"
                    placeholder="$"
                    value={filters.maxPrice}
                    onChange={handleFilterChange('maxPrice')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Bedrooms</label>
                  <input
                    className="input text-sm"
                    inputMode="numeric"
                    placeholder="Any"
                    value={filters.bedrooms}
                    onChange={handleFilterChange('bedrooms')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Bathrooms</label>
                  <input
                    className="input text-sm"
                    inputMode="numeric"
                    placeholder="Any"
                    value={filters.bathrooms}
                    onChange={handleFilterChange('bathrooms')}
                  />
                </div>
              </div>
            </div>
            <p className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-3 text-[11px] text-muted">
              Viewing {filteredListings.length.toLocaleString()} of {listings.length.toLocaleString()} published residences.
            </p>
          </div>
        </motion.div>
      </section>

      <section className="container space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary">Featured residences</h2>
            <p className="text-[12px] text-muted">
              Every listing includes interactive walkthroughs, configurable finishes, and export-ready construction packages.
            </p>
          </div>
          <Link href="/listings" className="btn btn-outline px-5 py-2 text-xs">
            Explore full marketplace
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {status && <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4 text-[12px] text-secondary">{status}</div>}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.slice(0, 9).map((listing, index) => {
            const imageSrc = listing.coverImage
              ? `/api/files/binary?path=${encodeURIComponent(listing.coverImage)}&listingId=${encodeURIComponent(listing.id)}`
              : null
            const location = [listing.address, listing.city].filter(Boolean).join(', ')

            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft-raised)]"
              >
                <Link href={`/listings/${listing.id}`} className="group flex h-full flex-col">
                  <div className="relative">
                    {imageSrc ? (
                      <Image
                        alt={listing.title}
                        src={imageSrc}
                        width={600}
                        height={420}
                        className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <PhotoIcon className="h-8 w-8 mx-auto mb-1" />
                          <p className="text-xs">No Image</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-overlay bg-[color:var(--overlay-900)] px-3 py-1 text-[11px] font-semibold text-overlay shadow-sm">
                      <BuildingOffice2Icon className="h-4 w-4" />
                      Immersive ready
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5 text-sm text-primary">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-primary transition-colors group-hover:text-secondary">{listing.title}</h3>
                      <div className="flex items-center gap-2 text-[12px] text-muted">
                        <MapPinIcon className="h-4 w-4" />
                        {location || 'Location to be announced'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[11px] text-muted">
                      <span>{listing.bedrooms ?? 0} bd</span>
                      <span>{listing.bathrooms ?? 0} ba</span>
                      <span>{listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : 'Size forthcoming'}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-sm font-semibold text-primary">
                    <span>{formatPrice(listing.basePrice, 'ETB')}</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {filteredListings.length === 0 && !status && (
          <div className="rounded-3xl border border-dashed border-[color:var(--surface-border-strong)] bg-[color:var(--surface-1)] p-12 text-center text-[12px] text-muted">
            No listings match your criteria yet. Adjust your filters or check back soon.
          </div>
        )}
      </section>
    </div>
  )
}
