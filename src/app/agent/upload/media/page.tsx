'use client'

import { PhotoIcon, FilmIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

// Images
type ImageItem = { file?: File | null; url: string }
// Videos
type VideoItem = { file?: File | null; url: string }

export default function AgentUploadMediaPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const { token } = useAuth()
  const router = useRouter()

  const addImages = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    
    for (const file of imageFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('Upload result:', result) // Debug log
          setImages(prev => [...prev, { file, url: result.url }])
        } else {
          console.error('Failed to upload image:', file.name)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
  }
  const removeImageAt = (idx: number) => {
    setImages(prev => {
      const copy = [...prev]
      copy.splice(idx, 1)
      return copy
    })
  }

  const addVideos = async (files: FileList | File[]) => {
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'))
    
    for (const file of videoFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const result = await response.json()
          setVideos(prev => [...prev, { file, url: result.url }])
        } else {
          console.error('Failed to upload video:', file.name)
        }
      } catch (error) {
        console.error('Error uploading video:', error)
      }
    }
  }
  const removeVideoAt = (idx: number) => {
    setVideos(prev => {
      const copy = [...prev]
      copy.splice(idx, 1)
      return copy
    })
  }

  const onCardKeyDown = (e: React.KeyboardEvent, open: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }
  
  // Helper to turn stored path into a usable URL
  const toAbsolute = useCallback((url: string) => {
    return url?.startsWith('http')
      ? url
      : `/api/files/binary?path=${encodeURIComponent(url)}`
  }, [])

  // Modal/lightbox viewer state
  type Viewer = { type: 'image' | 'video'; index: number } | null
  const [viewer, setViewer] = useState<Viewer>(null)

  const closeViewer = useCallback(() => setViewer(null), [])

  const nextViewer = useCallback(() => {
    if (!viewer) return
    const list = viewer.type === 'image' ? images : videos
    if (!list.length) return
    setViewer({ type: viewer.type, index: (viewer.index + 1) % list.length })
  }, [viewer, images, videos])

  const prevViewer = useCallback(() => {
    if (!viewer) return
    const list = viewer.type === 'image' ? images : videos
    if (!list.length) return
    setViewer({
      type: viewer.type,
      index: (viewer.index - 1 + list.length) % list.length,
    })
  }, [viewer, images, videos])

  // Keyboard + scroll lock while viewer is open
  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeViewer(); return }
      // Allow native seeking for videos; only hijack arrows for images
      if (viewer.type === 'image') {
        if (e.key === 'ArrowRight') { e.preventDefault(); nextViewer() }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); prevViewer() }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [viewer, closeViewer, nextViewer, prevViewer])

  // Save media data and navigate to next step
  const goTo3DStep = useCallback(() => {
    const STORAGE_KEY = 'agent:uploadStep2'
    const step2Data = {
      images,
      videos,
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(step2Data))
    } catch {
      /* ignore storage errors */
    }
    router.push('/agent/upload/3d')
  }, [images, videos, router])

  // Go back to details step
  const goBackToDetails = useCallback(() => {
    router.back()
  }, [router])

  // Load media data from session storage
  useEffect(() => {
    try {
      // Check if a listing was recently published
      const wasPublished = sessionStorage.getItem('agent:published')
      if (wasPublished) {
        // Clear all data and start fresh
        sessionStorage.removeItem('agent:uploadStep1')
        sessionStorage.removeItem('agent:uploadStep2')
        sessionStorage.removeItem('agent:reviewDraft')
        sessionStorage.removeItem('agent:published')
        return
      }
      
      // Otherwise, restore from sessionStorage
      const raw = sessionStorage.getItem('agent:uploadStep2')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.images) setImages(parsed.images)
      if (parsed.videos) setVideos(parsed.videos)
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="min-h-screen bg-[color:var(--app-background)] text-primary">
      {/* Step Indicator */}
      <div className="border-b border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
        <div className="container py-6">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    step <= 2
                      ? 'border-[color:var(--accent-500)] bg-[color:var(--accent-500)] text-white'
                      : 'border-[color:var(--surface-border)] bg-[color:var(--surface-1)] text-muted'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-3 text-sm">
                  <p className={`font-medium ${step <= 2 ? 'text-primary' : 'text-muted'}`}>
                    {step === 1 ? 'Property Details' : step === 2 ? 'Media Upload' : '3D Pipeline'}
                  </p>
                </div>
                {step < 3 && (
                  <div className={`ml-8 h-px w-16 ${step < 2 ? 'bg-[color:var(--accent-500)]' : 'bg-[color:var(--surface-border)]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Media Upload */}
      <div className="container space-y-8 py-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
            <PhotoIcon className="h-4 w-4" /> Step 2: Media Upload
          </div>
          <h2 className="headline text-3xl">Add photos and videos</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted">
            Upload multiple images and short clips to showcase the property.
          </p>
        </header>

        <section className="surface-soft p-8 rounded-2xl border border-[color:var(--surface-border)] space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Images uploader */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-secondary flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-muted" /> Photos
              </p>
              <div
                className="rounded-xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.length) addImages(e.dataTransfer.files)
                }}
              >
                <p className="text-sm text-secondary">Drag & drop images here</p>
                <p className="text-xs text-muted">or</p>
                <button type="button" className="btn btn-secondary" onClick={() => imageInputRef.current?.click()}>
                  Select images
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addImages(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((m, idx) => {
                      return (
                        <div
                          key={m.url}
                          role="button"
                          tabIndex={0}
                          aria-label="Open image"
                          onClick={() => setViewer({ type: 'image', index: idx })}
                          onKeyDown={(e) => onCardKeyDown(e, () => setViewer({ type: 'image', index: idx }))}
                          className="relative group overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-500)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAbsolute(m.url)}
                            alt={m.file?.name || 'Listing image'}
                            className="h-32 w-full object-cover"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex items-center rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); removeImageAt(idx) }}
                            aria-label="Remove image"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )
                      
                  })}
                </div>
              )}
            </div>

            {/* Videos uploader */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-secondary flex items-center gap-2">
                <FilmIcon className="h-5 w-5 text-muted" /> Videos
              </p>
              <div
                className="rounded-xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.length) addVideos(e.dataTransfer.files)
                }}
              >
                <p className="text-sm text-secondary">Drag & drop videos here</p>
                <p className="text-xs text-muted">or</p>
                <button type="button" className="btn btn-secondary" onClick={() => videoInputRef.current?.click()}>
                  Select videos
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addVideos(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />
              </div>

              {videos.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {videos.map((v, idx) => {
                      return (
                        <div
                          key={v.url}
                          role="button"
                          tabIndex={0}
                          aria-label="Open video"
                          onClick={() => setViewer({ type: 'video', index: idx })}
                          onKeyDown={(e) => onCardKeyDown(e, () => setViewer({ type: 'video', index: idx }))}
                          className="relative group overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-500)]"
                        >
                          <video
                            className="h-32 w-full object-cover"
                            src={toAbsolute(v.url)}
                            preload="metadata"
                            muted
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex items-center rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); removeVideoAt(idx) }}
                            aria-label="Remove video"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Step 2 Navigation */}
        <div className="flex justify-between">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={goBackToDetails}
          >
            Back to Details
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={goTo3DStep}
          >
            Continue
          </button>
        </div>
      </div>

      {/* Media viewer modal (minimal) */}
      {viewer && (() => {
        const list = viewer.type === 'image' ? images : videos
        const current = list[viewer.index]
        const src = current ? toAbsolute(current.url) : ''

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            onClick={closeViewer}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-6xl rounded"
              onClick={(e) => e.stopPropagation()}
            >
              {viewer.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="mx-auto max-h-[90vh] w-auto max-w-full object-contain rounded-2xl"
                />
              ) : (
                <video
                  src={src}
                  className="mx-auto max-h-[90vh] w-auto max-w-full"
                  controls
                  autoPlay
                />
              )}

              {/* Close (icon only) */}
              <button
                type="button"
                onClick={closeViewer}
                aria-label="Close viewer"
                className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white
                          hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              {/* Bottom navigation (only if multiple media) */}
              {list.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-2 py-1">
                    <button
                      type="button"
                      onClick={prevViewer}
                      aria-label="Previous"
                      className="rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextViewer}
                      aria-label="Next"
                      className="rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )
      })()}
    </div>
  )
}
