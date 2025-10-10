'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [website, setWebsite] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [twitter, setTwitter] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [notifyLeads, setNotifyLeads] = useState(true)
  const [notifyListingStatus, setNotifyListingStatus] = useState(true)
  const [notifyProduct, setNotifyProduct] = useState(false)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      // Prefill from localStorage if available (temporary until backend wiring)
      setPhone(localStorage.getItem('agent:phone') || '')
      setJobTitle(localStorage.getItem('agent:jobTitle') || '')
      setAgencyName(localStorage.getItem('agent:agencyName') || '')
      setWebsite(localStorage.getItem('agent:website') || '')
      setLicenseNo(localStorage.getItem('agent:licenseNo') || '')
      setTwitter(localStorage.getItem('agent:twitter') || '')
      setLinkedin(localStorage.getItem('agent:linkedin') || '')
      setInstagram(localStorage.getItem('agent:instagram') || '')
    }
  }, [user])

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
    reader.onload = () => setAvatarPreview(String(reader.result))
    reader.readAsDataURL(f)
  }

  const saveProfile: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    localStorage.setItem('agent:phone', phone)
    localStorage.setItem('agent:jobTitle', jobTitle)
    localStorage.setItem('agent:agencyName', agencyName)
    localStorage.setItem('agent:website', website)
    localStorage.setItem('agent:licenseNo', licenseNo)
    localStorage.setItem('agent:twitter', twitter)
    localStorage.setItem('agent:linkedin', linkedin)
    localStorage.setItem('agent:instagram', instagram)
    alert('Profile saved (local). Hook to API to persist server-side.')
  }

  const saveNotifications: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    alert('Notification preferences saved (local only).')
  }

  const changePassword: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    if (!currentPwd || newPwd.length < 8 || newPwd !== confirmPwd) {
      alert('Please enter your current password and a valid new password (min 8 chars, matching confirmation).')
      return
    }
    alert('Password change flow not wired to backend yet.')
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }

  if (isLoading || !user) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center">
        <div className="text-secondary">Loading profile…</div>
      </div>
    )
  }

  const isAgent = user.role === 'AGENT' || user.role === 'ADMIN'

  return (
    <div className="container max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">My Profile</h1>
        <button className="btn btn-secondary" type="button" onClick={logout}>
          Sign out
        </button>
      </div>

      {/* Profile header card */}
      <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {(avatarPreview || user.avatar) ? (
            <Image
              alt={user.name ?? user.email ?? 'User avatar'}
              className="h-20 w-20 rounded-full object-cover"
              height={80}
              src={avatarPreview || (user.avatar as string)}
              width={80}
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--sand-500)]/20 text-xl font-semibold text-secondary">
              {initials}
            </span>
          )}
          <div className="flex-1">
            <div className="text-lg font-semibold text-primary">{name || 'Unnamed User'}</div>
            <div className="text-sm text-secondary">{user.email}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">{user.role}</div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
            <button type="button" className="btn btn-secondary" onClick={onPickAvatar}>Change Photo</button>
            {avatarPreview && (
              <button type="button" className="btn btn-secondary" onClick={() => setAvatarPreview(null)}>Remove</button>
            )}
          </div>
        </div>
      </div>

      {/* Personal & Agency Info */}
      <form onSubmit={saveProfile} className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-semibold text-primary">Profile Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Full Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Email</label>
            <input className="input" value={user.email} readOnly />
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

        {isAgent && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-secondary">Agency</h3>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-secondary">Agency Name</label>
                <input className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Your agency" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-secondary">Website</label>
                <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-secondary">License No.</label>
                <input className="input" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="e.g. RERA ######" />
              </div>
            </div>
          </>
        )}

        <h3 className="mt-6 text-sm font-semibold text-secondary">Social</h3>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">LinkedIn</label>
            <input className="input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Twitter/X</label>
            <input className="input" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/handle" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Instagram</label>
            <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/handle" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </div>
      </form>

      {/* Notification Preferences */}
      <form onSubmit={saveNotifications} className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-semibold text-primary">Notifications</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--surface-border)] p-3">
            <input type="checkbox" className="mt-1" checked={notifyLeads} onChange={(e) => setNotifyLeads(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-primary">New lead emails</span>
              <span className="block text-xs text-secondary">Alerts when buyers message you or request tours</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--surface-border)] p-3">
            <input type="checkbox" className="mt-1" checked={notifyListingStatus} onChange={(e) => setNotifyListingStatus(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-primary">Listing status updates</span>
              <span className="block text-xs text-secondary">Processing, QA, and publishing notifications</span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--surface-border)] p-3">
            <input type="checkbox" className="mt-1" checked={notifyProduct} onChange={(e) => setNotifyProduct(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-primary">Product tips & updates</span>
              <span className="block text-xs text-secondary">Occasional announcements and best practices</span>
            </span>
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end">
          <button type="submit" className="btn btn-primary">Save Preferences</button>
        </div>
      </form>

      {/* Security */}
      <form onSubmit={changePassword} className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-soft)]">
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
        <div className="mt-6 flex items-center justify-end">
          <button type="submit" className="btn btn-primary">Change Password</button>
        </div>
      </form>

      {/* Quick Agent Shortcuts */}
      {isAgent && (
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
    </div>
  )
}
