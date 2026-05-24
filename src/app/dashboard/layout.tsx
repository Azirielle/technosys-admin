import Link from 'next/link'
import { LayoutDashboard, Users, Calendar, DollarSign, Settings, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Premium Light Sidebar */}
      <aside className="w-64 bg-white text-slate-900 border-r border-slate-200 flex flex-col z-20">
        <div className="py-6 flex items-center px-6 border-b border-slate-100 justify-center">
          <img src="/logo.png" alt="Technocycle" className="h-28 w-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
          
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md bg-emerald-50 text-emerald-700 font-medium">
            <LayoutDashboard className="w-5 h-5" /> Overview
          </Link>
          <Link href="/dashboard/employees" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-50 transition-colors group">
            <Users className="w-5 h-5 group-hover:text-emerald-600 transition-colors" /> Employees
          </Link>
          <Link href="/dashboard/schedules" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-50 transition-colors group">
            <Calendar className="w-5 h-5 group-hover:text-emerald-600 transition-colors" /> Schedules
          </Link>
          <Link href="/dashboard/payroll" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-50 transition-colors group">
            <DollarSign className="w-5 h-5 group-hover:text-emerald-600 transition-colors" /> Payroll
          </Link>
          
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">System</p>
          
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-slate-50 transition-colors">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <form action="/auth/signout" method="post">
             <button type="submit" className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-end px-8 z-10 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
               <p className="text-sm font-medium text-zinc-900">Administrator</p>
               <p className="text-xs text-zinc-500">System Access</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
               A
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
