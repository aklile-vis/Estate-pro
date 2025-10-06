"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import {
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  CubeTransparentIcon,
  HomeModernIcon,
  MapPinIcon,
  PhotoIcon,
  PlayCircleIcon,
  TagIcon,
} from "@heroicons/react/24/outline"

const mockListing = {
  title: "Luxury Smart Condo",
  subtitle: "Premium 3-bedroom residence in the heart of Bole",
  status: "Draft",
  pricing: {
    basePrice: "950,000",
    currency: "ETB",
  },
  propertyType: "Residential / Condo",
  location: "123 Palm Avenue, Addis Ababa",
  specs: {
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 165,
  },
  description:
    "Thoughtfully designed condo featuring open-plan living, floor-to-ceiling windows, and fully integrated smart home controls.",
  amenities: ["Private balcony", "High-speed fiber", "Concierge", "Solar backup"],
  media: {
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616594039964-30b227d047a5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
    ],
    videos: [
      {
        url: "https://example.com/media/virtual-tour.mp4",
        label: "Virtual walk-through",
      },
    ],
  },
  immersive: {
    has3D: true,
    glbPath: "models/condo_a.glb",
    viewerLink: "/agent/editor/condo-a",
    processedAt: "2025-10-01 18:32",
  },
}

export default function AgentListingReviewPage() {
  const [draft, setDraft] = useState<typeof mockListing | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('agent:reviewDraft')
      if (!raw) return
      const parsed = JSON.parse(raw)
      // Basic shape guard and normalisation to match mockListing structure
      const normalized: typeof mockListing = {
        title: typeof parsed?.title === 'string' ? parsed.title : '',
        subtitle: typeof parsed?.subtitle === 'string' ? parsed.subtitle : '',
        status: 'Draft',
        pricing: {
          basePrice: typeof parsed?.pricing?.basePrice === 'string' ? parsed.pricing.basePrice : String(parsed?.pricing?.basePrice || ''),
          currency: typeof parsed?.pricing?.currency === 'string' ? parsed.pricing.currency : 'ETB',
        },
        propertyType: typeof parsed?.propertyType === 'string' ? parsed.propertyType : '',
        location: typeof parsed?.location === 'string' ? parsed.location : '',
        specs: {
          bedrooms: Number(parsed?.specs?.bedrooms || 0),
          bathrooms: Number(parsed?.specs?.bathrooms || 0),
          areaSqm: Number(parsed?.specs?.areaSqm || 0),
        },
        description: typeof parsed?.description === 'string' ? parsed.description : '',
        amenities: Array.isArray(parsed?.amenities) ? parsed.amenities : [],
        media: {
          images: Array.isArray(parsed?.media?.images) ? parsed.media.images.filter((url: string) => {
            // Filter out problematic URLs and log them for debugging
            if (url.includes('file_storage/processed/renders/') || url === 'placeholder.jpg') {
              console.warn('Filtering out problematic image URL:', url)
              return false
            }
            return true
          }) : [],
          videos: Array.isArray(parsed?.media?.videos) ? parsed.media.videos : [],
        },
        immersive: {
          has3D: Boolean(parsed?.immersive?.has3D),
          glbPath: parsed?.immersive?.glbPath || undefined,
          viewerLink: parsed?.immersive?.viewerLink || undefined,
          processedAt: parsed?.immersive?.processedAt || undefined,
        },
      }
      setDraft(normalized)
    } catch {
      // ignore parse/storage errors
    }
  }, [])

  const source = draft || mockListing
  const { title, subtitle, status, pricing, propertyType, location, specs, description, amenities, media, immersive } =
    source

  const router = useRouter()
  const { token } = useAuth()
  const [isPublishing, setIsPublishing] = useState(false)

  // Temporary function to clear session storage
  const clearSessionStorage = () => {
    sessionStorage.removeItem('agent:reviewDraft')
    window.location.reload()
  }

  const publishListing = async () => {
    if (!token) {
      console.error("Authentication token not found.")
      // Optionally, redirect to login or show an error message
      return
    }

    setIsPublishing(true)

    try {
      // Determine category and subtype from propertyType
      let category: "Residential" | "Commercial" = "Residential"
      let subtype: string = propertyType.split(' / ')[1] || propertyType.split(' / ')[0] || 'Other'

      if (propertyType.includes('Commercial')) {
        category = "Commercial"
        subtype = propertyType.split(' / ')[1] || 'Other Commercial'
      } else if (propertyType.includes('Residential')) {
        category = "Residential"
        subtype = propertyType.split(' / ')[1] || 'Other Residential'
      }

      const payload = {
        title: title,
        description: description,
        basePrice: parseFloat(pricing.basePrice.replace(/,/g, '')), // Changed from 'price' to 'basePrice'
        currency: pricing.currency,
        address: location.split(', ')[0],
        city: location.split(', ')[1],
        images: media.images,
        videos: media.videos.map(v => v.url),
        category: category,
        subtype: subtype,
        bedrooms: specs.bedrooms,
        bathrooms: specs.bathrooms,
        areaSqm: specs.areaSqm,
        isPublished: true, // Mark as published when submitted from here
        immersive: {
          has3D: immersive.has3D,
        },
        // unitId is intentionally omitted if not present in the draft
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish listing')
      }

      const result = await response.json()
      console.log('Listing published successfully:', result)
      
      // Clear the draft after successful publication
      sessionStorage.removeItem('agent:reviewDraft')
      
      // Redirect to listings page
      router.push('/listings')
    } catch (error: any) {
      console.error('Error publishing listing:', error.message)
      // Display error message to the user
      alert(`Error publishing listing: ${error.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-background)] text-primary">
      <div className="border-b border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
        <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] px-4 py-1.5 text-xs uppercase tracking-[0.35em] text-muted">
              <ClipboardDocumentListIcon className="h-4 w-4" /> Review & Publish
            </div>
            <div>
              <h1 className="headline text-3xl md:text-4xl">Final review before publishing</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Confirm the listing information pulled from your upload workflow. Everything below mirrors what buyers will
                see once you publish.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/agent/upload?restore=1" className="btn btn-secondary">
              Return to edit
            </Link>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={publishListing}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish listing'}
            </button>
            {/* Temporary button to clear session storage */}
            <button type="button" className="btn btn-outline" onClick={clearSessionStorage}>
              Clear Session Data
            </button>
          </div>
        </div>
      </div>

      <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {/* Overview */}
          <section className="surface-soft rounded-3xl border border-[color:var(--surface-border)] p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-muted">Listing snapshot</p>
                <div>
                  <h2 className="text-2xl font-semibold text-primary">{title}</h2>
                  <p className="text-sm text-secondary">{subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-3 py-1">
                    <TagIcon className="h-4 w-4" /> {propertyType}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-3 py-1">
                    <MapPinIcon className="h-4 w-4" /> {location}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Base price</p>
                <p className="text-3xl font-semibold text-primary">
                  {pricing.currency} {pricing.basePrice}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs uppercase tracking-wide text-muted">
                  <CheckBadgeIcon className="h-4 w-4" /> {status}
                </span>
              </div>
            </div>

            <div className="mt-8 grid gap-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 md:grid-cols-3">
              <DetailBlock icon={<HomeModernIcon className="h-6 w-6" />} label="Bedrooms" value={`${specs.bedrooms} bed`} />
              <DetailBlock icon={<HomeModernIcon className="h-6 w-6" />} label="Bathrooms" value={`${specs.bathrooms} bath`} />
              <DetailBlock icon={<HomeModernIcon className="h-6 w-6" />} label="Area" value={`${specs.areaSqm} sqm`} />
            </div>

            <article className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Listing description</h3>
              <p className="text-sm leading-relaxed text-secondary">{description}</p>
            </article>

            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Key amenities</h3>
              <ul className="flex flex-wrap gap-2">
                {amenities.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-1 text-sm text-secondary"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-500)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Media */}
          <section className="space-y-6">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Media gallery</p>
                <h3 className="text-lg font-semibold text-primary">Photos & video clips</h3>
                <p className="text-xs text-muted">These uploads will appear in the order shown below.</p>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.images.map((path) => {
                console.log('Image path:', path) // Debug log
                // Construct the proper URL for the image
                const imageUrl = path.startsWith('http') 
                  ? path 
                  : `/api/files/binary?path=${encodeURIComponent(path)}`
                console.log('Constructed URL:', imageUrl) // Debug log
                
                return (
                  <figure
                    key={path}
                    className="group relative overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Listing media" className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent px-3 py-2 text-xs text-white">
                      Photo asset
                    </figcaption>
                  </figure>
                )
              })}
            </div>

            {media.videos.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {media.videos.map((video) => (
                  <div
                    key={video.url}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
                        <PlayCircleIcon className="h-6 w-6 text-[color:var(--accent-500)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{video.label}</p>
                        <p className="text-xs text-muted">{video.url}</p>
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-disabled">Video</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Immersive Pipeline Status */}
          <section className="space-y-6">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Pipeline configuration</p>
                <h3 className="text-lg font-semibold text-primary">Immersive viewer</h3>
                <p className="text-xs text-muted">3D interactive experience settings.</p>
              </div>
            </header>

            <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`inline-flex h-3 w-3 rounded-full ${immersive.has3D ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {immersive.has3D ? '3D Pipeline Enabled' : 'Traditional Listing Only'}
                    </p>
                    <p className="text-xs text-muted">
                      {immersive.has3D 
                        ? 'This listing supports interactive 3D viewing' 
                        : 'This listing uses traditional gallery view only'
                      }
                    </p>
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                  immersive.has3D 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {immersive.has3D ? '3D Ready' : 'Gallery Only'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="surface-soft rounded-3xl border border-[color:var(--surface-border)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Publish readiness</h3>
            <dl className="mt-4 space-y-3 text-sm text-secondary">
              <div className="flex items-center justify-between">
                <dt>Details complete</dt>
                <dd className="font-medium text-[color:var(--success-500)]">Ready</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Media assets</dt>
                <dd>{media.images.length + media.videos.length} files</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Pricing</dt>
                <dd>
                  {pricing.currency} {pricing.basePrice}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface-soft space-y-4 rounded-3xl border border-[color:var(--surface-border)] p-6 shadow-sm">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-muted">Immersive assets</p>
              <h3 className="text-lg font-semibold text-primary">3D listing summary</h3>
              <p className="text-xs text-muted">
                {immersive.has3D
                  ? "This listing includes processed 3D assets from the editor workflow."
                  : "No 3D assets were attached to this listing."}
              </p>
            </header>

            {immersive.has3D ? (
              <div className="space-y-4 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
                    <CubeTransparentIcon className="h-6 w-6 text-[color:var(--accent-500)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Processed GLB</p>
                    <p className="text-xs text-muted">{immersive.glbPath}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Processed at</span>
                  <span>{immersive.processedAt}</span>
                </div>
                <Link href={immersive.viewerLink} className="btn btn-secondary w-full justify-center">
                  Open immersive editor
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 text-center text-sm text-muted">
                <PhotoIcon className="mx-auto h-10 w-10 text-[color:var(--accent-400)]" />
                <p className="mt-3">No 3D media has been generated for this listing.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

interface DetailBlockProps {
  icon: ReactNode
  label: string
  value: string
}

function DetailBlock({ icon, label, value }: DetailBlockProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center gap-3 text-muted">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-[color:var(--accent-500)]">
          {icon}
        </span>
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-semibold text-primary">{value}</p>
    </div>
  )
}
