'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  FileSpreadsheet,
  MessageSquare,
  Command,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
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
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import ModalDialog from '@/components/ui/ModalDialog'
import { updateAdminPassword } from '@/app/actions/credentials'
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
    portalTitle: 'TechnoCycle',
    portalSubtitle: 'Executive Portal',
    defaultName: 'Carlos Mendoza',
    defaultTitle: 'Chief Executive Officer',
    defaultInitials: 'CM',
  },
  hr: {
    rootHref: '/hr',
    portalTitle: 'TechnoCycle',
    portalSubtitle: 'HR Department',
    defaultName: 'Helena Garcia',
    defaultTitle: 'HR Officer',
    defaultInitials: 'HG',
  },
  coordinator: {
    rootHref: '/coordinator',
    portalTitle: 'TechnoCycle',
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
  const router = useRouter()
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
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Password rotation state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Sidebar Dock Pinning State (persisted across admin sessions)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('@technocycle_dock_pinned')
      if (stored === 'true') {
        setIsPinned(true)
      } else if (stored === null && typeof window !== 'undefined' && window.innerWidth >= 1280) {
        setIsPinned(true)
        localStorage.setItem('@technocycle_dock_pinned', 'true')
        window.dispatchEvent(new CustomEvent('dock_pinned_changed', { detail: true }))
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
      localStorage.setItem('@technocycle_dock_pinned', String(next))
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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    try {
      setIsUpdatingPassword(true)
      const formData = new FormData()
      formData.append('new_password', newPassword)
      formData.append('confirm_password', confirmPassword)

      const res = await updateAdminPassword(formData)
      if (!res.success) {
        setPasswordError(res.error || 'Failed to update password')
      } else {
        setPasswordSuccess(true)
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordSuccess(false)
          setNewPassword('')
          setConfirmPassword('')
        }, 1500)
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update credentials')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <>
      <aside
        aria-label="Admin Navigation Dock"
        className={`absolute left-4 md:left-5 top-4 md:top-5 bottom-4 md:bottom-5 z-50 ${
          isPinned || showProfileMenu ? 'w-[230px]' : 'w-[64px] hover:w-[230px]'
        } bg-[#F5F4F7] dark:bg-[#22232A] rounded-[28px] p-3 flex flex-col justify-between border border-black/[0.05] dark:border-white/[0.08] shadow-tactile hover:shadow-2xl group/dock transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden select-none`}
      >
        {/* Top Brand Section */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between min-w-0">
            <Link
              href={roleMeta.rootHref}
              title={`${effectivePortalTitle} ${effectivePortalSubtitle}`}
              className="flex items-center gap-3.5 px-0 py-1 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors overflow-hidden shrink-0 cursor-pointer min-w-0"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-250 group-hover/dock:scale-105">
                <Image
                  src={isDark ? '/technocycle-logo-dark.png' : '/technocycle-logo-light.png'}
                  alt="TechnoCycle Logo"
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
                <span className="text-sm font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
                  {effectivePortalTitle}
                </span>
                <span className="text-[10px] font-medium text-[#8E8D9A] dark:text-[#7A7C88]">
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
              className={`p-1.5 rounded-lg text-[#8E8D9A] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all cursor-pointer ${
                isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
              }`}
            >
              {isPinned ? (
                <PanelLeftClose className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="w-full h-[1px] bg-black/[0.05] dark:border-white/[0.07] my-3.5" />

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
                    className={`flex items-center justify-between px-2.5 py-2.5 rounded-xl transition-all duration-200 ${
                      active
                        ? 'bg-[#4D55CC] text-[#FAF9FB] shadow-md font-bold'
                        : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
                        } transition-opacity duration-200 delay-75 truncate`}
                      >
                        {item.title}
                      </span>
                    </div>

                    {item.isOverride && (
                      <span
                        className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 ${
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
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#121215] dark:bg-[#1E1F27] text-[#FAF9FB] text-xs font-bold shadow-xl border border-black/10 dark:border-white/10 whitespace-nowrap">
                        {item.title}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Quick Actions Trigger */}
            <button
              id="btn-dock-quick-actions"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-quick-actions'))}
              title="Quick Actions (Ctrl+K)"
              className="flex items-center justify-between px-2.5 py-2.5 rounded-xl text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200 cursor-pointer w-full group/qa"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Command className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400 group-hover/qa:scale-110 transition-transform" />
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
                  } transition-opacity duration-200 delay-75`}
                >
                  Quick Actions
                </span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-[#7A7C88] dark:text-[#9A9BA6] ${
                  isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
                } transition-opacity duration-200 delay-75 shrink-0`}
              >
                Ctrl K
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Pin Toggle, Theme Switcher & Administrator Profile */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.07] relative">
          {/* Dock Pin / Expand Toggle */}
          <button
            id="btn-dock-pin-toggle"
            type="button"
            onClick={togglePin}
            title={isPinned ? 'Collapse Sidebar (Floating Dock)' : 'Pin Sidebar Expanded'}
            aria-label={isPinned ? 'Collapse Sidebar' : 'Pin Sidebar'}
            className="flex items-center gap-3.5 px-2.5 py-2 rounded-xl text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer w-full overflow-hidden"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isPinned ? (
                <PanelLeftClose className="w-4 h-4 text-[#4D55CC] dark:text-indigo-400" />
              ) : (
                <PanelLeft className="w-4 h-4 text-[#575762]" />
              )}
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
              } transition-opacity duration-200 delay-75`}
            >
              {isPinned ? 'Unpin Sidebar' : 'Pin Expanded'}
            </span>
          </button>

          {/* Theme Switcher Button */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-3.5 px-2.5 py-2 rounded-xl text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer w-full overflow-hidden"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#575762]" />
              )}
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
              } transition-opacity duration-200 delay-75`}
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Profile Avatar & Menu */}
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            title={`${activeProfile.name} (${activeProfile.title})`}
            className="flex items-center gap-3 px-1.5 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer w-full overflow-hidden"
          >
            <div className="w-8 h-8 rounded-full bg-[#EBEAEF] dark:bg-[#343640] border border-black/[0.08] dark:border-white/[0.1] text-[#121215] dark:text-[#F4F4F6] font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
              {activeProfile.initials}
            </div>
            <div
              className={`flex flex-col text-left min-w-0 ${
                isPinned || showProfileMenu ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
              } transition-opacity duration-200 delay-75 whitespace-nowrap`}
            >
              <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6] truncate">
                {activeProfile.name}
              </span>
              <span className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] truncate">
                {activeProfile.title}
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Profile Popover Menu (Rendered outside aside to prevent overflow clipping) */}
      {showProfileMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed left-[246px] md:left-[252px] bottom-5 md:bottom-6 w-56 bg-[#FAF9FB] dark:bg-[#2B2C35] rounded-2xl p-2.5 shadow-2xl border border-black/[0.08] dark:border-white/[0.1] z-50 text-xs animate-in fade-in zoom-in-95 duration-150 select-none">
            <div className="px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.07] mb-1">
              <div className="font-extrabold text-xs text-[#121215] dark:text-[#F4F4F6]">
                {activeProfile.name}
              </div>
              <div className="text-[10px] text-[#8E8D9A] dark:text-[#7A7C88] font-medium truncate">
                {activeProfile.title}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setShowPasswordModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer font-medium"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#8E8D9A]" />
              <span>Change Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setShowLogoutModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}

      {/* Change Password Dialog */}
      <ModalDialog
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Change ${activeProfile.title} Password`}
        subtitle="Update your administrative credentials."
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-[#FAF9FB] dark:bg-[#343640] text-xs text-[#121215] dark:text-[#F4F4F6] focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] shadow-xs disabled:opacity-50 transition-opacity flex items-center gap-1.5"
            >
              {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save New Password</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Logout Confirmation Dialog */}
      <ModalDialog
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Sign Out"
        subtitle={`Are you sure you want to end your ${activeProfile.title} session?`}
      >
        <div className="pt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setShowLogoutModal(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#575762] dark:text-[#B0B2BD] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            Stay Logged In
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-[#FAF9FB] shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Sign Out</span>
          </button>
        </div>
      </ModalDialog>
    </>
  )
}
