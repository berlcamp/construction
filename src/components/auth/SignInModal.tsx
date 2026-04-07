'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

const errorMessages: Record<string, string> = {
  auth_failed: 'Sign-in failed. Please try again.',
  no_user: 'We could not load your account. Please try again.',
}

export default function SignInModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const inviteToken = searchParams.get('invite_token')
  const errorCode = searchParams.get('error')

  // Auto-open from URL state.
  useEffect(() => {
    if (
      searchParams.get('signin') === '1' ||
      inviteToken ||
      errorCode
    ) {
      setOpen(true)
    }
  }, [searchParams, inviteToken, errorCode])

  // Listen for trigger events from anywhere on the page.
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-signin', handler)
    return () => window.removeEventListener('open-signin', handler)
  }, [])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    // Strip signin/error params but preserve invite_token (it must survive
    // for the OAuth round-trip if the user re-opens).
    const params = new URLSearchParams(searchParams.toString())
    let mutated = false
    if (params.get('signin')) {
      params.delete('signin')
      mutated = true
    }
    if (params.get('error')) {
      params.delete('error')
      mutated = true
    }
    if (mutated) {
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
  }, [searchParams, router, pathname])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const supabase = createBrowserClient()
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?invite_token=${inviteToken}`
      : `${window.location.origin}/auth/callback`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          data: JSON.stringify({ app: 'construction' }),
        },
      },
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sign-in"
        onClick={close}
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md transition-opacity"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md overflow-hidden rounded-sm border border-zinc-800 bg-[#0b0d10] p-8 text-zinc-200 shadow-2xl md:p-10 animate-in fade-in zoom-in-95 duration-200">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, rgba(245,158,11,0.22), transparent 70%)',
          }}
        />

        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
        >
          ✕
        </button>

        <div className="relative">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-amber-400 text-[10px] font-bold text-zinc-950">
              SB
            </span>
            <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              {inviteToken ? 'Accept invitation' : 'Sign in'}
            </span>
          </div>

          <h2
            id="signin-title"
            className="font-display text-4xl leading-[1] tracking-tight text-zinc-50"
          >
            {inviteToken ? (
              <>
                Join your <span className="italic text-amber-300">team.</span>
              </>
            ) : (
              <>
                Welcome <span className="italic text-amber-300">back.</span>
              </>
            )}
          </h2>

          <p className="mt-4 text-[14px] leading-relaxed text-zinc-400">
            {inviteToken
              ? 'Sign in with Google to accept your invitation and step into the workspace.'
              : 'One disciplined workspace for materials, jobs, and sales. Continue with Google to enter.'}
          </p>

          {errorCode && (
            <div className="mt-6 rounded-sm border border-red-900/60 bg-red-950/30 px-4 py-3 text-[13px] text-red-300">
              {errorMessages[errorCode] || 'Something went wrong. Please try again.'}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-zinc-50 px-6 py-3.5 text-[13px] font-medium text-zinc-950 transition hover:bg-white disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {loading ? 'Redirecting…' : 'Continue with Google'}
            <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-950 text-[10px] text-zinc-50 transition group-hover:rotate-45">
              →
            </span>
          </button>

          <p className="mt-6 text-center text-[11px] tracking-wide text-zinc-600">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}

export function SignInTrigger({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-signin'))}
      className={className}
    >
      {children}
    </button>
  )
}
