'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  members: 'Members',
  onboarding: 'Onboarding',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) {
    return (
      <nav className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {segmentLabels[segments[0]] || 'Dashboard'}
        </span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        const isLast = index === segments.length - 1

        return (
          <span key={href} className="flex items-center gap-1.5">
            {index > 0 && <span>/</span>}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
