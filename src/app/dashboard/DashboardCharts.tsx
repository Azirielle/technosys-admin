"use client"
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CheckCircle2, AlertCircle, FileText, Fingerprint, Loader2, Users, Calendar, ClipboardList, DollarSign, MessageSquare, Package, Settings, HelpCircle } from 'lucide-react'
import { simulateBiometricScan } from '@/app/actions/employees'
import Link from 'next/link'

export default function DashboardCharts({ 
  payslips, 
  recentTechnicians, 
  allTechnicians = [],
  recentActivities = []
}: { 
  payslips: any[]
  recentTechnicians: any[]
  allTechnicians?: any[] 
  recentActivities?: any[]
}) {
  const [selectedTechId, setSelectedTechId] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<{ success?: boolean; error?: string } | null>(null)

  // Process payslips for the chart
  const chartData = payslips.map(p => ({
    name: p.technician?.full_name?.split(' ')[0] || 'Unknown',
    netPay: Number(p.net_pay) || 0,
    gross: Number(p.gross_pay) || 0
  })).slice(0, 7);

  const handleSimulateScan = async () => {
    if (!selectedTechId) return
    setSimulating(true)
    setSimResult(null)
    try {
      const res = await simulateBiometricScan(selectedTechId)
      if (res.error) {
        setSimResult({ error: res.error })
      } else {
        setSimResult({ success: true })
      }
    } catch (e: any) {
      setSimResult({ error: e.message || 'Simulated scan failed' })
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-6">
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
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-900 mb-6 text-lg tracking-tight flex items-center justify-between">
            <Link href="/dashboard/activity" className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
              <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity
            </Link>
            <Link href="/dashboard/activity" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors font-medium">
              View All →
            </Link>
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {recentActivities.map((log: any, i: number) => {
              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case 'employee': return { icon: Users, bg: 'bg-cyan-50 border-cyan-100 text-cyan-600' }
                  case 'schedule': return { icon: Calendar, bg: 'bg-indigo-50 border-indigo-100 text-indigo-600' }
                  case 'leave': return { icon: ClipboardList, bg: 'bg-rose-50 border-rose-100 text-rose-600' }
                  case 'payroll': return { icon: DollarSign, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' }
                  case 'ticket': return { icon: MessageSquare, bg: 'bg-amber-50 border-amber-100 text-amber-600' }
                  case 'inventory': return { icon: Package, bg: 'bg-blue-50 border-blue-100 text-blue-600' }
                  case 'settings': return { icon: Settings, bg: 'bg-slate-50 border-slate-100 text-slate-600' }
                  default: return { icon: HelpCircle, bg: 'bg-zinc-50 border-zinc-100 text-zinc-600' }
                }
              }
              const { icon: Icon, bg } = getCategoryIcon(log.target_category)
              return (
                <div key={log.id || i} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{log.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                      <span>{log.actor?.full_name || 'System'}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              )
            })}

            {recentActivities.length === 0 && (
               <p className="text-sm text-slate-500 italic">No recent activity logs available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Physical Biometric Terminal Simulation Panel */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg tracking-tight flex items-center gap-2 mb-2">
          <Fingerprint className="w-5 h-5 text-emerald-500" /> Physical Biometrics Terminal Simulator (Office Hardware)
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          This panel simulates physical wall-mounted biometric fingerprint scan devices at company offices (e.g. Pacita, Makati). Tapping Clock-In/Out on mobile prompts the technician to present a physical fingerprint scan. Use this tool to simulate matching physical swipes in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Employee to Scan Finger</label>
            <select
              value={selectedTechId}
              onChange={(e) => {
                setSelectedTechId(e.target.value)
                setSimResult(null)
              }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">-- Choose Employee --</option>
              {allTechnicians.map((t: any) => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.role})</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSimulateScan}
            disabled={simulating || !selectedTechId}
            className="w-full sm:w-auto px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
          >
            {simulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Swiping Daliri...
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" /> Simulate Fingerprint Scan
              </>
            )}
          </button>
        </div>

        {simResult && (
          <div className="mt-4 animate-in fade-in slide-in-from-top duration-300">
            {simResult.success ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simulated fingerprint swipe registered! Mobile device listening on WebSockets/fallback will automatically complete clocking.</span>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Trigger Failed: {simResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
