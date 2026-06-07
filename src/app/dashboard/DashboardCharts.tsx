"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  MessageSquare, 
  Package, 
  ShieldCheck, 
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  } catch (e) {
    return 'Recently'
  }
}

const categoryConfig: Record<string, { icon: any; bg: string; color: string }> = {
  employees: { icon: Users, bg: 'bg-cyan-50', color: 'text-cyan-600' },
  schedules: { icon: Calendar, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  leaves: { icon: ClipboardList, bg: 'bg-amber-50', color: 'text-amber-600' },
  payroll: { icon: DollarSign, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  tickets: { icon: MessageSquare, bg: 'bg-blue-50', color: 'text-blue-600' },
  inventory: { icon: Package, bg: 'bg-purple-50', color: 'text-purple-600' },
  compliance: { icon: ShieldCheck, bg: 'bg-rose-50', color: 'text-rose-600' },
}

function getCategoryStyle(category: string) {
  return categoryConfig[category] || { icon: HelpCircle, bg: 'bg-slate-50', color: 'text-slate-600' }
}

export default function DashboardCharts({ 
  payslips, 
  recentTechnicians,
  recentActivities = []
}: { 
  payslips: any[]
  recentTechnicians: any[]
  recentActivities?: any[]
}) {
  // Process payslips for the chart
  const chartData = payslips.map(p => ({
    name: p.technician?.full_name?.split(' ')[0] || 'Unknown',
    netPay: Number(p.net_pay) || 0,
    gross: Number(p.gross_pay) || 0
  })).slice(0, 7);

  return (
    <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-3">
      
      {/* Chart Section */}
      <div className="lg:col-span-2 p-6 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-800">
        <h3 className="font-bold text-slate-100 mb-6 text-lg tracking-tight">Payroll Distribution</h3>
        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">No payslip data to display yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Bar dataKey="netPay" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Pay" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 text-lg tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Recent Activity
          </h3>
          <Link 
            href="/dashboard/activity" 
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[300px]">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4">No recent activity logged.</p>
          ) : (
            recentActivities.map((log) => {
              const style = getCategoryStyle(log.category)
              const Icon = style.icon
              return (
                <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug break-words">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>by {log.performed_by_name || 'System'}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
