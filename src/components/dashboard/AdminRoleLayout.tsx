// AdminRoleLayout: the app frame for CEO, HR and Coordinator pages (dock on the left, page on the right).
'use client'

import React, { useState, useEffect } from 'react'
import { AdminDock, NavItem, AdminRole } from './AdminDock'
import { AdminQuickActionsModal } from './AdminQuickActionsModal'

export interface AdminRoleLayoutProps {
  role: AdminRole
  navItems: NavItem[]
  portalTitle?: string
  portalSubtitle?: string
  userName?: string
  userRoleTitle?: string
  userInitials?: string
  children: React.ReactNode
}

export function AdminRoleLayout({
  role,
  navItems,
  portalTitle,
  portalSubtitle,
  userName,
  userRoleTitle,
  userInitials,
  children,
}: AdminRoleLayoutProps) {
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg p-4 md:p-5 gap-4 transition-colors duration-250 relative">
      {/* 1. Reserved spacer for floating capsule dock (smoothly accommodates pinned vs collapsed dock) */}
      <div
        className={`${
 isPinned ? 'w-[230px]' : 'w-[64px]'
 } h-full shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
      />

      {/* 2. Floating Expandable Capsule Dock (Smooth width expansion on hover or pinned) */}
      <AdminDock
        role={role}
        navItems={navItems}
        portalTitle={portalTitle}
        portalSubtitle={portalSubtitle}
        userName={userName}
        userRoleTitle={userRoleTitle}
        initials={userInitials}
      />

      {/* 3. Main Executive Porcelain Shell Container */}
      <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col">
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </div>

      {/* 4. Global Role Quick Actions & Keyboard Shortcuts Palette */}
      <AdminQuickActionsModal role={role} />
    </div>
  )
}
export default AdminRoleLayout
