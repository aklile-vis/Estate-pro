'use client'

import {
  DocumentTextIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { SUPPORTED_CURRENCIES } from '@/lib/utils'

// from publish page, trimmed for Step 1
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

export default function AgentUploadDetailsPage() {
  const [form, setForm] = useState<ListingFormState>(DEFAULT_FORM)
  const [propTypeOpen, setPropTypeOpen] = useState(false)
  const [propTab, setPropTab] = useState<PropertyCategory>('Residential')
  const [propertyType, setPropertyType] = useState<string>('')
  const propRef = useRef<HTMLDivElement | null>(null)
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({})

  const router = useRouter()

  const handleChange = (field: keyof ListingFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value.toUpperCase()
    setForm((prev) => ({ ...prev, currency: value }))
  }

  // Field validation rules
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'title':
        return !value ? 'Title is required' : value.length < 5 ? 'Title must be at least 5 characters' : ''
      case 'basePrice':
        return !value ? 'Price is required' : isNaN(Number(value)) ? 'Must be a valid number' : ''
      case 'description':
        return !value ? 'Description is required' : value.length < 10 ? 'Description must be at least 10 characters' : ''
      case 'address':
        return !value ? 'Address is required' : ''
      case 'city':
        return !value ? 'City is required' : ''
      case 'bedrooms':
        return !value ? 'Number of bedrooms is required' : isNaN(Number(value)) ? 'Must be a valid number' : ''
      case 'bathrooms':
        return !value ? 'Number of bathrooms is required' : isNaN(Number(value)) ? 'Must be a valid number' : ''
      case 'areaSqm':
        return !value ? 'Area is required' : isNaN(Number(value)) ? 'Must be a valid number' : Number(value) <= 0 ? 'Area must be greater than 0' : ''
      default:
        return ''
    }
  }

  // Handle field blur (for validation)
  const handleBlur = (field: keyof ListingFormState) => {
    const error = validateField(field, form[field])
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.keys(form).every(field => !validateField(field, form[field as keyof typeof form])) && propertyType
  }, [form, propertyType])

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    // Validate form fields
    Object.keys(form).forEach(field => {
      const error = validateField(field, form[field as keyof typeof form])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    // Validate property type
    if (!propertyType) {
      newErrors.propertyType = 'Property type is required'
      isValid = false
    }

    setErrors(newErrors)
    
    return isValid
  }

  // Save form data and navigate to next step
  const goToMediaStep = useCallback(() => {
    if (!validateForm()) {
      return;
    }
    
    const STORAGE_KEY = 'agent:uploadStep1'
    const step1Data = {
      form,
      propertyType,
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(step1Data))
    } catch {
      /* ignore storage errors */
    }
    router.push('/agent/upload/media')
  }, [form, propertyType, router])

  // Load form data from session storage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('agent:uploadStep1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.form) setForm(parsed.form)
      if (parsed.propertyType) setPropertyType(parsed.propertyType)
    } catch {
      // ignore
    }
  }, [])

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
      {/* Step Indicator */}
      <div className="border-b border-[color:var(--surface-border)] bg-[color:var(--surface-1)]">
        <div className="container py-6">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    step === 1
                      ? 'border-[color:var(--accent-500)] bg-[color:var(--accent-500)] text-white'
                      : 'border-[color:var(--surface-border)] bg-[color:var(--surface-1)] text-muted'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-3 text-sm">
                  <p className={`font-medium ${step === 1 ? 'text-primary' : 'text-muted'}`}>
                    {step === 1 ? 'Property Details' : step === 2 ? 'Media Upload' : '3D Pipeline'}
                  </p>
                </div>
                {step < 3 && (
                  <div className={`ml-8 h-px w-16 ${step < 1 ? 'bg-[color:var(--accent-500)]' : 'bg-[color:var(--surface-border)]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Traditional Details */}
      <div className="container space-y-8 py-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
            <DocumentTextIcon className="h-4 w-4" /> Step 1: Property Details
          </div>
          <h2 className="headline text-3xl">Enter property information</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted">
            Provide the essential details of this property title, description, address, rooms, and pricing.
          </p>
        </header>

        <section className="surface-soft space-y-6 p-8 rounded-2xl border border-[color:var(--surface-border)]">
          {/* Title + Price/Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Listing title</span>
              <div className="relative">
                <input
                  required
                  value={form.title}
                  onChange={handleChange('title')}
                  onBlur={() => handleBlur('title')}
                  className="input h-11 w-full"
                  placeholder="Luxury smart condo"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                )}
              </div>
            </label>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Base price</span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
                <div className="relative">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    onChange={handleChange('basePrice')}
                    onBlur={() => handleBlur('basePrice')}
                    className="input h-11 w-full"
                    placeholder="850000"
                  />
                  {errors.basePrice && (
                    <p className="mt-1 text-xs text-red-500">{errors.basePrice}</p>
                  )}
                </div>
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
            <div className="relative">
              <textarea
                rows={3}
                value={form.description}
                onChange={handleChange('description')}
                onBlur={() => handleBlur('description')}
                className="input min-h-[96px] w-full"
                placeholder="Highlight key selling points, finishes, and amenities"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description}</p>
              )}
            </div>
          </label>

          {/* Address / City */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Street address</span>
              <div className="relative">
                <input
                  value={form.address}
                  onChange={handleChange('address')}
                  onBlur={() => handleBlur('address')}
                  className="input h-11 w-full"
                  placeholder="123 Palm Avenue"
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                )}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">City / region</span>
              <div className="relative">
                <input
                  value={form.city}
                  onChange={handleChange('city')}
                  onBlur={() => handleBlur('city')}
                  className="input h-11 w-full"
                  placeholder="Addis Ababa"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                )}
              </div>
            </label>
          </div>

          {/* Property Type (dropdown with Residential/Commercial tabs) */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted">Property type</span>

            <div className="relative" ref={propRef}>
              {/* Field button */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setPropTypeOpen((o) => !o)}
                  className={`input h-11 w-full flex items-center justify-between ${
                    errors.propertyType ? 'border-red-500' : ''
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={propTypeOpen}
                >
                  <span className={propertyType ? 'text-primary' : 'text-disabled'}>
                    {propertyType || 'Select property type'}
                  </span>
                  <ChevronDownIcon className="h-5 w-5 text-muted" />
                </button>
                {errors.propertyType && (
                  <p className="mt-1 text-xs text-red-500">{errors.propertyType}</p>
                )}
              </div>

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
                              const handlePropertyTypeSelect = (type: string) => {
                                setPropertyType(type)
                                setPropTypeOpen(false)
                                // Clear property type error when a type is selected
                                if (errors.propertyType) {
                                  setErrors(prev => {
                                    const newErrors = { ...prev }
                                    delete newErrors.propertyType
                                    return newErrors
                                  })
                                }
                              }
                              handlePropertyTypeSelect(label)
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
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={form.bedrooms}
                  onChange={handleChange('bedrooms')}
                  onBlur={() => handleBlur('bedrooms')}
                  className="input h-11 w-full"
                  placeholder="3"
                />
                {errors.bedrooms && (
                  <p className="mt-1 text-xs text-red-500">{errors.bedrooms}</p>
                )}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Bathrooms</span>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={form.bathrooms}
                  onChange={handleChange('bathrooms')}
                  onBlur={() => handleBlur('bathrooms')}
                  className="input h-11 w-full"
                  placeholder="2"
                />
                {errors.bathrooms && (
                  <p className="mt-1 text-xs text-red-500">{errors.bathrooms}</p>
                )}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Area (sqm)</span>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.areaSqm}
                  onChange={handleChange('areaSqm')}
                  onBlur={() => handleBlur('areaSqm')}
                  className="input h-11 w-full"
                  placeholder="120"
                />
                {errors.areaSqm && (
                  <p className="mt-1 text-xs text-red-500">{errors.areaSqm}</p>
                )}
              </div>
            </label>
          </div>
        </section>

        {/* Step 1 Navigation */}
        <div className="flex justify-end">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => {
              if (isFormValid) {
                goToMediaStep()
              } else {
                // Trigger validation to show errors
                validateForm()
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
