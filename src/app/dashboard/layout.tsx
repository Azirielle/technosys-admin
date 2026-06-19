"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, MessageSquare, Package, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0)
  const [lowStockCount, setLowStockCount] = useState<number>(0)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single()
          
          if (data) {
            setProfile(data)
          }
        }
      } catch (e) {
        console.error("Error loading user profile:", e)
      }
    }
    loadProfile()

    // Setup pending leaves count loading
    const supabase = createClient()

    const fetchPendingLeavesCount = async () => {
      const { count, error } = await supabase
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingLeavesCount(count)
      }
    }

    const fetchLowStockCount = async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, quantity, low_stock_threshold')

      if (!error && data) {
        const count = data.filter((item: any) => item.quantity <= item.low_stock_threshold).length
        setLowStockCount(count)
      }
    }

    fetchPendingLeavesCount()
    fetchLowStockCount()

    // Realtime channel subscriptions to update the badge counts automatically
    const leavesChannel = supabase
      .channel('leaves-pending-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          fetchPendingLeavesCount()
        }
      )
      .subscribe()

    const inventoryChannel = supabase
      .channel('inventory-stock-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          fetchLowStockCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(leavesChannel)
      supabase.removeChannel(inventoryChannel)
    }
  }, [])

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/employees', label: 'Employees', icon: Users },
    { href: '/dashboard/schedules', label: 'Schedules', icon: Calendar },
    { href: '/dashboard/leaves', label: 'Leaves', icon: ClipboardList },
    { href: '/dashboard/payroll', label: 'Payroll', icon: DollarSign },
    { href: '/dashboard/tickets', label: 'Tickets', icon: MessageSquare },
    { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  ]

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Premium Light Sidebar */}
      <aside className="w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col z-20">
        <div className="py-6 flex items-center px-6 border-b border-slate-100 justify-center">
          <img src="/logo.png" alt="Technocycle" className="h-28 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
          
          {navItems.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            const isLeavesTab = item.href === '/dashboard/leaves'
            const isInventoryTab = item.href === '/dashboard/inventory'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-colors ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                  <span>{item.label}</span>
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
              </Link>
            )
          })}
          
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">System</p>
          
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
              settingsActive
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            <Settings className={`w-5 h-5 transition-colors ${settingsActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
            Settings
          </Link>
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
                    profile.role === "super_admin" 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                      : "bg-zinc-100 border-zinc-200 text-zinc-600"
                  }`}>
                    {profile.role === "super_admin" ? "Super Admin" : "Admin"}
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
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
               <div className="flex items-center gap-2">
                 <p className="text-sm font-bold text-zinc-900">{profile ? profile.full_name : "Loading..."}</p>
                 {profile && (
                   <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-extrabold uppercase tracking-wider ${
                     profile.role === "super_admin" 
                       ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                       : "bg-zinc-100 border-zinc-200 text-zinc-600"
                   }`}>
                     {profile.role === "super_admin" ? "Super Admin" : "Admin"}
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
          {children}
        </div>
      </main>
    </div>
  )
}
