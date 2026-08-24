"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertConfirmProvider } from '@/components/ui/AlertConfirmProvider'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, Clock, DollarSign, Settings, LogOut, MessageSquare, Package, ClipboardList, ShieldAlert, Shield, Map, Megaphone, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MODULE_ROLES, type UserRole } from '@/lib/permissions-client'
import GlobalRealtimeSync from '@/components/GlobalRealtimeSync'
import { QuickBroadcastDrawer } from '@/components/broadcaster/QuickBroadcastDrawer'
import type { UserProfile } from '@/lib/supabase/server-auth'

export default function DashboardClientShell({ children, profile }: { children: React.ReactNode, profile: UserProfile }) {
  const pathname = usePathname()
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0)
  const [lowStockCount, setLowStockCount] = useState<number>(0)
  const [ticketsBadge, setTicketsBadge] = useState<{ count: number; isUrgent: boolean }>({ count: 0, isUrgent: false })
  const [isQuickBroadcastOpen, setIsQuickBroadcastOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    async function loadRealtimeBadges() {
      try {
        const activeRoles = profile.activeRoles;
        // Check if ANY active role has access to leaves
            const hasLeavesAccess = activeRoles.some(r => MODULE_ROLES['leaves']?.includes(r as UserRole))
            if (hasLeavesAccess) {
              const fetchPendingLeavesCount = async () => {
                const { count, error } = await supabase
                  .from('leaves')
                  .select('*', { count: 'exact', head: true })
                  .eq('status', 'pending')
                if (!error && count !== null) setPendingLeavesCount(count)
              }
              fetchPendingLeavesCount()

              const leavesChannel = supabase
                .channel(`leaves-pending-changes-${Math.random().toString(36).substring(7)}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, fetchPendingLeavesCount)
                .subscribe()
              channels.push(leavesChannel)
            }

            // --- Role-gated: Low Stock Inventory badge ---
            const hasInventoryAccess = activeRoles.some(r => MODULE_ROLES['inventory']?.includes(r as UserRole))
            if (hasInventoryAccess) {
              const fetchLowStockCount = async () => {
                const { data: items, error } = await supabase
                  .from('inventory_items')
                  .select('id, available_qty, total_qty')
                if (!error && items) {
                  const count = items.filter((item: any) => item.available_qty <= (item.total_qty * 0.2)).length
                  setLowStockCount(count)
                }
              }
              fetchLowStockCount()

              const inventoryChannel = supabase
                .channel(`inventory-stock-changes-${Math.random().toString(36).substring(7)}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, fetchLowStockCount)
                .subscribe()
              channels.push(inventoryChannel)
            }

            // --- Role-gated: Tickets badge count (Option A: Urgent Highlight) ---
            const hasTicketsAccess = activeRoles.some(r => MODULE_ROLES['tickets']?.includes(r as UserRole))
            if (hasTicketsAccess) {
              const fetchTicketsCount = async () => {
                const { data: activeTickets, error } = await supabase
                  .from('tickets')
                  .select('id, priority, status')
                  .in('status', ['open', 'assigned', 'in_progress'])
                if (!error && activeTickets) {
                  const urgentTickets = activeTickets.filter((t: any) => t.priority === 'urgent')
                  if (urgentTickets.length > 0) {
                    setTicketsBadge({ count: urgentTickets.length, isUrgent: true })
                  } else {
                    setTicketsBadge({ count: activeTickets.length, isUrgent: false })
                  }
                }
              }
              fetchTicketsCount()

              const ticketsChannel = supabase
                .channel(`tickets-badge-changes-${Math.random().toString(36).substring(7)}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTicketsCount)
                .subscribe()
              channels.push(ticketsChannel)
            }
      } catch (e) {
        console.error("Error loading badges:", e)
      }
    }

    loadRealtimeBadges()

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [profile])


  const navItems = [
    { href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, exact: true, module: 'overview' },
    { href: '/dashboard/field-ops', label: 'Field Ops', icon: Map, module: 'schedules' },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { href: '/dashboard/comms', label: 'Comms Hub', icon: MessageSquare, module: 'tickets' },
    { href: '/dashboard/workforce', label: 'Workforce', icon: Users, module: 'employees' },
    { href: '/dashboard/system', label: 'System', icon: Settings, module: 'settings' },
  ]

  const getPillarModules = (path: string): string[] => {
    if (path === '/dashboard') return ['overview']
    if (path.startsWith('/dashboard/field-ops')) return ['schedules']
    if (path.startsWith('/dashboard/inventory')) return ['inventory']
    if (path.startsWith('/dashboard/comms')) return ['tickets', 'warnings', 'broadcaster']
    if (path.startsWith('/dashboard/workforce')) return ['employees', 'attendance', 'leaves']
    if (path.startsWith('/dashboard/system')) return ['ceo_overrides', 'settings']
    return []
  }

  // Root Layout no longer blocks unauthorized pillars, the pillar Layout Server Component handles it.
  // The client shell just highlights active modules.
  const activePillarModules = getPillarModules(pathname)

  const allowedNavItems = navItems.map((item) => {
    const pillarModules = getPillarModules(item.href)
    
    // Check if user has base access to ANY module in this pillar
    const baseAccess = pillarModules.some(mod => MODULE_ROLES[mod]?.includes(profile.role as UserRole))
    // Check if user has override access to ANY module in this pillar
    const overrideAccess = pillarModules.some(mod => profile.activeRoles.some(r => MODULE_ROLES[mod]?.includes(r as UserRole) || r === mod))
    
    if (!overrideAccess && !baseAccess) return null
    
    return {
      ...item,
      isBorrowed: !baseAccess && overrideAccess
    }
  }).filter(Boolean) as (typeof navItems[0] & { isBorrowed: boolean })[]

  const isActive = (item: typeof allowedNavItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-indigo-50 border-indigo-100 text-indigo-700'
      case 'ceo':
      case 'coo':
      case 'svp':
      case 'admin':
        return 'bg-purple-50 border-purple-100 text-purple-700'
      case 'hr':
        return 'bg-teal-50 border-teal-100 text-teal-700'
      case 'accountant':
        return 'bg-rose-50 border-rose-100 text-rose-700'
      case 'coordinator':
        return 'bg-amber-50 border-amber-100 text-amber-700'
      case 'branch_manager':
      case 'supervisor':
        return 'bg-blue-50 border-blue-100 text-blue-700'
      default:
        return 'bg-zinc-50 border-zinc-100 text-zinc-700'
    }
  }



  return (
    <AlertConfirmProvider>
      <GlobalRealtimeSync />
      <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Premium Light Sidebar */}
      <aside className="w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col z-20">
        <div className="py-4 flex items-center px-6 border-b border-slate-100 justify-center">
          <img src="/logo.png" alt="Technocycle" className="h-16 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
          
          {
            allowedNavItems.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              const isLeavesTab = item.href === '/dashboard/workforce'
              const isInventoryTab = item.href === '/dashboard/inventory'
              const isTicketsTab = item.href === '/dashboard/comms'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.isBorrowed && (
                        <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-200">
                          CEO Override
                        </span>
                      )}
                  </div>
                  {isLeavesTab && pendingLeavesCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm min-w-[18px] text-center animate-pulse">
                      {pendingLeavesCount}
                    </span>
                  )}
                  {isInventoryTab && lowStockCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm min-w-[18px] text-center animate-pulse">
                      {lowStockCount}
                    </span>
                  )}
                  {isTicketsTab && ticketsBadge.count > 0 && (
                    <span className={`text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm min-w-[18px] text-center animate-pulse ${
                      ticketsBadge.isUrgent ? 'bg-rose-500' : 'bg-zinc-500'
                    }`}>
                      {ticketsBadge.isUrgent ? `${ticketsBadge.count} Urgent` : ticketsBadge.count}
                    </span>
                  )}
                </Link>
              )
            })
          }
          
          {/* Removed legacy System settings link since it's now in the System pillar */}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-4">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0 ${
                profile.role === "super_admin" ? "bg-gradient-to-tr from-purple-600 to-indigo-600" : "bg-gradient-to-tr from-zinc-700 to-zinc-900"
              }`}>
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{profile.full_name}</p>
                <div className="mt-0.5">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-extrabold uppercase tracking-wider ${
                    getRoleBadgeStyle(profile.role)
                  }`}>
                    {formatRole(profile.role)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <form action="/auth/signout" method="post">
             <button type="submit" className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors group cursor-pointer text-sm">
              <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
      </div>
      <QuickBroadcastDrawer isOpen={isQuickBroadcastOpen} onClose={() => setIsQuickBroadcastOpen(false)} />
    </AlertConfirmProvider>
  )
}

