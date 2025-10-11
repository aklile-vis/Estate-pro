'use client'

import {
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  HeartIcon,
  BellIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { label: 'Listings', href: '/listings' },
  { label: 'Agent Studio', href: '/agent' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRefDesktop = useRef<HTMLDivElement>(null)
  const profileMenuRefMobile = useRef<HTMLDivElement>(null)

  const initials = useMemo(() => {
    if (!user?.name) return 'EP'
    return user.name
      .split(' ')
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('')
  }, [user?.name])

  const isAgent = useMemo(() => user?.role === 'AGENT' || user?.role === 'ADMIN', [user?.role])
  const visibleNavigation = useMemo(
    () => navigation.filter((item) => item.href !== '/agent' || isAgent),
    [isAgent]
  )

  // Close profile menu on outside click or Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      const insideDesktop = profileMenuRefDesktop.current?.contains(t)
      const insideMobile = profileMenuRefMobile.current?.contains(t)
      if (!insideDesktop && !insideMobile) setIsProfileMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="surface-header sticky inset-x-0 top-0 z-50 backdrop-blur-xl">
      <div className="container">
        <div className="flex h-20 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-4 py-2 shadow-sm transition hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-hover)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--sand-400)] to-[color:var(--sand-600)] text-[color:var(--overlay-text-primary)] shadow-md">
              <HomeIcon className="h-5 w-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm uppercase tracking-[0.3em] text-muted">EstatePro</span>
              <span className="text-sm font-semibold text-primary">3D Real Estate</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-2 py-1 shadow-sm md:flex">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-secondary transition hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-hover)] hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
            {user ? (
              <div className="flex items-center gap-3">
                {isAgent ? (
                  <Link href="/agent/my-listings" className="btn btn-secondary hidden xl:flex">
                    <BuildingOffice2Icon className="h-4 w-4" />
                    My Listings
                  </Link>
                ) : (
                  <Link href="/saved" className="btn btn-secondary hidden xl:flex">
                    <HeartIcon className="h-4 w-4" />
                    Saved
                  </Link>
                )}
                <button className="btn btn-secondary hidden xl:flex">
                  <BellIcon className="h-4 w-4" />
                  Alerts
                </button>
                <div ref={profileMenuRefDesktop} className="relative">
                  <button
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                    type="button"
                    onClick={() => setIsProfileMenuOpen((o) => !o)}
                    className="flex items-center gap-3 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                  >
                    {user.avatar ? (
                      <Image
                        alt={user.name ?? user.email ?? 'User avatar'}
                        className="h-9 w-9 rounded-full object-cover"
                        height={36}
                        src={user.avatar}
                        width={36}
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--sand-500)]/20 text-sm font-semibold text-secondary">
                        {initials}
                      </span>
                    )}
                    <div className="text-sm text-secondary">
                      <div className="font-semibold text-primary">{user.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-muted">
                        <span className="uppercase tracking-wide">{user.role === 'AGENT' ? 'Agent' : 'Buyer'}</span>
                      </div>
                    </div>
                  </button>
                  {isProfileMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-soft-raised)]"
                    >
                      <Link
                        role="menuitem"
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:bg-[color:var(--surface-hover)] hover:text-primary"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      {null}
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => { setIsProfileMenuOpen(false); logout() }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-secondary hover:bg-[color:var(--surface-hover)] hover:text-primary"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn btn-secondary">
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Create Account
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            {user ? (
              <div ref={profileMenuRefMobile} className="relative">
                <button
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  type="button"
                  onClick={() => setIsProfileMenuOpen((o) => !o)}
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-0 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-600)]"
                >
                  {user.avatar ? (
                    <Image
                      alt={user.name ?? user.email ?? 'User avatar'}
                      className="h-8 w-8 rounded-full object-cover"
                      height={32}
                      src={user.avatar}
                      width={32}
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--sand-500)]/20 text-xs font-semibold text-secondary">
                      {initials}
                    </span>
                  )}
                </button>
                {isProfileMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] shadow-[var(--shadow-soft-raised)]"
                  >
                    <Link
                      role="menuitem"
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:bg-[color:var(--surface-hover)] hover:text-primary"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {null}
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setIsProfileMenuOpen(false); logout() }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-secondary hover:bg-[color:var(--surface-hover)] hover:text-primary"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn btn-secondary px-3 py-1 text-sm">
                Sign In
              </Link>
            )}
            <button
              className="rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-2 text-secondary"
              onClick={() => setIsMenuOpen((open) => !open)}
              type="button"
            >
              {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="md:hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-4 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-6 shadow-sm">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="input pl-9" placeholder="Search the marketplace" type="search" />
                </div>
                <nav className="flex flex-col gap-2">
                  {visibleNavigation.map((item) => (
                    <Link
                      key={item.href}
                      className="rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-secondary transition hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-hover)] hover:text-primary"
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                {user ? (
                  <div className="flex flex-col gap-3">
                    <button className="btn btn-secondary w-full" onClick={logout} type="button">
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login" className="btn btn-secondary w-full" onClick={() => setIsMenuOpen(false)}>
                      Sign In
                    </Link>
                    <Link href="/register" className="btn btn-primary w-full" onClick={() => setIsMenuOpen(false)}>
                      Create Account
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
