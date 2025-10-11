'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, refresh } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Notifications removed

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null)
  const [profileNotice, setProfileNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const pathname = usePathname()

  // Section navigation (left sidebar)
  const [activeSection, setActiveSection] = useState<string>('overview')
  const sectionIds = useMemo(() => {
    const isAgentRole = user?.role === 'AGENT' || user?.role === 'ADMIN'
    const base = ['overview', 'details', 'security']
    return isAgentRole
      ? ['overview', 'details', 'agency', 'security', 'my-listings', 'shortcuts']
      : [...base, 'saved']
  }, [user?.role])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!user) return
    setName(user?.name || '')
    // Load profile from backend
    ;(async () => {
      try {
        const r = await fetch('/api/profile', { cache: 'no-store' })
        const data = await r.json().catch(() => ({} as any))
        if (r.ok && data?.profile) {
          setPhone(data.profile.phone || '')
          setJobTitle(data.profile.jobTitle || '')
          setAgencyName(data.profile.agencyName || '')
          if (data.profile.avatarUrl) {
            setInitialAvatar(data.profile.avatarUrl)
          }
          setAvatarRemoved(false)
        }
      } catch {}
    })()
  }, [user])

  // Removed IntersectionObserver: sidebar now switches panes, not scroll

  const initials = useMemo(() => {
    const src = name || user?.name || 'EP'
    return src
      .split(' ')
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('')
  }, [name, user?.name])

  const onPickAvatar = () => fileInputRef.current?.click()
  const onAvatarChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarRemoved(false)
      setAvatarPreview(String(reader.result))
    }
    reader.readAsDataURL(f)
  }

  // Auto-dismiss success notices after 3s
  useEffect(() => {
    if (profileNotice?.type === 'success') {
      const t = setTimeout(() => setProfileNotice(null), 3000)
      return () => clearTimeout(t)
    }
  }, [profileNotice])
  useEffect(() => {
    if (passwordNotice?.type === 'success') {
      const t = setTimeout(() => setPasswordNotice(null), 3000)
      return () => clearTimeout(t)
    }
  }, [passwordNotice])

  // Clear notices when switching panes or navigating away
  useEffect(() => {
    setProfileNotice(null)
    setPasswordNotice(null)
  }, [activeSection, pathname])

  const saveProfile: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    try {
      const payload: any = {
        name,
        phone,
        jobTitle,
        agencyName,
      }
      if (avatarPreview && avatarPreview.startsWith('data:image/')) {
        payload.avatarDataUrl = avatarPreview
      } else if (avatarRemoved) {
        payload.removeAvatar = true
      }
      const r = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setProfileNotice({ type: 'error', text: String(data?.error || 'Failed to save profile') })
        return
      }
      setInitialAvatar(data?.profile?.avatarUrl || null)
      setAvatarRemoved(false)
      const ts = new Date().toISOString()
      setLastSaved(ts)
      setProfileNotice({ type: 'success', text: 'Profile updated successfully.' })
      // Clear avatarPreview after successful upload/remove so future saves don’t resend
      setAvatarPreview(data?.profile?.avatarUrl ? null : avatarPreview)
      // Refresh auth session so header/avatar reflect changes immediately
      void refresh()
    } catch (err) {
      setProfileNotice({ type: 'error', text: 'Failed to save profile' })
    }
  }

  // Notifications removed

  const changePassword: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!currentPwd || newPwd.length < 8 || newPwd !== confirmPwd) {
      setPasswordNotice({ type: 'error', text: 'Enter current password and a valid new password (min 8 chars) that matches confirmation.' })
      return
    }
    try {
      const r = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setPasswordNotice({ type: 'error', text: String(data?.error || 'Failed to change password') })
        return
      }
      setPasswordNotice({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      setPasswordNotice({ type: 'error', text: 'Failed to change password' })
    }
  }

  const showProfileLoading = isLoading || !user; if (false) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <div className="text-secondary">Loading profile…</div>
      </div>
    )
  }

  const isAgent = user?.role === 'AGENT' || user?.role === 'ADMIN'

  // Saved and My Listings data
  const [savedList, setSavedList] = useState<Array<{ id: string; title: string; coverImage?: string | null; basePrice?: number; currency?: string | null }>>([])
  const [savedStatus, setSavedStatus] = useState('')
  const [myListings, setMyListings] = useState<Array<{ id: string; unitId?: string; title: string; isPublished?: boolean; coverImage?: string | null; basePrice?: number; currency?: string | null }>>([])
  const [myStatus, setMyStatus] = useState('')

  useEffect(() => {
    const loadSaved = async () => {
      setSavedStatus('Loading…')
      try {
        const r = await fetch('/api/saved', { cache: 'no-store' })
        const rows = await r.json()
        if (!r.ok) { setSavedStatus(rows?.error || 'Failed to load'); return }
        setSavedList(Array.isArray(rows)
          ? rows.map((l: any) => ({
              id: String(l.id),
              title: String(l.title || 'Untitled'),
              coverImage: l.coverImage ?? null,
              basePrice: typeof l.basePrice === 'number' ? l.basePrice : undefined,
              currency: typeof l.currency === 'string' ? l.currency : undefined,
            }))
          : []
        )
        setSavedStatus('')
      } catch { setSavedStatus('Failed to load') }
    }
    if (!isAgent && activeSection === 'saved') void loadSaved()
  }, [activeSection, isAgent])

  useEffect(() => {
    const loadMine = async () => {
      setMyStatus('Loading…')
      try {
        const r = await fetch('/api/listings/mine', { cache: 'no-store' })
        const rows = await r.json()
        if (!r.ok) { setMyStatus(rows?.error || 'Failed to load'); return }
        setMyListings(Array.isArray(rows)
          ? rows.map((l: any) => ({
              id: String(l.id),
              unitId: l.unitId,
              title: String(l.title || 'Untitled'),
              isPublished: !!l.isPublished,
              coverImage: l.coverImage ?? null,
              basePrice: typeof l.basePrice === 'number' ? l.basePrice : undefined,
              currency: typeof l.currency === 'string' ? l.currency : undefined,
            }))
          : []
        )
        setMyStatus('')
      } catch { setMyStatus('Failed to load') }
    }
    if (isAgent && activeSection === 'my-listings') void loadMine()
  }, [activeSection, isAgent])

  if (showProfileLoading) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <div className="text-secondary">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">My Profile</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Sidebar */}
        <aside className="lg:col-span-3">
          <nav className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-3 shadow-[var(--shadow-soft)]">
            <ul className="space-y-1">
              {sectionIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeSection === id
                        ? 'bg-[color:var(--surface-hover)] text-primary'
                        : 'text-secondary hover:bg-[color:var(--surface-hover)] hover:text-primary'
                    }`}
                  >
                    {id === 'overview' && 'Overview'}
                    {id === 'details' && 'Profile Details'}
                    {id === 'agency' && 'Agency'}
                    {id === 'security' && 'Security'}
                    {id === 'saved' && 'Saved'}
                    {id === 'my-listings' && 'My Listings'}
                    {id === 'shortcuts' && 'Agent Shortcuts'}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Center: Content (pane switching) */}
        <section className="space-y-6 lg:col-span-6">
          {activeSection === 'overview' && (
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-4">
                {(!avatarRemoved && (initialAvatar || user?.avatar)) ? (
                  <Image
                    alt={user?.name ?? user?.email ?? 'User avatar'}
                    className="h-14 w-14 rounded-full object-cover"
                    height={56}
                    src={(initialAvatar || (user?.avatar as string))}
                    width={56}
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--sand-500)]/20 text-base font-semibold text-secondary">
                    {initials}
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold text-primary">{name || 'Unnamed User'}</div>
                  <div className="text-sm text-secondary">{user?.email}</div>
                  <div className="text-xs uppercase tracking-wide text-muted">{user?.role}</div>
                </div>
              </div>
            </div>
          )}

          {!isAgent && activeSection === 'saved' && (
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Saved Listings</h2>
                <Link href="/saved" className="btn btn-secondary btn-sm">Go to Saved</Link>
              </div>
              {savedStatus && <div className="text-sm text-secondary">{savedStatus}</div>}
              {!savedStatus && savedList.length === 0 && (
                <div className="text-sm text-secondary">You haven’t saved any listings yet.</div>
              )}
              {!savedStatus && savedList.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {savedList.map((l) => {
                    const imageSrc = l.coverImage ? `/api/files/binary?path=${encodeURIComponent(l.coverImage)}&listingId=${encodeURIComponent(l.id)}` : null
                    return (
                      <Link key={l.id} href={`/listings/${l.id}`} className="group rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                        <div className="h-28 bg-gray-100">
                          {imageSrc ? (
                            <Image alt={l.title} src={imageSrc} width={320} height={112} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">No Image</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="truncate text-sm font-medium text-primary">{l.title}</div>
                          {typeof l.basePrice === 'number' && (
                            <div className="text-[12px] text-secondary">{formatPrice(l.basePrice, l.currency || 'ETB')}</div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {isAgent && activeSection === 'my-listings' && (
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">My Listings</h2>
                <Link href="/agent/my-listings" className="btn btn-secondary btn-sm">Go to My Listings</Link>
              </div>
              {myStatus && <div className="text-sm text-secondary">{myStatus}</div>}
              {!myStatus && myListings.length === 0 && (
                <div className="text-sm text-secondary">No listings yet. Publish from the Units dashboard.</div>
              )}
              {!myStatus && myListings.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {myListings.map((l) => {
                    const imageSrc = l.coverImage ? `/api/files/binary?path=${encodeURIComponent(l.coverImage)}&listingId=${encodeURIComponent(l.id)}` : null
                    return (
                      <div key={l.id} className="group rounded-2xl border border-[color:var(--surface-border)] bg-white shadow-sm overflow-hidden">
                        <Link href={`/listings/${l.id}`} className="block">
                          <div className="relative h-28 bg-gray-100">
                            {imageSrc ? (
                              <Image alt={l.title} src={imageSrc} width={320} height={112} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">No Image</div>
                            )}
                            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.isPublished ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>{l.isPublished ? 'Published' : 'Draft'}</span>
                          </div>
                          <div className="p-3">
                            <div className="truncate text-sm font-medium text-primary">{l.title}</div>
                            {typeof l.basePrice === 'number' && (
                              <div className="text-[12px] text-secondary">{formatPrice(l.basePrice, l.currency || 'ETB')}</div>
                            )}
                          </div>
                        </Link>
                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-2">
                          {l.unitId && (
                            <Link href={`/agent/units/${encodeURIComponent(l.unitId)}/publish`} className="btn btn-secondary btn-sm">Manage</Link>
                          )}
                          <Link href={`/listings/${l.id}`} className="btn btn-primary btn-sm">Open</Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {(activeSection === 'details' || (activeSection === 'agency' && isAgent)) && (
            <form id="profile-details-form" onSubmit={saveProfile} className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-lg font-semibold text-primary">
                {activeSection === 'details' ? 'Profile Details' : 'Agency'}
              </h2>

              {activeSection === 'details' && (
                <>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {(!avatarRemoved && (avatarPreview || initialAvatar || user?.avatar)) ? (
                        <Image
                          alt={user?.name ?? user?.email ?? 'User avatar'}
                          className="h-20 w-20 rounded-full object-cover"
                          height={80}
                          src={(avatarPreview || initialAvatar || (user?.avatar as string))}
                          width={80}
                        />
                      ) : (
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--sand-500)]/20 text-xl font-semibold text-secondary">
                          {initials}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                        <button type="button" className="btn btn-secondary" onClick={onPickAvatar}>Change Photo</button>
                        {(!avatarRemoved && (avatarPreview || initialAvatar || user?.avatar)) && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setAvatarPreview(null)
                              setAvatarRemoved(true)
                              setProfileNotice({ type: 'success', text: 'Avatar removed. Save changes to apply.' })
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-secondary">Full Name</label>
                      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-secondary">Email</label>
                      <input className="input" value={user?.email} readOnly />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-secondary">Phone</label>
                      <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-secondary">Job Title</label>
                      <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Agent" />
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'agency' && isAgent && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary">Agency Name</label>
                    <input className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Your agency" />
                  </div>
                </div>
              )}

              {profileNotice && (
                <div
                  className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${
                    profileNotice.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {profileNotice.text}
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          )}

          {activeSection === 'security' && (
            <form id="security-form" onSubmit={changePassword} className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-lg font-semibold text-primary">Security</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-secondary">Current Password</label>
                  <input className="input" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-secondary">New Password</label>
                  <input className="input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-secondary">Confirm Password</label>
                  <input className="input" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                </div>
              </div>
              {passwordNotice && (
                <div
                  className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${
                    passwordNotice.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {passwordNotice.text}
                </div>
              )}
              <div className="mt-6 flex items-center justify-end">
                <button type="submit" className="btn btn-primary">Change Password</button>
              </div>
            </form>
          )}

          {isAgent && activeSection === 'shortcuts' && (
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
              <h2 className="mb-4 text-lg font-semibold text-primary">Agent Shortcuts</h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <Link href="/agent/upload" className="btn btn-secondary">Upload New Unit</Link>
                <Link href="/agent/units" className="btn btn-secondary">My Units</Link>
                <Link href="/agent/review" className="btn btn-secondary">Review Drafts</Link>
                <Link href="/agent/dashboard" className="btn btn-secondary">Dashboard</Link>
                <Link href="/agent/materials-manager" className="btn btn-secondary">Materials</Link>
                <Link href="/agent/models" className="btn btn-secondary">Models</Link>
              </div>
            </div>
          )}
        </section>

        {/* Right: Sticky actions */}
        <aside className="lg:col-span-3">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 text-sm font-semibold text-primary">Quick Actions</div>
              <div className="grid gap-2">
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setActiveSection('security')
                    setTimeout(() => {
                      document.getElementById('security-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
                    }, 0)
                  }}
                >
                  Change Password
                </button>
                {isAgent ? (
                  <Link href="/agent/dashboard" className="btn btn-secondary">Open Agent Dashboard</Link>
                ) : (
                  <Link href="/listings" className="btn btn-secondary">Browse Listings</Link>
                )}
                <button type="button" className="btn btn-primary" onClick={logout}>Sign out</button>
              </div>
            </div>

            <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-4 text-sm text-secondary shadow-[var(--shadow-soft)]">
              <div className="font-semibold text-primary">Account</div>
              <div className="mt-2">{user?.email}</div>
              <div className="mt-1 uppercase text-[11px] tracking-wide text-muted">{user?.role}</div>
              {lastSaved && (
                <div className="mt-3 text-[11px] text-muted">Last saved: {new Date(lastSaved).toLocaleString()}</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}


