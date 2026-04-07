import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import SignInModal, { SignInTrigger } from "@/components/auth/SignInModal";

export const metadata = {
  title: "Pricing — Sortbrite",
  description:
    "Three plans. One disciplined workspace. Pricing for Philippine construction firms of every size.",
};

type Tier = {
  name: string;
  tag: string;
  price: string;
  unit: string;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Foreman",
    tag: "01",
    price: "₱ 0",
    unit: "/ month",
    blurb:
      "For solo builders and tiny outfits getting their first sack of cement into a system that remembers.",
    features: [
      "1 workspace, 2 seats",
      "Up to 250 SKUs",
      "Inventory across 1 warehouse",
      "Basic quotations & invoices",
      "Community support",
    ],
    cta: "Start free",
  },
  {
    name: "Studio",
    tag: "02",
    price: "₱ 2,490",
    unit: "/ month",
    blurb:
      "For mid-sized firms who run multiple projects, a real bodega, and people who deserve real margins.",
    features: [
      "Unlimited seats",
      "Unlimited SKUs",
      "Multi-warehouse & site stock",
      "Project costing & job profitability",
      "BIR-compliant sales invoices",
      "Roles: engineer, foreman, accountant",
      "Email support, 1 business day",
    ],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    tag: "03",
    price: "Custom",
    unit: "let's talk",
    blurb:
      "For groups running several companies under one roof. White-glove onboarding, custom integrations, SLAs.",
    features: [
      "Everything in Studio",
      "Multi-tenant company groups",
      "Custom integrations & SSO",
      "Dedicated infrastructure",
      "Quarterly business reviews",
      "Priority support, 4-hour SLA",
    ],
    cta: "Talk to sales",
  },
];

const faqs = [
  {
    q: "Is there really a free plan?",
    a: "Yes. Foreman is free forever for solo builders and tiny firms. No credit card. No countdown timer. Upgrade only when your operation outgrows it.",
  },
  {
    q: "How does the 14-day trial work?",
    a: "Studio unlocks instantly when you start the trial. We'll only ask for billing details on day 12. Cancel anytime — your data stays put if you come back.",
  },
  {
    q: "Are you BIR-compliant?",
    a: "Sales invoices, official receipts, and the underlying journals are formatted to satisfy BIR requirements out of the box. We update templates whenever the rules change.",
  },
  {
    q: "What about my existing data?",
    a: "We migrate from spreadsheets, QuickBooks, and most local POS systems for free on Studio and above. Bring a CSV — we'll do the careful part.",
  },
  {
    q: "Where is my data hosted?",
    a: "Sortbrite runs on infrastructure in Singapore with daily backups. Companies on Enterprise can request Manila-region hosting.",
  },
];

export default async function PricingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Authenticated visitors can still see pricing — no redirect.

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0d10] text-zinc-200 font-sans selection:bg-amber-300 selection:text-zinc-950">
      {/* Backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at top, black 40%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(245,158,11,0.18), transparent 70%)",
        }}
      />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-amber-400 text-[11px] font-bold tracking-tighter text-zinc-950">
            SB
          </span>
          <span className="text-sm font-medium tracking-[0.18em] text-zinc-100">
            SORTBRITE<span className="text-amber-400">.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-9 text-[13px] text-zinc-400 md:flex">
          <Link className="transition hover:text-zinc-50" href="/#services">Services</Link>
          <Link className="transition hover:text-zinc-50" href="/#approach">Approach</Link>
          <Link className="text-zinc-50" href="/pricing">Pricing</Link>
          <Link className="transition hover:text-zinc-50" href="/#contact">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[13px] font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Dashboard
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
          ) : (
            <>
              <SignInTrigger className="hidden text-[13px] text-zinc-300 transition hover:text-white md:block">
                Sign in
              </SignInTrigger>
              <SignInTrigger className="group relative inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[13px] font-medium text-zinc-950 transition hover:bg-amber-300">
                Get started
                <span className="transition group-hover:translate-x-0.5">→</span>
              </SignInTrigger>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <div className="grid grid-cols-12 gap-y-10 md:gap-x-10">
          <div className="col-span-12 md:col-span-8">
            <div className="mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
              <span className="h-px w-10 bg-amber-400" />
              Pricing · PHP, VAT inclusive
            </div>
            <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.92] tracking-tight text-zinc-50">
              Three plans.
              <br />
              <span className="italic text-amber-300">One workspace</span> that
              earns its keep.
            </h1>
          </div>
          <aside className="col-span-12 md:col-span-4 md:pl-6 md:pt-2">
            <div className="border-l border-zinc-800 pl-6">
              <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Honest pricing
              </p>
              <p className="text-[14px] leading-relaxed text-zinc-400">
                No per-seat surprises. No quote-only landmines on Studio. The
                price you see is the price you pay — in pesos, not dollars.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Tiers */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-28 md:px-10 md:pb-40">
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-zinc-800 bg-zinc-800 lg:grid-cols-3">
          {tiers.map((t) => (
            <li
              key={t.name}
              className={`relative flex flex-col bg-[#0b0d10] p-8 transition md:p-10 ${
                t.highlight ? "lg:scale-[1.015] lg:bg-[#0e1115]" : "hover:bg-[#101316]"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-sm bg-amber-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-950">
                  Most chosen
                </span>
              )}
              <div className="mb-8 flex items-start justify-between">
                <span className="font-mono text-[11px] tracking-widest text-zinc-600">
                  {t.tag} / 03
                </span>
                {t.highlight && (
                  <span className="text-amber-400">◆</span>
                )}
              </div>
              <h3 className="font-display text-4xl leading-tight text-zinc-50">
                {t.name}
              </h3>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl text-zinc-50">
                  {t.price}
                </span>
                <span className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">
                  {t.unit}
                </span>
              </div>
              <p className="mt-5 text-[14px] leading-relaxed text-zinc-400">
                {t.blurb}
              </p>

              <div className="my-8 h-px w-full bg-zinc-800" />

              <ul className="space-y-3 text-[13.5px] text-zinc-300">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-[7px] h-1 w-3 shrink-0 bg-amber-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 pt-2">
                {t.name === "Enterprise" ? (
                  <a
                    href="mailto:hello@sortbrite.com"
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-full border border-zinc-700 px-6 py-3.5 text-[13px] font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                  >
                    {t.cta}
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </a>
                ) : (
                  <SignInTrigger
                    className={
                      t.highlight
                        ? "group inline-flex w-full items-center justify-center gap-3 rounded-full bg-amber-400 px-6 py-3.5 text-[13px] font-medium text-zinc-950 transition hover:bg-amber-300"
                        : "group inline-flex w-full items-center justify-center gap-3 rounded-full bg-zinc-50 px-6 py-3.5 text-[13px] font-medium text-zinc-950 transition hover:bg-white"
                    }
                  >
                    {t.cta}
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-950 text-[10px] text-zinc-50 transition group-hover:rotate-45">
                      →
                    </span>
                  </SignInTrigger>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[12px] text-zinc-500">
          All plans are billed monthly in PHP. Switch or cancel any time, no
          phone calls required.
        </p>
      </section>

      {/* Comparison strip */}
      <section className="relative z-10 border-y border-zinc-800/80 bg-[#0a0c0f]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-5">
              <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                ◆ What you get on every plan
              </p>
              <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1] tracking-tight text-zinc-50">
                The instrument is the{" "}
                <span className="italic text-amber-300">same</span>. The scale
                is yours.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7">
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-zinc-800">
                {[
                  ["Daily backups", "Every plan, every day"],
                  ["Audit log", "Every action, every user"],
                  ["Multi-device", "Office, site, jobsite"],
                  ["No lock-in", "Export your data any time"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#0a0c0f] p-6">
                    <dt className="font-display text-2xl text-zinc-50">{k}</dt>
                    <dd className="mt-2 text-[12px] uppercase tracking-[0.18em] text-zinc-500">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-28 md:px-10 md:py-40">
        <div className="mb-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              ◆ Frequently asked
            </p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <h2 className="font-display text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-tight text-zinc-50">
              Answers, before you{" "}
              <span className="italic text-zinc-500">have to ask.</span>
            </h2>
          </div>
        </div>

        <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
          {faqs.map((f, i) => (
            <li key={f.q} className="grid grid-cols-12 gap-6 py-8 md:py-10">
              <div className="col-span-12 md:col-span-1">
                <span className="font-mono text-[11px] tracking-widest text-zinc-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="col-span-12 font-display text-2xl leading-snug text-zinc-50 md:col-span-5 md:text-3xl">
                {f.q}
              </h3>
              <p className="col-span-12 text-[14.5px] leading-relaxed text-zinc-400 md:col-span-6">
                {f.a}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32 md:px-10 md:pb-44">
        <div className="relative overflow-hidden rounded-sm border border-zinc-800 bg-gradient-to-br from-[#0e1115] via-[#0b0d10] to-[#0a0c0f] p-10 md:p-20">
          <div
            aria-hidden
            className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(245,158,11,0.22), transparent 70%)",
            }}
          />
          <div className="relative grid grid-cols-12 items-end gap-10">
            <div className="col-span-12 md:col-span-8">
              <p className="mb-6 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                ◆ Ready
              </p>
              <h2 className="font-display text-[clamp(2.25rem,6vw,5.25rem)] leading-[0.95] tracking-tight text-zinc-50">
                Start free.{" "}
                <span className="italic text-amber-300">Grow when you do.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
                Open a workspace in under a minute. Move your first sack of
                cement into a system that finally remembers.
              </p>
            </div>
            <div className="col-span-12 flex flex-wrap gap-3 md:col-span-4 md:justify-end">
              <SignInTrigger className="inline-flex items-center gap-3 rounded-full bg-amber-400 px-6 py-3.5 text-[13px] font-medium text-zinc-950 transition hover:bg-amber-300">
                Open Sortbrite
                <span>→</span>
              </SignInTrigger>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-[12px] text-zinc-500 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-sm bg-amber-400 text-[10px] font-bold text-zinc-950">
              SB
            </span>
            <span>© {new Date().getFullYear()} Sortbrite — Built in Manila.</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/#services" className="transition hover:text-zinc-200">Services</Link>
            <Link href="/#approach" className="transition hover:text-zinc-200">Approach</Link>
            <Link href="/pricing" className="transition hover:text-zinc-200">Pricing</Link>
            <SignInTrigger className="transition hover:text-zinc-200">Sign in</SignInTrigger>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <SignInModal />
      </Suspense>
    </div>
  );
}
