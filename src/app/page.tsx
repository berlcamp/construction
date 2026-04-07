import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import SignInModal, { SignInTrigger } from "@/components/auth/SignInModal";

export const metadata = {
  title: "Sortbrite — Construction Inventory & Sales Management",
  description:
    "An operating system for Philippine construction firms. Track materials, jobs, and sales in one disciplined workspace.",
};

const services = [
  {
    n: "01",
    title: "Inventory Control",
    body: "Live stock across warehouses, sites, and bodegas. Reorder thresholds, cost layers, and audit trails baked in.",
  },
  {
    n: "02",
    title: "Sales & Quotations",
    body: "Quote, invoice, and collect without leaving the workspace. Tax-compliant for BIR forms out of the box.",
  },
  {
    n: "03",
    title: "Project Costing",
    body: "Tie every sack of cement to a project line item. Real margins, not gut feel.",
  },
  {
    n: "04",
    title: "Team & Roles",
    body: "Multi-tenant from day one. Engineers, foremen, and accountants each see only what they should.",
  },
];

const stats = [
  { k: "₱ 1.2B+", v: "Materials moved" },
  { k: "37", v: "Active firms" },
  { k: "99.97%", v: "Uptime, Q1 2026" },
  { k: "PH", v: "Built in Manila" },
];

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0d10] text-zinc-200 font-sans selection:bg-amber-300 selection:text-zinc-950">
      {/* Grain + grid backdrop */}
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
          <a className="transition hover:text-zinc-50" href="#services">Services</a>
          <a className="transition hover:text-zinc-50" href="#approach">Approach</a>
          <a className="transition hover:text-zinc-50" href="#work">Work</a>
          <Link className="transition hover:text-zinc-50" href="/pricing">Pricing</Link>
          <a className="transition hover:text-zinc-50" href="#contact">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <SignInTrigger className="hidden text-[13px] text-zinc-300 transition hover:text-white md:block">
            Sign in
          </SignInTrigger>
          <SignInTrigger className="group relative inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[13px] font-medium text-zinc-950 transition hover:bg-amber-300">
            Get started
            <span className="transition group-hover:translate-x-0.5">→</span>
          </SignInTrigger>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 md:px-10 md:pb-40 md:pt-28">
        <div className="grid grid-cols-12 gap-y-10 md:gap-x-10">
          <div className="col-span-12 md:col-span-8">
            <div className="mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
              <span className="h-px w-10 bg-amber-400" />
              Est. 2023 · Manila, Philippines
            </div>
            <h1 className="font-display text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.92] tracking-tight text-zinc-50">
              Building the
              <br />
              <span className="italic text-amber-300">infrastructure</span>{" "}
              behind builders.
            </h1>
            <p className="mt-10 max-w-xl text-[15px] leading-relaxed text-zinc-400">
              Sortbrite is the operating system for Philippine construction firms —
              an unhurried, disciplined workspace for tracking materials, jobs,
              and sales without the spreadsheet sprawl.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <SignInTrigger className="group inline-flex items-center gap-3 rounded-full bg-zinc-50 px-6 py-3.5 text-[13px] font-medium text-zinc-950 transition hover:bg-white">
                Start a workspace
                <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-950 text-[10px] text-zinc-50 transition group-hover:rotate-45">
                  →
                </span>
              </SignInTrigger>
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-2 py-3 text-[13px] text-zinc-300 transition hover:text-white"
              >
                See what we do
                <span className="text-amber-400">↓</span>
              </a>
            </div>
          </div>

          <aside className="col-span-12 md:col-span-4 md:pl-6 md:pt-2">
            <div className="border-l border-zinc-800 pl-6">
              <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                Currently
              </p>
              <p className="text-[15px] leading-relaxed text-zinc-300">
                Onboarding mid-sized construction firms across Luzon. Quietly
                rebuilding how the industry tracks{" "}
                <span className="italic text-amber-300">every sack,
                every sale.</span>
              </p>
              <div className="mt-8 space-y-3 text-[12px] text-zinc-500">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="flex items-center gap-2 text-zinc-300">
                    <span className="relative grid h-2 w-2 place-items-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Accepting clients
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Index</span>
                  <span className="text-zinc-300">v2 · 2026</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Marquee strip */}
      <div className="relative z-10 border-y border-zinc-800/80 bg-[#0a0c0f]">
        <div className="mx-auto flex max-w-7xl items-center gap-12 overflow-hidden px-6 py-5 text-[12px] uppercase tracking-[0.28em] text-zinc-500 md:px-10">
          <span className="text-amber-400">●</span>
          <span>Inventory</span>
          <span className="text-zinc-700">/</span>
          <span>Sales</span>
          <span className="text-zinc-700">/</span>
          <span>Project Costing</span>
          <span className="text-zinc-700">/</span>
          <span>Multi-tenant</span>
          <span className="text-zinc-700">/</span>
          <span>BIR-compliant</span>
          <span className="text-zinc-700">/</span>
          <span className="hidden md:inline">Built in Manila</span>
        </div>
      </div>

      {/* Services */}
      <section id="services" className="relative z-10 mx-auto max-w-7xl px-6 py-28 md:px-10 md:py-40">
        <div className="mb-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              ◆ What we do
            </p>
          </div>
          <div className="col-span-12 md:col-span-8">
            <h2 className="font-display text-[clamp(2rem,5vw,4rem)] leading-[1] tracking-tight text-zinc-50">
              Four disciplines.{" "}
              <span className="italic text-zinc-500">One workspace.</span>
            </h2>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-zinc-800 bg-zinc-800 md:grid-cols-2">
          {services.map((s) => (
            <li
              key={s.n}
              className="group relative bg-[#0b0d10] p-8 transition hover:bg-[#101316] md:p-12"
            >
              <div className="mb-10 flex items-start justify-between">
                <span className="font-mono text-[11px] tracking-widest text-zinc-600">
                  {s.n} / 04
                </span>
                <span className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-amber-400">
                  →
                </span>
              </div>
              <h3 className="font-display text-3xl leading-tight text-zinc-50 md:text-4xl">
                {s.title}
              </h3>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-zinc-400">
                {s.body}
              </p>
              <span className="absolute bottom-0 left-0 h-px w-0 bg-amber-400 transition-all duration-500 group-hover:w-full" />
            </li>
          ))}
        </ul>
      </section>

      {/* Stats / Approach */}
      <section
        id="approach"
        className="relative z-10 border-t border-zinc-800/80 bg-[#0a0c0f]"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-5">
              <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                ◆ Approach
              </p>
              <h2 className="font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1] tracking-tight text-zinc-50">
                Software with the{" "}
                <span className="italic text-amber-300">weight of a tool</span>
                , not the noise of a feed.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7">
              <p className="text-[15px] leading-relaxed text-zinc-400">
                We build for the foreman who needs an answer at 6 a.m. and the
                accountant who needs the same number at 6 p.m. No dashboards
                that lie. No AI that hallucinates inventory. Just instruments
                that earn the trust of the people who use them.
              </p>
              <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-zinc-800">
                {stats.map((s) => (
                  <div key={s.v} className="bg-[#0a0c0f] p-6">
                    <dt className="font-display text-3xl text-zinc-50 md:text-4xl">
                      {s.k}
                    </dt>
                    <dd className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="relative z-10 mx-auto max-w-7xl px-6 py-32 md:px-10 md:py-44">
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
                ◆ Begin
              </p>
              <h2 className="font-display text-[clamp(2.25rem,6vw,5.25rem)] leading-[0.95] tracking-tight text-zinc-50">
                Bring your firm{" "}
                <span className="italic text-amber-300">on-grid.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
                Spin up a workspace in under a minute. Invite your team. Move
                your first sack of cement into a system that remembers.
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
            <a href="#services" className="transition hover:text-zinc-200">Services</a>
            <a href="#approach" className="transition hover:text-zinc-200">Approach</a>
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
