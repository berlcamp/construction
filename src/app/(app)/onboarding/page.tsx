'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCompany } from './actions'

export default function OnboardingPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createCompany, null)
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state?.success, router])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape to dismiss (re-openable from the page CTA)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const nameError =
    state?.error && typeof state.error === 'object' && 'name' in state.error && Array.isArray((state.error as Record<string, string[]>).name)
      ? (state.error as Record<string, string[]>).name[0]
      : null

  return (
    <div className="relative h-screen overflow-hidden bg-[#f3f1ec] text-stone-900">
      {/* Blueprint grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1c1917 1px, transparent 1px), linear-gradient(to bottom, #1c1917 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1c1917 1px, transparent 1px), linear-gradient(to bottom, #1c1917 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(234,88,12,0.12), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(28,25,23,0.20), transparent 60%)',
        }}
      />

      {/* PAGE — editorial hero behind the modal */}
      <main className="relative mx-auto flex h-full w-full max-w-5xl flex-col justify-between px-8 py-10 lg:px-14 lg:py-14">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
          <span>Sortbrite ◆ Workspace Setup</span>
          <span>Step 01 / 01</span>
        </div>

        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
            <span className="h-px w-10 bg-stone-400" />
            <span>A new ground is broken</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(3rem,8vw,6.5rem)] leading-[0.9] tracking-tight text-stone-900">
            Lay the <span className="italic text-orange-700">first stone</span>
            <br />
            of your firm.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-stone-600">
            Every project, invoice, and crew you&rsquo;ll ever manage will live
            under the name you choose. Make it count.
          </p>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="group mt-8 inline-flex items-center gap-3 bg-stone-900 px-6 py-4 text-white transition-colors hover:bg-orange-700"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.28em]">
                Open the charter
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl italic transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          )}
        </div>

        <div className="flex gap-10 border-t border-stone-300/70 pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
          <div>
            <div className="mb-0.5 text-stone-900">◢ Multi-tenant</div>
            isolated workspace
          </div>
          <div>
            <div className="mb-0.5 text-stone-900">◣ PH-ready</div>
            built for the field
          </div>
          <div>
            <div className="mb-0.5 text-stone-900">◤ Free to start</div>
            no card required
          </div>
        </div>
      </main>

      {/* MODAL */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="charter-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-950/55 backdrop-blur-[2px] animate-[fadeIn_240ms_ease-out]"
          />

          {/* Dialog */}
          <div
            className="relative w-full max-w-md animate-[liftIn_360ms_cubic-bezier(0.2,0.8,0.2,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stamped corner marks */}
            <div aria-hidden className="absolute -left-3 -top-3 h-6 w-6 border-l-2 border-t-2 border-stone-100" />
            <div aria-hidden className="absolute -right-3 -top-3 h-6 w-6 border-r-2 border-t-2 border-stone-100" />
            <div aria-hidden className="absolute -bottom-3 -left-3 h-6 w-6 border-b-2 border-l-2 border-stone-100" />
            <div aria-hidden className="absolute -bottom-3 -right-3 h-6 w-6 border-b-2 border-r-2 border-stone-100" />

            <div className="relative bg-white px-8 py-8 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.6)] sm:px-10">
              {/* Close */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center font-mono text-stone-500 transition-colors hover:text-orange-700"
              >
                ✕
              </button>

              <div className="mb-6 flex items-baseline justify-between border-b border-stone-200 pb-4">
                <span
                  id="charter-title"
                  className="font-[family-name:var(--font-display)] text-2xl italic text-stone-900"
                >
                  Charter
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
                  Form&nbsp;·&nbsp;SB-01
                </span>
              </div>

              {hydrated ? (
                <form action={formAction} className="space-y-5">
                  <Field
                    label="Company name"
                    hint="Required"
                    htmlFor="name"
                    error={nameError}
                  >
                    <input
                      id="name"
                      name="name"
                      placeholder="ABC Construction Corp."
                      required
                      minLength={2}
                      maxLength={100}
                      autoFocus
                      className="w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 font-[family-name:var(--font-display)] text-2xl text-stone-900 placeholder:text-stone-300 focus:border-orange-700 focus:outline-none focus:ring-0"
                    />
                  </Field>

                  <Field label="Address" hint="Optional" htmlFor="address">
                    <input
                      id="address"
                      name="address"
                      placeholder="123 Rizal Ave., Quezon City"
                      className="w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-orange-700 focus:outline-none focus:ring-0"
                    />
                  </Field>

                  <Field label="Phone" hint="Optional" htmlFor="phone">
                    <input
                      id="phone"
                      name="phone"
                      placeholder="+63 ___ ___ ____"
                      className="w-full border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:border-orange-700 focus:outline-none focus:ring-0"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="group relative mt-4 flex w-full items-center justify-between overflow-hidden bg-stone-900 px-6 py-4 text-white transition-all hover:bg-orange-700 disabled:opacity-60"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.28em]">
                      {isPending ? 'Breaking ground…' : 'Break ground'}
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl italic transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </button>
                </form>
              ) : (
                <div className="space-y-5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 animate-pulse bg-stone-200" />
                      <div className="h-8 w-full animate-pulse bg-stone-100" />
                    </div>
                  ))}
                  <div className="h-12 w-full animate-pulse bg-stone-200" />
                </div>
              )}
            </div>

            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-stone-300">
              By proceeding you accept the terms · Sortbrite&nbsp;©&nbsp;2026
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes liftIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-stone-600"
        >
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-stone-400">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-orange-700">
          ✕ {error}
        </p>
      )}
    </div>
  )
}
