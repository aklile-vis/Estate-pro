"use client"
import React, { useState, useMemo, useEffect } from "react"

// ---------------------------
// TraditionalViewer — UI-only version adapted to your Review Page data shape
// ---------------------------

export type ListingReviewShape = {
  title: string
  subtitle: string
  status: string
  pricing: { basePrice: string; currency: string }
  propertyType: string
  location: string
  specs: { bedrooms: number; bathrooms: number; areaSqm: number }
  description: string
  amenities: string[]
  media: {
    images: string[]
    videos: { url: string; label: string }[]
  }
  immersive: {
    has3D: boolean
    glbPath?: string
    viewerLink?: string
    processedAt?: string
  }
}

// ----------- Icons ------------
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
)
const BedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M2 10h20v8h-2v-2H4v2H2v-8zm2 2v2h16v-2H4zM6 6h5a3 3 0 013 3H3a3 3 0 013-3z"/></svg>
)
const BathIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M7 4a3 3 0 013-3h1a3 3 0 013 3v3H7V4zm-2 5h14a2 2 0 012 2v5a3 3 0 01-3 3H6a3 3 0 01-3-3v-5a2 2 0 012-2z"/></svg>
)
const AreaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>
)
const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path fill="currentColor" d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
)

// ---------- Lightbox ------------
function Lightbox({ items, index, onClose, setIndex }: { items: { kind: 'image' | 'video'; src: string; label?: string }[], index: number, onClose: () => void, setIndex: (i:number)=>void }) {
  const total = items.length
  const current = items[index]
  const prev = () => setIndex((index - 1 + total) % total)
  const next = () => setIndex((index + 1) % total)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative max-w-6xl w-full px-6" onClick={onClose}>
        {current.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt={current.label || ''} className="max-h-[85vh] w-full object-contain rounded-xl mx-auto" />
        ) : (
          <video src={current.src} className="max-h-[85vh] w-full rounded-xl" controls autoPlay />
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={prev} className="rounded-full bg-black/50 px-3 py-1 text-white">‹</button>
          <button onClick={next} className="rounded-full bg-black/50 px-3 py-1 text-white">›</button>
          <button onClick={onClose} className="rounded-full bg-black/50 px-3 py-1 text-white">×</button>
        </div>
      </div>
    </div>
  )
}

// -------- Gallery ---------
function MediaGallery({ images, videos }: { images: string[]; videos: { url: string; label: string }[] }) {
  const items = useMemo(() => [
    ...images.map((url) => ({ kind: 'image' as const, src: url })),
    ...videos.map((v) => ({ kind: 'video' as const, src: v.url, label: v.label }))
  ], [images, videos])

  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  if (!items.length) return (
    <div className="aspect-[16/9] rounded-2xl border border-[color:var(--surface-border)] grid place-items-center text-sm text-muted">No media available</div>
  )

  const current = items[active]

  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-black">
        {current.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt="" className="h-full w-full object-cover" onClick={() => setOpen(true)} />
        ) : (
          <button className="relative h-full w-full" onClick={() => setOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80" alt="thumb" className="h-full w-full object-cover" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-black/60 p-4 text-white"><PlayIcon className="h-10 w-10"/></span>
            </div>
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {items.map((it, i) => (
          <button key={i} onClick={()=>setActive(i)} className={`relative h-20 w-32 rounded-xl overflow-hidden border ${i===active?'border-primary ring-2 ring-primary/30':'border-[color:var(--surface-border)]'}`}>
            {it.kind==='image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.src} alt="thumb" className="h-full w-full object-cover" />
            ):<div className="h-full w-full grid place-items-center bg-black/40 text-white"><PlayIcon className="h-6 w-6"/></div>}
          </button>
        ))}
      </div>
      {open && <Lightbox items={items} index={active} onClose={()=>setOpen(false)} setIndex={setActive}/>}
    </div>
  )
}

// ---------- Summary ----------
function Summary({ listing }: { listing: ListingReviewShape }) {
  const { pricing, specs, title, subtitle, propertyType, location } = listing
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div className="text-3xl font-bold">{pricing.currency} {pricing.basePrice}</div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><BedIcon className="h-4 w-4"/>{specs.bedrooms} beds</span>
        <span className="inline-flex items-center gap-1"><BathIcon className="h-4 w-4"/>{specs.bathrooms} baths</span>
        <span className="inline-flex items-center gap-1"><AreaIcon className="h-4 w-4"/>{specs.areaSqm} m²</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <MapPinIcon className="h-4 w-4" /> {location}
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs">{propertyType}</div>
    </div>
  )
}

// ---------- Description / Amenities ----------
function Description({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5">
      <h3 className="text-base font-semibold">Description</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  )
}
function Amenities({ items }: { items: string[] }) {
  if (!items?.length) return null
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5">
      <h3 className="text-base font-semibold">Key amenities</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map(a=>(<span key={a} className="rounded-full border border-[color:var(--surface-border)] bg-white/50 px-3 py-1 text-sm">{a}</span>))}
      </div>
    </div>
  )
}

// ---------- 3D Status ----------
function ImmersiveStatus({ immersive }: { immersive: ListingReviewShape['immersive'] }) {
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5">
      <h3 className="text-base font-semibold">Immersive viewer</h3>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${immersive.has3D ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <div>
            <p className="text-sm font-medium">{immersive.has3D ? '3D Pipeline Enabled' : 'Traditional Listing Only'}</p>
            <p className="text-xs text-muted">{immersive.has3D ? 'Interactive 3D viewing available' : 'Gallery view only'}</p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${immersive.has3D?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{immersive.has3D?'3D Ready':'Gallery Only'}</div>
      </div>
    </div>
  )
}

// ---------- Main ----------
export default function TraditionalViewer({ listing }: { listing?: ListingReviewShape }) {
  const data = listing ?? MOCK_REVIEW_LISTING
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><MediaGallery images={data.media.images} videos={data.media.videos}/></div>
        <div className="lg:col-span-1"><Summary listing={data}/></div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Description text={data.description}/>
          <Amenities items={data.amenities}/>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <ImmersiveStatus immersive={data.immersive}/>
        </div>
      </div>
    </div>
  )
}

// -------- Mock Review Listing ---------
const MOCK_REVIEW_LISTING: ListingReviewShape = {
  title: 'Luxury Smart Condo',
  subtitle: 'Premium 3-bedroom residence in the heart of Bole',
  status: 'Draft',
  pricing: { basePrice: '950,000', currency: 'ETB' },
  propertyType: 'Residential / Condo',
  location: '123 Palm Avenue, Addis Ababa',
  specs: { bedrooms: 3, bathrooms: 2, areaSqm: 165 },
  description: 'Thoughtfully designed condo featuring open-plan living, floor-to-ceiling windows, and fully integrated smart home controls.',
  amenities: ['Private balcony','High-speed fiber','Concierge','Solar backup'],
  media: {
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1616594039964-30b227d047a5?auto=format&fit=crop&w=1200&q=80'
    ],
    videos: [{ url: 'https://example.com/media/virtual-tour.mp4', label: 'Virtual walk-through' }]
  },
  immersive: { has3D: true, glbPath: 'models/condo_a.glb', viewerLink: '/agent/editor/condo-a', processedAt: '2025-10-01 18:32' }
}
