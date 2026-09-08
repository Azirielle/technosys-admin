'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LucideIcon,
  ShieldCheck,
  Activity,
  LogOut,
  Ticket,
  FolderOpen,
  FileSpreadsheet,
  MapPin,
  Calendar,
  Box,
  Settings,
  Home,
  MessageSquare,
  ShieldAlert,
  Megaphone,
} from 'lucide-react'
import { logout } from '@/app/actions'
import { getSystemOverrides, getModuleHref, SYSTEM_MODULES, RoleKey } from '@/lib/overrides'

export type NavItem = {
  title: string
  href: string
  icon?: LucideIcon
  iconName?: string
  badge?: string | number
  isOverride?: boolean
}

interface SidebarProps {
  navItems: NavItem[]
  title: string
  role?: RoleKey
}

const ICON_MAP: Record<string, LucideIcon> = {
  Ticket,
  FolderOpen,
  FileSpreadsheet,
  MapPin,
  Calendar,
  Box,
  Settings,
  Home,
  MessageSquare,
  Megaphone,
}

export function Sidebar({ navItems, title, role }: SidebarProps) {
  const pathname = usePathname()
  const [effectiveItems, setEffectiveItems] = useState<NavItem[]>(navItems)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const executeLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.log('Client signout fallback:', err)
    }
    window.location.href = '/login'
  }

  useEffect(() => {
    const updateNavWithOverrides = () => {
      if (!role) {
        setEffectiveItems(navItems)
        return
      }

      const overrides = getSystemOverrides()
      const grantedModuleIds = overrides[role] || []

      if (grantedModuleIds.length === 0) {
        setEffectiveItems(navItems)
        return
      }

      const overrideNavItems: NavItem[] = []

      grantedModuleIds.forEach(modId => {
        const mod = SYSTEM_MODULES.find(m => m.id === modId)
        if (mod) {
          const targetHref = getModuleHref(mod.id, role)
          const exists = navItems.some(item => item.href === targetHref || item.title === mod.name)
          if (!exists) {
            overrideNavItems.push({
              title: mod.name,
              href: targetHref,
              iconName: mod.iconName,
              isOverride: true
            })
          }
        }
      })

      setEffectiveItems([...navItems, ...overrideNavItems])
    }

    updateNavWithOverrides()

    window.addEventListener('system_overrides_updated', updateNavWithOverrides)
    window.addEventListener('storage', updateNavWithOverrides)

    return () => {
      window.removeEventListener('system_overrides_updated', updateNavWithOverrides)
      window.removeEventListener('storage', updateNavWithOverrides)
    }
  }, [navItems, role])

  const isItemActive = (href: string) => {
    if (pathname === href) return true
    const hasMoreSpecificMatch = effectiveItems.some(
      (other) =>
        other.href !== href &&
        other.href.startsWith(href) &&
        (pathname === other.href || pathname.startsWith(other.href + '/'))
    )
    if (hasMoreSpecificMatch) return false
    return pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 shrink-0 bg-zinc-50/80 backdrop-blur-md border-r border-zinc-200/80 flex flex-col h-screen sticky top-0 select-none">
      {/* Workspace Identity Header */}
      <div className="p-4 border-b border-zinc-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-tight text-zinc-900">TechnoSys</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-200/70 text-zinc-700 border border-zinc-300/50">
                PRO
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-500 truncate">
              {title}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Workspace Section */}
      <div className="flex-1 px-3 py-4 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 px-3 pb-2">
            Navigation
          </div>
          <nav className="space-y-1">
            {effectiveItems.map((item) => {
              const Icon = item.icon || (item.iconName ? ICON_MAP[item.iconName] : undefined) || ShieldAlert
              const active = isItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all
                    ${
                      item.isOverride
                        ? active
                          ? 'bg-amber-500/10 text-amber-900 border border-amber-300/60 font-bold'
                          : 'text-amber-800 hover:bg-amber-100/50 border border-amber-200/50'
                        : active
                        ? 'bg-white text-indigo-700 shadow-2xs border border-zinc-200/90 font-bold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.isOverride
                          ? 'text-amber-600'
                          : active
                          ? 'text-indigo-600'
                          : 'text-zinc-400 group-hover:text-zinc-600'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.isOverride && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-300/60">
                        Override
                      </span>
                    )}

                    {item.badge ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {item.badge}
                      </span>
                    ) : active && !item.isOverride ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Operational Telemetry Card */}
        <div className="p-3 bg-zinc-100/70 border border-zinc-200/60 rounded-xl mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>System Status</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="space-y-1 text-[10px] text-zinc-500">
            <div className="flex justify-between">
              <span>Gateway</span>
              <span className="font-mono text-zinc-700">Supabase Edge</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Engine</span>
              <span className="font-mono text-zinc-700">SSR Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Encapsulated User & Sign-Out Dock */}
      <div className="p-3 border-t border-zinc-200/80 bg-zinc-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-200/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
              A
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-900 truncate">Admin User</span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal rendered via Portal */}
      {showLogoutModal && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Confirm Logout?</h3>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                  Are you sure you want to end your TechnoSys session?
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-xl font-semibold text-xs hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={executeLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold text-xs hover:bg-red-700 shadow-2xs disabled:opacity-50 transition-colors"
                >
                  {isLoggingOut ? 'Signing out...' : 'Yes, Logout'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}
