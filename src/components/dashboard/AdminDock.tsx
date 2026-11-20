'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  FileSpreadsheet,
  MessageSquare,
  Command,
  Sun,
  Moon,
  Calendar,
  FolderOpen,
  ScrollText,
  Megaphone,
  MapPin,
  Box,
  Ticket,
  ShieldCheck,
  ShieldAlert,
  Users,
  Smartphone,
  Briefcase,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { AccountModals } from './AccountModals'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui'
import {
  getSystemOverrides,
  fetchRemoteOverrides,
  subscribeToOverrideChanges,
  getModuleHref,
  SYSTEM_MODULES,
  RoleKey,
} from '@/lib/overrides'

export type NavItem = {
  title: string
  href: string
  icon?: LucideIcon
  iconName?: string
  badge?: string | number
  isOverride?: boolean
}

export type AdminRole = 'ceo' | 'hr' | 'coordinator'

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Calendar,
  MessageSquare,
  FolderOpen,
  ScrollText,
  Megaphone,
  MapPin,
  Box,
  FileSpreadsheet,
  Ticket,
  ShieldCheck,
  ShieldAlert,
  Users,
  Smartphone,
  Briefcase,
  ClipboardCheck,
}

const ROLE_DEFAULTS: Record<
  AdminRole,
  {
    rootHref: string
    portalTitle: string
    portalSubtitle: string
    defaultName: string
    defaultTitle: string
    defaultInitials: string
  }
> = {
  ceo: {
    rootHref: '/ceo',
    portalTitle: 'Technocycle',
    portalSubtitle: 'Executive Portal',
    defaultName: 'Carlos Mendoza',
    defaultTitle: 'Chief Executive Officer',
    defaultInitials: 'CM',
  },
  hr: {
    rootHref: '/hr',
    portalTitle: 'Technocycle',
    portalSubtitle: 'HR Department',
    defaultName: 'Helena Garcia',
    defaultTitle: 'HR Officer',
    defaultInitials: 'HG',
  },
  coordinator: {
    rootHref: '/coordinator',
    portalTitle: 'Technocycle',
    portalSubtitle: 'Service Dept',
    defaultName: 'Aileen Bautista',
    defaultTitle: 'Service Coordinator',
    defaultInitials: 'AB',
  },
}

interface AdminDockProps {
  role: AdminRole
  navItems: NavItem[]
  portalTitle?: string
  portalSubtitle?: string
  userName?: string
  userRoleTitle?: string
  initials?: string
}

export function AdminDock({
  role,
  navItems,
  portalTitle,
  portalSubtitle,
  userName,
  userRoleTitle,
  initials,
}: AdminDockProps) {
  const pathname = usePathname()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const roleMeta = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.ceo
  const effectivePortalTitle = portalTitle || roleMeta.portalTitle
  const effectivePortalSubtitle = portalSubtitle || roleMeta.portalSubtitle

  const [activeProfile, setActiveProfile] = useState({
    name: userName || roleMeta.defaultName,
    title: userRoleTitle || roleMeta.defaultTitle,
    initials: initials || roleMeta.defaultInitials,
  })

  const [effectiveItems, setEffectiveItems] = useState<NavItem[]>(navItems)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  // Sidebar Dock Pinning State (persisted across admin sessions)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('@technocycle_dock_pinned_v2')
      if (stored === 'true') {
        setIsPinned(true)
      }
    } catch (e) {}

    const handlePinnedChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>
      if (typeof custom.detail === 'boolean') {
        setIsPinned(custom.detail)
      }
    }
    window.addEventListener('dock_pinned_changed', handlePinnedChange)
    return () => window.removeEventListener('dock_pinned_changed', handlePinnedChange)
  }, [])

  const togglePin = () => {
    const next = !isPinned
    setIsPinned(next)
    try {
      localStorage.setItem('@technocycle_dock_pinned_v2', String(next))
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('dock_pinned_changed', { detail: next }))
  }

  useEffect(() => {
    setMounted(true)

    // Dynamically fetch current user profile if available
    const fetchUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single()

          if (profile?.full_name) {
            const parts = profile.full_name.trim().split(' ')
            const derivedInitials =
              parts.length >= 2
                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                : profile.full_name.slice(0, 2).toUpperCase()

            setActiveProfile({
              name: profile.full_name,
              title: roleMeta.defaultTitle,
              initials: derivedInitials,
            })
          }
        }
      } catch (e) {
        // Fallback to role defaults
      }
    }
    fetchUser()
  }, [roleMeta])

  // Overrides subscription for non-CEO roles
  useEffect(() => {
    const updateNavWithOverrides = () => {
      if (!role || role === 'ceo') {
        setEffectiveItems(navItems)
        return
      }

      const overrides = getSystemOverrides()
      const grantedModuleIds = overrides[role as RoleKey] || []

      if (grantedModuleIds.length === 0) {
        setEffectiveItems(navItems)
        return
      }

      const overrideNavItems: NavItem[] = []
      grantedModuleIds.forEach((modId) => {
        const mod = SYSTEM_MODULES.find((m) => m.id === modId)
        if (mod) {
          const targetHref = getModuleHref(mod.id, role as RoleKey)
          const exists = navItems.some(
            (item) => item.href === targetHref || item.title === mod.name
          )
          if (!exists) {
            overrideNavItems.push({
              title: mod.name,
              href: targetHref,
              iconName: mod.iconName,
              isOverride: true,
            })
          }
        }
      })

      setEffectiveItems([...navItems, ...overrideNavItems])
    }

    updateNavWithOverrides()
    fetchRemoteOverrides().then(() => updateNavWithOverrides())
    const unsubscribeRealtime = subscribeToOverrideChanges(() => {
      updateNavWithOverrides()
    })

    window.addEventListener('system_overrides_updated', updateNavWithOverrides)
    window.addEventListener('storage', updateNavWithOverrides)

    return () => {
      unsubscribeRealtime()
      window.removeEventListener('system_overrides_updated', updateNavWithOverrides)
      window.removeEventListener('storage', updateNavWithOverrides)
    }
  }, [navItems, role])

  const isDark = mounted && resolvedTheme === 'dark'

  const isItemActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/ceo' && href !== '/coordinator' && href !== '/hr') {
      return pathname.startsWith(href)
    }
    return false
  }

  return (
    <>
      <aside
        aria-label="Admin Navigation Dock"
        className={`absolute left-4 md:left-5 top-4 md:top-5 bottom-4 md:bottom-5 z-50 ${
 isPinned || showProfileMenu ? 'w-[230px]' : 'w-[64px] hover:w-[230px]'
 } bg-surface rounded-modal p-3 flex flex-col justify-between shadow-card hover:shadow-raised group/dock transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden select-none`}
      >
        {/* Top Brand Section */}
        {/* The page links scroll on a short window, so the profile (Sign out) below always stays on screen */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex items-center justify-between min-w-0">
            <Link
              href={roleMeta.rootHref}
              title={`${effectivePortalTitle} ${effectivePortalSubtitle}`}
              className="flex items-center gap-3.5 px-0 py-1 rounded-card hover:bg-surface-soft transition-colors overflow-hidden shrink-0 cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-250 group-hover/dock:scale-105">
                <Image
                  src={isDark ? '/technocycle-logo-dark.png' : '/technocycle-logo-light.png'}
                  alt="Technocycle Logo"
                  width={36}
                  height={36}
                  className="object-contain filter drop-shadow-xs"
                  priority
                />
              </div>

              <div
                className={`flex flex-col min-w-0 ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75 whitespace-nowrap overflow-hidden`}
              >
                <span className="text-sm font-semibold tracking-tight text-ink">
                  {effectivePortalTitle}
                </span>
                <span className="text-[10px] font-medium text-ink-3">
                  {effectivePortalSubtitle}
                </span>
              </div>
            </Link>

            {/* Prominent Header Pin / Expand Toggle */}
            <button
              id="btn-dock-pin-toggle-top"
              type="button"
              onClick={togglePin}
              title={isPinned ? 'Collapse Sidebar Navigation' : 'Lock Sidebar Navigation Open'}
              aria-label={isPinned ? 'Collapse Sidebar Navigation' : 'Lock Sidebar Navigation Open'}
              className={`p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-soft transition-all cursor-pointer ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 }`}
            >
              {isPinned ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="my-3 h-px w-full bg-line" />

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {effectiveItems.map((item) => {
              const IconComponent =
                item.icon ||
                (item.iconName && ICON_MAP[item.iconName]) ||
                Home
              const active = isItemActive(item.href)

              return (
                <div key={item.href} className="relative group/nav">
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-2.5 rounded-pill transition-colors duration-200 ${
 active
 ? 'bg-action text-on-action'
 : 'text-ink-2 hover:text-ink hover:bg-surface-soft'
 }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-small font-medium whitespace-nowrap ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75 truncate`}
                      >
                        {item.title}
                      </span>
                    </div>

                    {item.isOverride && (
                      <span
                        className={`text-micro font-medium px-2 py-0.5 rounded-pill bg-warning-soft text-warning ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75 shrink-0`}
                      >
                        Access
                      </span>
                    )}
                  </Link>

                  {/* Instant Floating Hover Tooltip for Collapsed State */}
                  {!isPinned && (
                    <div className="fixed left-[78px] hidden md:group-hover/nav:flex group-hover/dock:hidden items-center z-[100] pointer-events-none">
                      <div className="px-3 py-1.5 rounded-pill bg-action text-on-action text-caption font-medium shadow-raised whitespace-nowrap">
                        {item.title}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          </nav>
        </div>

        {/* Bottom Section: Quick actions + light/dark icons, then the profile (the menu pin is the icon beside the logo) */}
        <div className="flex shrink-0 flex-col gap-1.5 pt-3 border-t border-line relative">
          {/* Quick actions and light/dark: icons side by side (they stack when the menu is collapsed) */}
          <div className="flex flex-wrap items-center gap-1 px-0.5">
            <button
              id="btn-dock-quick-actions"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-quick-actions'))}
              title="Quick actions (Ctrl K)"
              aria-label="Quick actions (Ctrl K)"
              className="flex size-9 items-center justify-center rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <Command className="w-4 h-4" />
            </button>
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex size-9 items-center justify-center rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Profile Avatar & Menu */}
          <button
            type="button"
            onClick={() => setShowProfileMenu(true)}
            aria-haspopup="dialog"
            title={`${activeProfile.name} (${activeProfile.title})`}
            className="flex items-center gap-3 px-1.5 py-1.5 rounded-pill hover:bg-surface-soft transition-colors cursor-pointer w-full overflow-hidden"
          >
            <Avatar name={activeProfile.name} size="sm" />
            <div
              className={`flex flex-col text-left min-w-0 ${
 isPinned || showProfileMenu ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75 whitespace-nowrap`}
            >
              <span className="text-caption font-medium text-ink truncate">
                {activeProfile.name}
              </span>
              <span className="text-micro text-ink-3 truncate">
                {activeProfile.title}
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Account pop-up: name and role, Change password, Sign out */}
      <AccountModals
        open={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        name={activeProfile.name}
        title={activeProfile.title}
      />
    </>
  )
}
