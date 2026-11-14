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
import { Avatar, Button, Field, Input, Modal } from '@/components/ui'
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
 } bg-surface rounded-modal p-3 flex flex-col justify-between shadow-card hover:shadow-raised group/dock transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden select-none`}
      >
        {/* Top Brand Section */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between min-w-0">
            <Link
              href={roleMeta.rootHref}
              title={`${effectivePortalTitle} ${effectivePortalSubtitle}`}
              className="flex items-center gap-3.5 px-0 py-1 rounded-card hover:bg-surface-soft transition-colors overflow-hidden shrink-0 cursor-pointer min-w-0"
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

            {/* Quick Actions Trigger */}
            <button
              id="btn-dock-quick-actions"
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-quick-actions'))}
              title="Quick Actions (Ctrl+K)"
              className="flex items-center justify-between px-2.5 py-2.5 rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors duration-200 cursor-pointer w-full group/qa"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Command className="w-4 h-4" />
                </div>
                <span
                  className={`text-small font-medium whitespace-nowrap ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75`}
                >
                  Quick actions
                </span>
              </div>
              <span
                className={`text-micro font-mono px-1.5 py-0.5 rounded-chip bg-surface-soft text-ink-3 ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75 shrink-0`}
              >
                Ctrl K
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Pin Toggle, Theme Switcher & Administrator Profile */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-line relative">
          {/* Dock Pin / Expand Toggle */}
          <button
            id="btn-dock-pin-toggle"
            type="button"
            onClick={togglePin}
            title={isPinned ? 'Collapse Sidebar (Floating Dock)' : 'Pin Sidebar Expanded'}
            aria-label={isPinned ? 'Collapse Sidebar' : 'Pin Sidebar'}
            className="flex items-center gap-3.5 px-2.5 py-2 rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer w-full overflow-hidden"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isPinned ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </div>
            <span
              className={`text-small font-medium whitespace-nowrap ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75`}
            >
              {isPinned ? 'Collapse menu' : 'Keep menu open'}
            </span>
          </button>

          {/* Theme Switcher Button */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-3.5 px-2.5 py-2 rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer w-full overflow-hidden"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </div>
            <span
              className={`text-small font-medium whitespace-nowrap ${
 isPinned ? 'opacity-100' : 'opacity-0 group-hover/dock:opacity-100'
 } transition-opacity duration-200 delay-75`}
            >
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* Profile Avatar & Menu */}
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
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

      {/* Profile Popover Menu (Rendered outside aside to prevent overflow clipping) */}
      {showProfileMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed left-[246px] md:left-[252px] bottom-5 md:bottom-6 w-56 bg-surface rounded-card p-2 shadow-overlay z-50 text-small animate-in fade-in zoom-in-95 duration-150 select-none">
            <div className="px-3 py-2 border-b border-line mb-1">
              <div className="font-medium text-small text-ink">
                {activeProfile.name}
              </div>
              <div className="text-caption text-ink-3 truncate">
                {activeProfile.title}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setShowPasswordModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-pill text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer font-medium"
            >
              <KeyRound className="w-3.5 h-3.5 text-ink-3" />
              <span>Change password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setShowLogoutModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-pill text-danger hover:bg-danger-soft transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}

      {/* Change password dialog */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change password"
        subtitle="Use at least 8 characters."
        icon={KeyRound}
      >
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-stack">
          {passwordError && (
            <p role="alert" className="flex items-center gap-2 rounded-control bg-danger-soft p-3 text-small text-danger">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="flex items-center gap-2 rounded-control bg-success-soft p-3 text-small text-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Password changed.
            </p>
          )}
          <Field label="New password" htmlFor="new-password">
            <Input id="new-password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Type it again" htmlFor="confirm-password">
            <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="flex justify-end gap-inline pt-2">
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isUpdatingPassword}>Save password</Button>
          </div>
        </form>
      </Modal>

      {/* Sign-out confirmation */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign out?"
        subtitle="You'll need your username and password to come back in."
        icon={LogOut}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogoutModal(false)}>Stay signed in</Button>
            <Button variant="danger" onClick={handleLogout} loading={isLoggingOut}>Sign out</Button>
          </>
        }
      >
        {null}
      </Modal>
    </>
  )
}
