"use client"

import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  MapPinIcon,
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
  currency?: string | null
}

export default function ListingsIndexPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
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
      }
    }
    load()
  }, [])

  const filteredListings = useMemo(() => {
    if (!query.trim()) return listings
    return listings.filter((listing) => {
      const location = [listing.address, listing.city].filter(Boolean).join(' ')
      const haystack = `${listing.title} ${location}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
  }, [listings, query])

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
          <Link href="/agent/upload" className="btn btn-primary whitespace-nowrap">
            Publish your listing
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="glass space-y-6 border border-[color:var(--surface-border)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-primary">Search the marketplace</h2>
            <p className="text-sm text-secondary">Filter by title or location to find listings that match your buyers.</p>
          </div>
          <div className="relative w-full md:w-72">
            <MapPinIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search by address, city, or keyword"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {status && <div className="text-sm text-muted">{status}</div>}
        <div className="divider" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing, index) => {
            console.log('Listing:', { id: listing.id, title: listing.title, coverImage: listing.coverImage })
            const imageSrc = listing.coverImage
              ? `/api/files/binary?path=${encodeURIComponent(listing.coverImage)}&listingId=${encodeURIComponent(listing.id)}`
              : '/placeholder.jpg'
            
            console.log('Image source for listing', listing.id, ':', imageSrc)

            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group overflow-hidden rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-soft)]"
              >
                <Link href={`/listings/${listing.id}`} className="flex h-full flex-col">
                  <div className="relative">
                    <Image
                      alt={listing.title}
                      src={imageSrc}
                      width={640}
                      height={420}
                      className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-6 top-6 inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-600)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <BuildingOffice2Icon className="h-4 w-4" />
                      Immersive ready
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-8 text-primary">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-brand text-primary">{listing.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-secondary">
                        <MapPinIcon className="h-4 w-4" />
                        {[listing.address, listing.city].filter(Boolean).join(', ') || 'Location to be announced'}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tracking-wide text-brand-strong">
                      {formatPrice(listing.basePrice, 'ETB')}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-sm text-muted">
                      <span>Launch experience</span>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {filteredListings.length === 0 && !status && (
          <div className="rounded-3xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-12 text-center text-secondary">
            No listings match your search just yet. Adjust your filters or check back soon.
          </div>
        )}
      </div>
    </div>
  )
}
