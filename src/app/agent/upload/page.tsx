'use client'

import {
  ArrowUpOnSquareIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { processCAD, uploadDesignFile } from '@/lib/backendClient'
import { SUPPORTED_CURRENCIES } from '@/lib/utils'
import { PhotoIcon, FilmIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'


interface UploadSummary {
  fileId: string
  filePath: string
  size: number
  name: string
}

interface ProcessSummary {
  glbPath?: string | null
  ifcPath?: string | null
  usdPath?: string | null
  elementsCount?: number
  report?: unknown
  aiEnrichment?: unknown
  glbMaterials?: unknown
  lodReport?: unknown
  usdError?: string | null
}

type AIRoom = {
  id?: string
  type?: string
  default_materials?: Record<string, unknown>
  notes?: string
}

type AICamera = {
  name?: string
  position?: number[]
  look_at?: number[]
  lookAt?: number[]
}

type UploadCategory = 'ifc' | 'cad' | 'mesh' | 'bundle'

const MAX_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

function formatBytes(size: number) {
  if (!size) return '0 B'
  const i = Math.floor(Math.log(size) / Math.log(1024))
  const value = size / Math.pow(1024, i)
  const unit = ['B', 'KB', 'MB', 'GB', 'TB'][i] || 'B'
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${unit}`
}

function inferCategory(file: File): UploadCategory | null {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  if (['ifc', 'ifczip', 'ifcxml'].includes(extension)) return 'ifc'
  if (['dxf', 'dwg'].includes(extension)) return 'cad'
  if (['glb', 'gltf', 'obj', 'fbx', 'skp', 'blend'].includes(extension)) return 'mesh'
  if (['zip', 'rvt', 'rfa'].includes(extension)) return 'bundle'
  return null
}

export default function AgentUploadPage() {
  const [stage, setStage] = useState<'idle' | 'upload' | 'process' | 'topology' | 'persist' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('Drop a design file to get started')
  const [error, setError] = useState<string>('')
  const [upload, setUpload] = useState<UploadSummary | null>(null)
  const [result, setResult] = useState<ProcessSummary | null>(null)
  const [topologyPath, setTopologyPath] = useState<string | null>(null)
  const [savedModelId, setSavedModelId] = useState<string | null>(null)
  const [savedUnitId, setSavedUnitId] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [aiInsights, setAiInsights] = useState<Record<string, unknown> | null>(null)
  const [fileKind, setFileKind] = useState<UploadCategory | null>(null)
  const { token, user, isAuthenticated } = useAuth()
  const isAgent = user?.role === 'AGENT' || user?.role === 'ADMIN'
  const [media, setMedia] = useState<MediaItem[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const aiRooms = useMemo<AIRoom[]>(() => {
    if (!Array.isArray(aiInsights?.rooms)) return []
    return (aiInsights?.rooms as AIRoom[]).slice(0, 4)
  }, [aiInsights])

  const aiCameras = useMemo<AICamera[]>(() => {
    if (!Array.isArray(aiInsights?.cameras)) return []
    return (aiInsights?.cameras as AICamera[]).slice(0, 3)
  }, [aiInsights])

  const busyLabel = useMemo(() => {
    const label = fileKind
      ? {
          ifc: 'IFC model',
          cad: 'CAD drawing',
          mesh: '3D asset',
          bundle: 'design package',
        }[fileKind]
      : 'design file'

    switch (stage) {
      case 'upload':
        return `Uploading ${label} to processing cluster…`
      case 'process':
        return fileKind === 'ifc'
          ? 'Validating IFC geometry and preparing GLB / USD…'
          : fileKind === 'cad'
          ? 'Extracting topology and generating IFC / GLB…'
          : 'Optimising meshes and generating viewer assets…'
      case 'topology':
        return 'Persisting topology, AI insights, and material defaults…'
      case 'persist':
        return 'Registering processed artifacts for listings…'
      default:
        return ''
    }
  }, [fileKind, stage])

  const reset = useCallback(() => {
    setStage('idle')
    setMessage('Drop a design file to get started')
    setError('')
    setUpload(null)
    setResult(null)
    setTopologyPath(null)
    setSavedModelId(null)
    setSavedUnitId(null)
    setAiInsights(null)
    setFileKind(null)
  }, [])

  const handleSelect = useCallback(async (file: File) => {
    const category = inferCategory(file)
    if (!category) {
      setError('Unsupported file. Upload IFC, CAD, or common 3D formats to continue.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`File too large. Limit: ${formatBytes(MAX_SIZE)}`)
      return
    }

    if (!isAuthenticated || !isAgent) {
      setError('Agent authentication required. Please sign in again.')
      return
    }

    const actorId = user?.id || 'agent'

    setError('')
    setIsBusy(true)
    setStage('upload')
    setFileKind(category)
    setMessage(`Uploading ${file.name}…`)

    try {
      const uploadRes = await uploadDesignFile(file, actorId, token || undefined)
      const summary: UploadSummary = {
        fileId: uploadRes.file_id,
        filePath: uploadRes.file_path,
        size: file.size,
        name: file.name,
      }
      setUpload(summary)

      setStage('process')
      setMessage(
        category === 'ifc'
          ? 'Validating IFC data and preparing viewer assets…'
          : category === 'cad'
          ? 'Processing drawing, generating spaces and IFC/GLB…'
          : 'Optimising geometry and compiling viewer assets…',
      )
      const processRes = await processCAD(uploadRes.file_path, uploadRes.file_id, token || undefined)
      const processSummary: ProcessSummary = {
        glbPath: processRes.glbPath,
        ifcPath: processRes.ifcPath,
        usdPath: processRes.usdPath,
        elementsCount: processRes.elementsCount,
        report: processRes.report,
        aiEnrichment: (processRes as any).ai_enrichment ?? null,
        glbMaterials: (processRes as any).glbMaterials ?? null,
        lodReport: (processRes as any).lod_report ?? null,
        usdError: (processRes as any).usd_error ?? null,
      }
      setResult(processSummary)
      if ((processRes as { ai_enrichment?: unknown }).ai_enrichment) {
        setAiInsights((processRes as { ai_enrichment?: Record<string, unknown> }).ai_enrichment ?? null)
      }

      setStage('topology')
      setMessage('Recording topology, catalog matches, and AI defaults…')
      const topoHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) topoHeaders.Authorization = `Bearer ${token}`
      const topoRes = await fetch('/api/process/topology', {
        method: 'POST',
        headers: topoHeaders,
        body: JSON.stringify({ uploadId: uploadRes.file_id, userId: actorId, filePath: uploadRes.file_path })
      })
      if (topoRes.ok) {
        const topoJson = await topoRes.json()
        if (topoJson?.topologyPath) setTopologyPath(topoJson.topologyPath)
        if (topoJson?.aiEnrichment) setAiInsights(topoJson.aiEnrichment as Record<string, unknown>)
      }

      setStage('persist')
      setMessage('Registering asset in library…')
      try {
        const ingestHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) ingestHeaders.Authorization = `Bearer ${token}`
        const derivedMime = file.type
          || (category === 'ifc'
            ? 'application/ifc'
            : category === 'cad'
            ? 'application/vnd.autocad.dxf'
            : category === 'mesh'
            ? 'model/gltf-binary'
            : 'application/octet-stream')

        const ingest = await fetch('/api/models/ingest', {
          method: 'POST',
          headers: ingestHeaders,
          body: JSON.stringify({
            fileName: file.name,
            filePath: uploadRes.file_path,
            fileSize: file.size,
            mimeType: derivedMime,
            status: 'completed',
            ifcPath: processRes.ifcPath,
            glbPath: processRes.glbPath,
            summaryPath: topologyPath || null,
            pipeline: category,
          })
        })
        if (ingest.ok) {
          const { id, unitId } = await ingest.json()
          setSavedModelId(id)
          if (unitId) setSavedUnitId(unitId)
        }
      } catch (persistError) {
        console.warn('Model ingest failed', persistError)
      }

      setStage('done')
      setMessage('Processing complete — open the viewers below')
    } catch (err) {
      console.error(err)
      setStage('error')
      setError((err as Error)?.message || 'Processing failed')
    } finally {
      setIsBusy(false)
    }
  }, [isAgent, isAuthenticated, token, topologyPath, user?.id])

  // from publish page, trimmed for Section 1
  type ListingFormState = {
    title: string
    basePrice: string
    description: string
    address: string
    city: string
    bedrooms: string
    bathrooms: string
    areaSqm: string
    currency: string
  }

  const DEFAULT_FORM: ListingFormState = {
    title: '',
    basePrice: '',
    description: '',
    address: '',
    city: '',
    bedrooms: '',
    bathrooms: '',
    areaSqm: '',
    currency: 'ETB',
  }

  type MediaItem = {
    file: File
    url: string
    kind: 'image' | 'video'
  }

  const [form, setForm] = useState<ListingFormState>(DEFAULT_FORM)

  const handleChange = (field: keyof ListingFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }
  
  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value.toUpperCase()
    setForm((prev) => ({ ...prev, currency: value }))
  }
  
  // Images
  type ImageItem = { file: File; url: string }
  const [images, setImages] = useState<ImageItem[]>([])
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const addImages = (files: FileList | File[]) => {
    const items = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({ file, url: URL.createObjectURL(file) }))
    setImages(prev => [...prev, ...items])
  }
  const removeImageAt = (idx: number) => {
    setImages(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(idx, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
  }

  // Videos
  type VideoItem = { file: File; url: string }
  const [videos, setVideos] = useState<VideoItem[]>([])
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const addVideos = (files: FileList | File[]) => {
    const items = Array.from(files)
      .filter(f => f.type.startsWith('video/'))
      .map(file => ({ file, url: URL.createObjectURL(file) }))
    setVideos(prev => [...prev, ...items])
  }
  const removeVideoAt = (idx: number) => {
    setVideos(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(idx, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(m => URL.revokeObjectURL(m.url))
      videos.forEach(v => URL.revokeObjectURL(v.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  type PropertyCategory = 'Residential' | 'Commercial'

  const [propTypeOpen, setPropTypeOpen] = useState(false)
  const [propTab, setPropTab] = useState<PropertyCategory>('Residential')
  const [propertyType, setPropertyType] = useState<string>('') // selected value (one of arrays above)
  const propRef = useRef<HTMLDivElement | null>(null)

  // close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!propRef.current) return
      if (!propRef.current.contains(e.target as Node)) setPropTypeOpen(false)
    }
    if (propTypeOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [propTypeOpen])



  return (
    <div className="min-h-screen bg-[color:var(--app-background)] text-primary">
      {/* Section 1: Traditional Details (from publish page styles) */}
      <div className="container space-y-8 py-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
            <DocumentTextIcon className="h-4 w-4" /> Listing details → traditional form
          </div>
          <h2 className="headline text-3xl">Enter property information</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted">
            Provide the essential details of this property — title, description, address, rooms, and pricing.
          </p>
        </header>

        <section className="surface-soft space-y-6 p-8 rounded-2xl border border-[color:var(--surface-border)]">
          {/* Title + Price/Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Listing title</span>
              <input
                required
                value={form.title}
                onChange={handleChange('title')}
                className="input h-11"
                placeholder="Luxury smart condo"
              />
            </label>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Base price</span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={handleChange('basePrice')}
                  className="input h-11"
                  placeholder="850000"
                />
                <select
                  value={form.currency}
                  onChange={handleCurrencyChange}
                  className="input h-11"
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted">Headline description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              className="input min-h-[96px]"
              placeholder="Highlight key selling points, finishes, and amenities"
            />
          </label>

          {/* Address / City */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Street address</span>
              <input
                value={form.address}
                onChange={handleChange('address')}
                className="input h-11"
                placeholder="123 Palm Avenue"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">City / region</span>
              <input
                value={form.city}
                onChange={handleChange('city')}
                className="input h-11"
                placeholder="Addis Ababa"
              />
            </label>
          </div>
          {/* Property Type (dropdown with Residential/Commercial tabs) */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted">Property type</span>

            <div className="relative" ref={propRef}>
              {/* Field button */}
              <button
                type="button"
                onClick={() => setPropTypeOpen((o) => !o)}
                className="input h-11 w-full flex items-center justify-between"
                aria-haspopup="listbox"
                aria-expanded={propTypeOpen}
              >
                <span className={propertyType ? 'text-primary' : 'text-disabled'}>
                  {propertyType || 'Select property type'}
                </span>
                <ChevronDownIcon className="h-5 w-5 text-muted" />
              </button>

              {/* Dropdown */}
              {propTypeOpen && (
                <div
                  className="absolute z-50 mt-2 w-full rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] shadow-[0_18px_40px_rgba(0,0,0,0.15)]"
                  role="dialog"
                >
                  {/* Tabs header */}
                  <div className="flex items-center justify-between px-4 pt-3">
                    <div className="flex w-full gap-8">
                      <button
                        type="button"
                        onClick={() => setPropTab('Residential')}
                        className={`pb-2 text-sm font-semibold ${
                          propTab === 'Residential' ? 'text-[color:var(--accent-500)]' : 'text-secondary'
                        }`}
                      >
                        Residential
                        <div
                          className={`mt-2 h-[2px] ${
                            propTab === 'Residential' ? 'bg-[color:var(--accent-500)]' : 'bg-transparent'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPropTab('Commercial')}
                        className={`pb-2 text-sm font-semibold ${
                          propTab === 'Commercial' ? 'text-[color:var(--accent-500)]' : 'text-secondary'
                        }`}
                      >
                        Commercial
                        <div
                          className={`mt-2 h-[2px] ${
                            propTab === 'Commercial' ? 'bg-[color:var(--accent-500)]' : 'bg-transparent'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mx-4 mt-2 h-px bg-[color:var(--surface-border)]/80" />

                  {/* Options grid */}
                  <div className="max-h-[360px] overflow-auto p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(propTab === 'Residential' ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES).map((label) => {
                        const selected = propertyType === label
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              setPropertyType(label)
                              setPropTypeOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-full border px-4 py-3 text-sm transition ${
                              selected
                                ? 'border-[color:var(--accent-500)] bg-[color:var(--accent-500)]/10 text-primary'
                                : 'border-[color:var(--surface-border)] bg-[color:var(--surface-1)] text-secondary hover:bg-[color:var(--surface-2)]'
                            }`}
                          >
                            <span className="truncate">{label}</span>
                            <span
                              className={`ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                                selected
                                  ? 'border-[color:var(--accent-500)] bg-[color:var(--accent-500)]'
                                  : 'border-[color:var(--surface-border)] bg-transparent'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-white' : 'bg-transparent'}`} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Footer actions (optional: Reset / Done) */}
                  <div className="flex items-center justify-between gap-3 border-t border-[color:var(--surface-border)] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setPropertyType('')}
                      className="btn btn-ghost"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setPropTypeOpen(false)}
                      className="btn btn-primary"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bedrooms / Bathrooms / Area */}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Bedrooms</span>
              <input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={handleChange('bedrooms')}
                className="input h-11"
                placeholder="3"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Bathrooms</span>
              <input
                type="number"
                min="0"
                value={form.bathrooms}
                onChange={handleChange('bathrooms')}
                className="input h-11"
                placeholder="2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Area (sqm)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.areaSqm}
                onChange={handleChange('areaSqm')}
                className="input h-11"
                placeholder="120"
              />
            </label>
          </div>
        </section>
      </div>

      {/* Section: Media (Images & Videos inside one form) */}
      <div className="container space-y-8 py-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
            <PhotoIcon className="h-4 w-4" /> Media → images & videos
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
                  {images.map((m, idx) => (
                    <div key={m.url} className="relative group overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.file.name} className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 inline-flex items-center rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeImageAt(idx)}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
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
                  {videos.map((v, idx) => (
                    <div key={v.url} className="relative group overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
                      <video className="h-32 w-full object-cover" src={v.url} controls preload="metadata" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 inline-flex items-center rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => removeVideoAt(idx)}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 3D upload & processing */}
      <div className="container space-y-10 py-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
            <CloudArrowUpIcon className="h-4 w-4" /> Design file → immersive pipeline
          </div>
          <h1 className="headline text-4xl">Upload CAD, generate immersive assets</h1>
          <p className="mx-auto max-w-2xl text-base text-muted">
            The agent pipeline ingests architectural drawings or authored BIM, generates IFC/GLB/USD outputs, and
            persists topology, AI insights, and material metadata so listings are ready for interactive customization.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="surface-soft space-y-6 p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Upload design or 3D source</p>
                <p className="text-secondary">Drag & drop IFC, RVT, DXF/DWG, GLB/GLTF, OBJ/FBX/BLEND, SKP, or packaged ZIP files up to {formatBytes(MAX_SIZE)}.</p>
              </div>
              <label
                className="btn btn-primary cursor-pointer"
              >
                <ArrowUpOnSquareIcon className="h-4 w-4" />
                <span>Select CAD / 3D file</span>
                <input
                  type="file"
                  accept=".ifc,.ifcxml,.dxf,.dwg,.glb,.gltf,.obj,.fbx,.skp,.blend,.zip,.rvt"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) handleSelect(file)
                  }}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 text-sm">
              <div className="flex items-center gap-3 text-muted">
                {stage === 'done' ? (
                  <CheckCircleIcon className="h-5 w-5 text-[color:var(--success-500)]" />
                ) : stage === 'error' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-[color:var(--warning-500)]" />
                ) : (
                  <PlayCircleIcon className="h-5 w-5 animate-pulse text-[color:var(--accent-500)]" />
                )}
                <div>
                  <div className="font-medium text-primary">
                    {busyLabel || message}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-disabled">
                    {stage.toUpperCase()}
                  </div>
                </div>
              </div>
              {error && (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-100">{error}</p>
              )}
            </div>

            {upload && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4">
                  <p className="text-xs uppercase tracking-widest text-muted">Source file</p>
                  <p className="mt-1 text-sm font-medium text-primary">{upload.name}</p>
                  <p className="text-xs text-disabled">{formatBytes(upload.size)} • id {upload.fileId}</p>
                </div>
                {result && (
                  <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4">
                    <p className="text-xs uppercase tracking-widest text-muted">Elements detected</p>
                    <p className="mt-1 text-3xl font-semibold text-primary">{result.elementsCount ?? 0}</p>
                    <p className="text-xs text-disabled">Floors, walls, spaces & more surfaced during processing</p>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="space-y-3 text-sm text-muted">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <LinkIcon className="h-4 w-4" /> Next steps
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedUnitId && (
                    <Link href={`/agent/editor/${encodeURIComponent(savedUnitId)}`} className="btn btn-primary">
                      <CubeIcon className="h-4 w-4" /> Edit in 3D Editor
                    </Link>
                  )}
                  {topologyPath && (
                    <Link
                      href={`/api/files/binary?path=${encodeURIComponent(topologyPath)}`}
                      className="btn btn-secondary"
                      target="_blank"
                    >
                      Topology JSON
                    </Link>
                  )}
                  {result?.usdPath && (
                    <Link
                      href={`/api/files/binary?path=${encodeURIComponent(result.usdPath)}`}
                      className="btn btn-secondary"
                    >
                      USD Asset
                    </Link>
                  )}
                </div>
                {!savedUnitId && (
                  <p className="text-xs text-muted">
                    The editor opens automatically once the processed unit is saved. Please retry the ingest step if no
                    editor link appears.
                  </p>
                )}
                {result.usdError && (
                  <p className="text-xs text-amber-200">
                    USD export warning: {result.usdError}
                  </p>
                )}

                {result?.lodReport
                  ? (() => {
                      const lod = (result.lodReport as Record<string, any>) || {}
                      const lodCategory = typeof lod.lod === 'string' ? lod.lod : 'unknown'
                      const coverage =
                        typeof lod.materialCoverage === 'number'
                          ? `${(lod.materialCoverage * 100).toFixed(0)}%`
                          : '—'
                      return (
                        <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4 text-xs text-muted">
                          <p className="text-xs uppercase tracking-wide text-muted">LOD inspection</p>
                          <p className="mt-1 text-sm font-semibold text-primary">{lodCategory.toUpperCase()}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-disabled">Detail score</div>
                              <div className="text-sm text-secondary">{lod.detailScore ?? '—'}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-disabled">Material coverage</div>
                              <div className="text-sm text-secondary">{coverage}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-disabled">Elements</div>
                              <div className="text-sm text-secondary">{lod.elementCount ?? '—'}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-disabled">With geometry</div>
                              <div className="text-sm text-secondary">{lod.elementsWithGeometry ?? '—'}</div>
                            </div>
                          </div>
                          {lod.needs_enrichment && (
                            <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                              Autofilled catalog materials were applied to lift photorealism for this IFC.
                            </p>
                          )}
                        </div>
                      )
                    })()
                  : null}
              </div>
            )}

            {aiInsights
              ? (() => {
                  const insights = aiInsights as Record<string, unknown>
                  return (
                    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-5 text-sm text-muted space-y-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                        <DocumentTextIcon className="h-4 w-4" /> AI layout briefing
                      </div>
                      {aiRooms.length > 0 && (
                        <div>
                          <p className="text-xs text-muted mb-1">Rooms</p>
                          <ul className="space-y-1 text-xs">
                            {aiRooms.map((room, idx) => (
                              <li key={room?.id || idx} className="rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2">
                                <div className="font-semibold text-secondary">{room?.type || room?.id || 'room'}</div>
                                {room?.default_materials && (
                                  <div className="mt-1 grid grid-cols-2 gap-1 text-muted">
                                    {Object.entries(room.default_materials).map(([slot, value]) => (
                                      <span key={slot}>{slot}: {String(value)}</span>
                                    ))}
                                  </div>
                                )}
                                {room?.notes && <p className="mt-1 text-muted">{room.notes}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiCameras.length > 0 && (
                        <div>
                          <p className="text-xs text-muted mb-1">Suggested cameras</p>
                          <ul className="space-y-1 text-xs">
                            {aiCameras.map((cam, idx) => (
                              <li key={cam?.name || idx} className="rounded-lg border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2">
                                <div className="font-semibold text-secondary">{cam?.name || `camera_${idx}`}</div>
                                <div className="mt-1 text-muted">pos: {JSON.stringify(cam?.position)}</div>
                                <div className="text-muted">look_at: {JSON.stringify(cam?.look_at || cam?.lookAt)}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })()
              : null}

            {stage === 'done' && (
              <div className="rounded-2xl border border-[color:var(--success-500)]/40 bg-[color:var(--success-500)]/12 p-5 text-sm text-primary">
                <p className="font-semibold text-[color:var(--success-500)]">Pipeline complete.</p>
                <p className="mt-1 text-secondary">
                  Geometry checks, AI enrichment, and catalog defaults are complete. Assets are registered and ready for
                  the editor, pricing tools, and public listings.
                </p>
                {savedModelId && (
                  <p className="mt-2 text-xs text-secondary">
                    Registered model id:
                    <code className="ml-1 rounded bg-[color:var(--success-500)]/20 px-1 text-[color:var(--success-500)]">
                      {savedModelId}
                    </code>
                  </p>
                )}
                {savedUnitId && (
                  <p className="text-xs text-secondary">
                    Property unit id:
                    <code className="ml-1 rounded bg-[color:var(--success-500)]/20 px-1 text-[color:var(--success-500)]">
                      {savedUnitId}
                    </code>
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={reset}
              disabled={isBusy}
            >
              Reset session
            </button>
          </div>

          <aside className="space-y-4">
            <div className="surface-soft space-y-3 p-5 text-sm text-muted">
              <p className="text-xs uppercase tracking-wide text-muted">Pipeline steps</p>
              <ol className="space-y-2 text-xs text-muted">
                <li>1. Upload design intent (IFC, CAD, mesh, or bundled package).</li>
                <li>2. Normalise geometry, infer spaces, and validate structure.</li>
                <li>3. Generate or refine IFC with openings, relationships, and materials.</li>
                <li>4. Emit photorealistic GLB/USD assets with catalog-ready materials.</li>
                <li>5. Persist topology, AI insights, and manifest metadata.</li>
              </ol>
            </div>

            <div className="surface-soft space-y-3 p-5 text-sm text-muted">
              <p className="text-xs uppercase tracking-wide text-muted">Need to manage existing uploads?</p>
              <div className="flex flex-col gap-2">
                <Link href="/agent/unified-upload" className="btn btn-secondary">
                  Power tools workspace
                </Link>
                <Link href="/agent/units" className="btn btn-secondary">
                  Go to units
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
