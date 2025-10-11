"use client"

import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  Square3Stack3DIcon,
  CurrencyDollarIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { formatPrice } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

type Listing = {
  id: string
  unitId: string
  title: string
  address?: string | null
  city?: string | null
  basePrice: number
  currency?: string | null
  coverImage?: string | null
  has3D?: boolean
  isPublished?: boolean
}

export default function MyListingsPage() {
  const { isAuthenticated, user } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    const load = async () => {
      setStatus('Loading your listings…')
      try {
        const r = await fetch('/api/listings/mine', { cache: 'no-store' })
        const data = await r.json()
        if (!r.ok) { setStatus(data?.error || 'Failed to load'); return }
        setListings(Array.isArray(data) ? data : [])
        setStatus('')
      } catch (e) {
        setStatus('Failed to load')
      }
    }
    if (isAuthenticated) void load()
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-[#f7f1e8] p-6 text-[#2f2013]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Listings</h1>
            <p className="text-sm text-[#7b6652]">Listings you created as {user?.name || 'agent'}.</p>
          </div>
          <Link href="/agent/units" className="btn btn-secondary">Open Units Dashboard</Link>
        </div>

        {status && (
          <div className="rounded-2xl border border-[#d9c6b5] bg-[#fefbf7] px-4 py-3 text-sm text-[#7b6652] shadow-[0_12px_30px_rgba(59,42,28,0.08)]">{status}</div>
        )}

        {!status && listings.length === 0 && (
          <div className="rounded-3xl border border-[#d9c6b5] bg-[#fefbf7] p-6 text-sm text-[#7b6652] shadow-[0_12px_30px_rgba(59,42,28,0.08)]">
            You don’t have any listings yet. Publish one from the Units dashboard.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing, index) => {
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
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {/* Status pill */}
                <div className="absolute left-4 top-4 z-10">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${listing.isPublished ? 'bg-green-600' : 'bg-yellow-600'}`}>
                    {listing.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>

                <Link href={`/listings/${listing.id}`} className="flex h-full flex-col">
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    {imageSrc ? (
                      <Image
                        alt={listing.title}
                        src={imageSrc}
                        width={640}
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
                    <div className="absolute right-4 top-4">
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

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5 text-sm text-primary">
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

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-gray-100 p-3 text-xs">
                  <Link href={`/agent/units/${encodeURIComponent(listing.unitId)}/publish`} className="btn btn-secondary text-xs">
                    Manage listing
                  </Link>
                  {listing.isPublished && (
                    <Link href={`/listings/${listing.id}`} className="btn btn-primary text-xs" target="_blank">Open public page</Link>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
