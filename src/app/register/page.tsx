'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'

const ROLE_OPTIONS = [
  { value: 'USER', label: 'Buyer' },
  { value: 'AGENT', label: 'Agent' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'USER' | 'AGENT'>('USER')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          role,
          inviteCode: role === 'AGENT' ? inviteCode.trim() || undefined : undefined,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error || 'Registration failed')
        return
      }

      const loginResult = await login(email.trim(), password)
      if (!loginResult.success) {
        router.push('/login')
        return
      }

      router.replace(role === 'AGENT' ? '/agent/dashboard' : '/listings')
    } catch (err) {
      setError((err as Error)?.message || 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] p-10 text-sm text-secondary shadow-[var(--shadow-soft)]">
          <div className="text-center">
            <h1 className="text-[26px] font-semibold tracking-tight text-primary">Create your account</h1>
            <p className="mt-2 text-xs text-muted">
              Buyers preview immersive listings. Agents manage uploads, materials, and pricing.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wide text-muted">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-muted">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted">
                I&apos;m signing up as
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-xl border px-4 py-3 text-sm transition ${
                      role === option.value
                        ? 'border-brand-strong bg-brand text-white shadow-sm'
                        : 'border-[color:var(--surface-border)] bg-[color:var(--surface-0)] text-muted hover:border-brand hover:bg-brand-soft hover:text-brand-strong'
                    }`}
                    onClick={() => setRole(option.value as 'USER' | 'AGENT')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {role === 'AGENT' && (
              <div className="space-y-1.5">
                <label htmlFor="invite" className="block text-xs font-medium uppercase tracking-wide text-muted">
                  Agent invite code
                </label>
                <input
                  id="invite"
                  name="invite"
                  type="text"
                  required
                  placeholder="Provided by your administrator"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  className="input text-sm"
                />
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              className="btn btn-primary w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-strong hover:text-brand">
              Sign in here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
