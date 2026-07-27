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
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<{ full_name: string; role: string; activeRoles: string[]; isOverridden: boolean } | null>(null)
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0)
  const [lowStockCount, setLowStockCount] = useState<number>(0)
  const [ticketsBadge, setTicketsBadge] = useState<{ count: number; isUrgent: boolean }>({ count: 0, isUrgent: false })
  const [loading, setLoading] = useState<boolean>(true)
  const [isQuickBroadcastOpen, setIsQuickBroadcastOpen] = useState(false)



  useEffect(() => {
    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log("Layout auth getUser:", { user, userError })

        if (user) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single()

          console.log("Layout profile fetch:", { data, profileError })

          if (data) {
            let activeRoles = [data.role as string]
            let isOverridden = false

            // Fetch overrides
            const { data: overrides } = await supabase
              .from('role_overrides')
              .select('granted_role')
              .eq('target_user_id', user.id)
              .gt('expires_at', new Date().toISOString())

            if (overrides && overrides.length > 0) {
              const granted = overrides.map(o => o.granted_role)
              activeRoles = [...activeRoles, ...granted]
              isOverridden = true
            }

            setProfile({ ...data, activeRoles, isOverridden })

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
          }
        }
      } catch (e) {
        console.error("Error loading user profile:", e)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [])


  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/live-map', label: 'Live Map', icon: Map },
    { href: '/dashboard/employees', label: 'Employees', icon: Users },
    { href: '/dashboard/schedules', label: 'Schedules', icon: Calendar },
    { href: '/dashboard/attendance', label: 'Attendance', icon: Clock },
    { href: '/dashboard/leaves', label: 'Leaves', icon: ClipboardList },
    { href: '/dashboard/payroll', label: 'Payroll', icon: DollarSign },
    { href: '/dashboard/tickets', label: 'Tickets', icon: MessageSquare },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
    { href: '/dashboard/broadcaster', label: 'Broadcaster', icon: Megaphone },
      { href: '/dashboard/warnings', label: 'Warnings', icon: ShieldAlert },
      { href: '/dashboard/app-management', label: 'App Distribution', icon: Smartphone },
    { href: '/dashboard/ceo-overrides', label: 'CEO Overrides', icon: Shield },
  ]

  const getActiveModule = (path: string) => {
    if (path === '/dashboard') return 'overview'
    if (path.startsWith('/dashboard/live-map')) return 'overview'
    if (path.startsWith('/dashboard/employees')) return 'employees'
    if (path.startsWith('/dashboard/schedules')) return 'schedules'
    if (path.startsWith('/dashboard/attendance')) return 'attendance'
    if (path.startsWith('/dashboard/leaves')) return 'leaves'
    if (path.startsWith('/dashboard/payroll')) return 'payroll'
    if (path.startsWith('/dashboard/tickets')) return 'tickets'
    if (path.startsWith('/dashboard/inventory')) return 'inventory'
      if (path.startsWith('/dashboard/broadcaster')) return 'broadcaster'
    if (path.startsWith('/dashboard/ceo-overrides')) return 'ceo_overrides'
      if (path.startsWith('/dashboard/warnings')) return 'warnings'
      if (path.startsWith('/dashboard/app-management')) return 'app_management'
    if (path.startsWith('/dashboard/settings')) return 'settings'
    return null
  }

  const activeModule = getActiveModule(pathname)
  
  // Guard logic: if not loading and user is logged in, check permission
  const isAuthorized = loading || !profile || !activeModule || 
    (profile.activeRoles.some(r => MODULE_ROLES[activeModule]?.includes(r as UserRole) || r === activeModule))

  const allowedNavItems = navItems.map((item) => {
    const moduleName = getActiveModule(item.href) || 'overview'
    if (loading || !profile) return { ...item, isBorrowed: false }
    
    const baseAccess = MODULE_ROLES[moduleName]?.includes(profile.role as UserRole)
    const overrideAccess = profile.activeRoles.some(r => MODULE_ROLES[moduleName]?.includes(r as UserRole) || r === moduleName)
    
    if (!overrideAccess) return null
    
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

  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

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
          
          {loading ? (
            // Sidebar item loading skeleton to avoid layout shifts
            <div className="space-y-3 px-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-md animate-pulse w-full"></div>
              ))}
            </div>
          ) : (
            allowedNavItems.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              const isLeavesTab = item.href === '/dashboard/leaves'
              const isInventoryTab = item.href === '/dashboard/inventory'
              const isTicketsTab = item.href === '/dashboard/tickets'
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
          )}
          
          {(!loading && (!profile || MODULE_ROLES['settings']?.includes(profile.role as UserRole))) && (
            <>
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">System</p>
              
              <Link
                href="/dashboard/settings"
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
                  settingsActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                }`}
              >
                <Settings className={`w-5 h-5 transition-colors ${settingsActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                Settings
              </Link>
            </>
          )}
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
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-end px-8 z-10 shadow-sm">
          {/* Profile Section */}
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsQuickBroadcastOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 shadow-sm transition-colors cursor-pointer"
             >
               <Megaphone className="w-4 h-4" />
             </button>

             <div className="text-right hidden md:block">
               <div className="flex items-center gap-2">
                 <p className="text-sm font-bold text-zinc-900">{profile ? profile.full_name : "Loading..."}</p>
                 {profile && (
                   <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-extrabold uppercase tracking-wider ${
                     getRoleBadgeStyle(profile.role)
                   }`}>
                     {formatRole(profile.role)}
                   </span>
                 )}
               </div>
               <p className="text-[10px] text-zinc-500 font-medium mt-0.5">System Access</p>
             </div>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold shadow-md ring-2 ring-white ${
               profile?.role === "super_admin" ? "bg-gradient-to-tr from-purple-600 to-indigo-600" : "bg-gradient-to-tr from-emerald-500 to-cyan-500"
             }`}>
               {profile ? profile.full_name.charAt(0).toUpperCase() : "A"}
             </div>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="min-h-full flex items-center justify-center bg-slate-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
          ) : !isAuthorized ? (
            // Premium Access Denied glassmorphic card view
            <div className="min-h-full flex items-center justify-center p-8 bg-slate-50">
              <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center backdrop-blur-md bg-white/90 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-6 border border-rose-100 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
                <p className="mt-3 text-slate-500 text-sm leading-relaxed font-medium">
                  Your role as <span className="font-bold text-slate-700 capitalize">{(profile?.role || '').replace('_', ' ')}</span> does not have permissions to access the <span className="font-bold text-slate-700 capitalize">{activeModule}</span> module.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Authorization</p>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {activeModule && MODULE_ROLES[activeModule]?.map((r) => (
                      <span key={r} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        {r.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-8">
                  <Link href="/dashboard" className="inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]">
                    Return to Command Center
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
      </div>
      <QuickBroadcastDrawer isOpen={isQuickBroadcastOpen} onClose={() => setIsQuickBroadcastOpen(false)} />
    </AlertConfirmProvider>
  )
}

