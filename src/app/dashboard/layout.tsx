"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut, MessageSquare, Package, ClipboardList, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('Admin')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single()
          if (profile) {
            setUserRole(profile.role)
            setUserName(profile.full_name || 'Admin')
          }
        }
      } catch (error) {
        console.error('Error loading user role in layout:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
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

  const hasAccess = (itemHref: string) => {
    if (loading) return false
    
    const role = userRole
    const isManagement = ['super_admin', 'admin', 'ceo', 'coo'].includes(role)
    
    if (itemHref === '/dashboard') {
      return isManagement || ['svp', 'branch_manager', 'supervisor', 'coordinator'].includes(role)
    }
    if (itemHref === '/dashboard/employees') {
      return isManagement || ['svp', 'branch_manager', 'supervisor', 'coordinator', 'hr'].includes(role)
    }
    if (itemHref === '/dashboard/schedules') {
      return isManagement || ['svp', 'branch_manager', 'supervisor', 'coordinator'].includes(role)
    }
    if (itemHref === '/dashboard/leaves') {
      return isManagement || ['hr'].includes(role)
    }
    if (itemHref === '/dashboard/payroll') {
      return isManagement || ['accountant'].includes(role)
    }
    if (itemHref === '/dashboard/tickets') {
      return isManagement || ['svp', 'branch_manager', 'supervisor', 'coordinator', 'hr', 'accountant'].includes(role)
    }
    if (itemHref === '/dashboard/inventory') {
      return isManagement || ['svp', 'branch_manager', 'supervisor', 'coordinator'].includes(role)
    }
    if (itemHref === '/dashboard/settings') {
      return ['super_admin', 'ceo', 'coo'].includes(role)
    }
    return false
  }

  const filteredNavItems = navItems.filter(item => hasAccess(item.href))
  const canAccessSettings = hasAccess('/dashboard/settings')

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Premium Light Sidebar */}
      <aside className="w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col z-20">
        <div className="py-6 flex items-center px-6 border-b border-slate-100 justify-center">
          <img src="/logo.png" alt="Technocycle" className="h-28 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {filteredNavItems.map((item) => {
                const active = isActive(item)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
                      active
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                    {item.label}
                  </Link>
                )
              })}
              
              {canAccessSettings && (
                <>
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
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <form action="/auth/signout" method="post">
             <button type="submit" className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors group cursor-pointer">
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
               <p className="text-sm font-medium text-zinc-900">{userName}</p>
               <p className="text-xs text-zinc-500 capitalize">{userRole ? userRole.replace('_', ' ') : 'System Access'}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white select-none">
               {userName.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto bg-zinc-50/50">
          {children}
        </div>
      </main>
    </div>
  )
}
