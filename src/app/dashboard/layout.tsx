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

    fetchPendingLeavesCount()

    // Realtime channel subscription to update the badge count automatically
    const channel = supabase
      .channel('leaves-pending-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          fetchPendingLeavesCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Soft Structuralism Sidebar */}
      <aside className="w-66 bg-white text-slate-900 border-r border-slate-100 flex flex-col z-20 shadow-[1px_0_10px_rgba(0,0,0,0.01)]">
        <div className="py-8 flex items-center px-6 justify-center">
          <img src="/logo.png" alt="Technocycle" className="h-20 w-auto object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.02)]" />
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 mt-2">Menu</p>
          
          {navItems.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            const isLeavesTab = item.href === '/dashboard/leaves'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-spring group ${
                  active
                    ? 'bg-emerald-500/8 text-emerald-800 font-bold ring-1 ring-emerald-500/10 shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 hover:translate-x-0.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 transition-colors duration-300 ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                  <span className="text-sm tracking-tight">{item.label}</span>
                </div>
                {isLeavesTab && pendingLeavesCount > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md shadow-rose-500/10 animate-pulse">
                    {pendingLeavesCount}
                  </span>
                )}
              </Link>
            )
          })}
          
          <p className="px-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 mt-6">System</p>
          
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-spring group ${
              settingsActive
                ? 'bg-emerald-500/8 text-emerald-800 font-bold ring-1 ring-emerald-500/10 shadow-[inset_0_1px_1px_rgba(16,185,129,0.05)]'
                : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50 hover:translate-x-0.5'
            }`}
          >
            <Settings className={`w-4.5 h-4.5 transition-colors duration-300 ${settingsActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
            <span className="text-sm tracking-tight">Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-3.5">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200/50 shadow-ambient-soft rounded-xl">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-md shrink-0 ring-1 ring-white ${
                profile.role === "super_admin" 
                  ? "bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-indigo-500/20" 
                  : "bg-gradient-to-tr from-emerald-500 via-emerald-600 to-cyan-500 shadow-emerald-500/20"
              }`}>
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{profile.full_name}</p>
                <div className="mt-1">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${
                    profile.role === "super_admin" 
                      ? "bg-purple-50 border-purple-100 text-purple-700" 
                      : "bg-emerald-50 border-emerald-100 text-emerald-700"
                  }`}>
                    {profile.role === "super_admin" ? "Super Admin" : "Admin"}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 transition-spring group cursor-pointer text-sm font-medium">
              <LogOut className="w-4.5 h-4.5 text-slate-400 group-hover:text-rose-600 transition-colors" /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-100 flex items-center justify-end px-8 z-10 shadow-ambient-soft transition-spring">
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
               <div className="flex items-center gap-2">
                 <p className="text-sm font-bold text-slate-800">{profile ? profile.full_name : "Loading..."}</p>
                 {profile && (
                   <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${
                     profile.role === "super_admin" 
                       ? "bg-purple-50 border-purple-100 text-purple-700" 
                       : "bg-emerald-50 border-emerald-100 text-emerald-700"
                   }`}>
                     {profile.role === "super_admin" ? "Super Admin" : "Admin"}
                   </span>
                 )}
               </div>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">System Access</p>
             </div>
             <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shrink-0 ring-1 ring-white ${
               profile?.role === "super_admin" 
                 ? "bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-indigo-500/20" 
                 : "bg-gradient-to-tr from-emerald-500 via-emerald-600 to-cyan-500 shadow-emerald-500/20"
             }`}>
               {profile ? profile.full_name.charAt(0).toUpperCase() : "A"}
             </div>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto bg-[#f8fafc]">
          {children}
        </div>
      </main>
    </div>
  )
}
