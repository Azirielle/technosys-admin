'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  LucideIcon,
  UserCircle,
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
} from 'lucide-react'
import { logout } from '@/app/actions'
import { getSystemOverrides, getModuleHref, SYSTEM_MODULES, RoleKey } from '@/lib/overrides'

export type NavItem = {
  title: string
  href: string
  icon?: LucideIcon
  iconName?: string
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
}

export function Sidebar({ navItems, title, role }: SidebarProps) {
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
          // Avoid duplicate if it's already in base navItems
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

    // Listen for real-time override updates
    window.addEventListener('system_overrides_updated', updateNavWithOverrides)
    window.addEventListener('storage', updateNavWithOverrides)

    return () => {
      window.removeEventListener('system_overrides_updated', updateNavWithOverrides)
      window.removeEventListener('storage', updateNavWithOverrides)
    }
  }, [navItems, role])

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">TechnoSys Admin</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {effectiveItems.map((item) => {
          const Icon = item.icon || (item.iconName ? ICON_MAP[item.iconName] : undefined) || ShieldAlert
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                item.isOverride 
                  ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/50 hover:bg-indigo-900/80' 
                  : 'hover:bg-gray-800 text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-5 h-5 shrink-0 ${item.isOverride ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span className="truncate">{item.title}</span>
              </div>
              {item.isOverride && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Override
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* Profile & Logout Section */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-4">
          <UserCircle className="w-8 h-8 text-gray-400 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-white truncate">Admin User</span>
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>
        <button 
          type="button" 
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center w-full gap-3 px-2 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Logout
        </button>
      </div>

      {/* Logout Confirmation Modal rendered at document.body via Portal */}
      {showLogoutModal && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-scale-in">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <LogOut className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Confirm Logout?</h3>
                <p className="text-xs text-gray-500 mt-1.5 font-medium leading-relaxed">
                  Are you sure you want to log out of TechnoSys Admin?
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={executeLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {isLoggingOut ? 'Logging out...' : 'Yes, Logout'}
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
