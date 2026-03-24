'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/lib/redux/store'
import { toggleSidebar } from '@/lib/redux/uiSlice'
import { LayoutDashboard, PanelLeftClose, PanelLeft } from 'lucide-react'

const navItems = [
  // Per D-06: Only Dashboard in Phase 1
  // Per D-07: Do NOT render future modules yet
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

export function Sidebar() {
  const dispatch = useDispatch()
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen)
  const pathname = usePathname()

  return (
    <aside
      className={`flex h-screen flex-col bg-slate-900 text-white transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {sidebarOpen && (
          <span className="text-lg font-bold tracking-tight">CMS</span>
        )}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[0.5rem] px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
