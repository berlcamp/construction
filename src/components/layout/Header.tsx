'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/lib/redux/store'
import { Breadcrumbs } from './Breadcrumbs'
import { UserMenu } from './UserMenu'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type HeaderProps = {
  companyName: string
  trialEndsAt: string | null
  subscriptionStatus: string
  userFullName: string | null
  userAvatarUrl: string | null
  userEmail: string
}

export function Header({
  trialEndsAt,
  subscriptionStatus,
  userFullName,
  userAvatarUrl,
  userEmail,
}: HeaderProps) {
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount)

  // Calculate trial days remaining (per D-09)
  let trialDaysLeft: number | null = null
  if (subscriptionStatus === 'trial' && trialEndsAt) {
    const now = new Date()
    const ends = new Date(trialEndsAt)
    trialDaysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Notification bell + Trial badge + User avatar */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="relative rounded-[0.5rem] p-2 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Trial Badge (per D-09 — small badge, non-intrusive, disappears when active) */}
        {trialDaysLeft !== null && (
          <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700 text-xs font-medium">
            Trial &mdash; {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
          </Badge>
        )}

        <UserMenu
          userFullName={userFullName}
          userAvatarUrl={userAvatarUrl}
          userEmail={userEmail}
        />
      </div>
    </header>
  )
}
