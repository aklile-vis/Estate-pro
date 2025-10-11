"use client"

import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  Square3Stack3DIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

type Listing = {
  id: string
  title: string
  address?: string | null
  city?: string | null
  basePrice: number
  currency?: string | null
  coverImage?: string | null
  has3D?: boolean
}

export default function SavedListingsPage() {
  const { isAuthenticated } = useAuth()
  const [list, setList] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const listingIds = useMemo(() => new Set(list.map(l => l.id)), [list])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const r = await fetch('/api/saved', { cache: 'no-store' })
        if (!r.ok) {
          setError('Failed to load saved listings')
          return
        }
        const rows = await r.json()
        setList(Array.isArray(rows) ? rows : [])
      } catch (e) {
        setError('Failed to load saved listings')
      } finally {
        setLoading(false)
      }
    }
    if (isAuthenticated) void load()
  }, [isAuthenticated])

  const toggleSave = async (listingId: string) => {
    const isSaved = listingIds.has(listingId)
    // Optimistic update
    setList(prev => isSaved ? prev.filter(l => l.id !== listingId) : prev)
    try {
      if (isSaved) {
        await fetch(`/api/saved/${listingId}`, { method: 'DELETE' })
      } else {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId })
        })
      }
    } catch {
      // Revert: on failure, do nothing special for now
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-8 text-center">
          <h1 className="text-xl font-semibold text-primary mb-2">Saved Listings</h1>
          <p className="text-sm text-secondary">Please sign in to view your saved listings.</p>
          <div className="mt-4">
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-primary">Saved Listings</h1>
          <p className="text-[12px] text-muted">Quick access to properties you liked.</p>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-secondary">Loading…</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && list.length === 0 && !error && (
        <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-8 text-center text-sm text-secondary">
          You haven’t saved any listings yet.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.map((listing, index) => {
          const imageSrc = listing.coverImage
            ? `/api/files/binary?path=${encodeURIComponent(listing.coverImage)}&listingId=${encodeURIComponent(listing.id)}`
            : null
          const location = [listing.address, listing.city].filter(Boolean).join(', ')
          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-sm hover:shadow-md"
            >
              {/* Quick save toggle */}
              <div className="absolute right-4 top-4 z-10">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(listing.id) }}
                  className="rounded-full bg-white/90 p-2 shadow-sm hover:bg-white"
                >
                  <HeartSolidIcon className="h-5 w-5 text-red-500" />
                </button>
              </div>

              <Link href={`/listings/${listing.id}`} className="flex h-full flex-col">
                <div className="relative h-56 overflow-hidden">
                  {imageSrc ? (
                    <Image
                      alt={listing.title}
                      src={imageSrc}
                      width={600}
                      height={360}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <PhotoIcon className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-xs">No Image</p>
                      </div>
                    </div>
                  )}
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
                <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4 text-sm text-primary">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-primary group-hover:text-secondary">{listing.title}</h3>
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <MapPinIcon className="h-4 w-4" />
                      {location || 'Location to be announced'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-[color:var(--brand-600)]" />
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(listing.basePrice, listing.currency || 'ETB')}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-500">View Details</div>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-[color:var(--brand-600)] transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

