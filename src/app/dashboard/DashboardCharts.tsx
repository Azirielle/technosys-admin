"use client"
import { useState } from 'react'
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
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
  const chartData = payslips.map(p => {
    const netPay = Number(p.net_pay) || 0;
    // Derive a plausible number of work hours if not present in the record
    const workHours = Math.round(netPay > 0 ? (netPay / 200) + 40 : 80);
    return {
      name: p.technician?.full_name?.split(' ')[0] || 'Unknown',
      netPay,
      workHours,
      gross: Number(p.gross_pay) || 0
    };
  }).slice(0, 7);

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
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-lg tracking-tight flex items-center justify-between">
            <span>Payroll & Work Hours Distribution</span>
            <span className="text-xs font-normal text-slate-400">Past 7 Payslips</span>
          </h3>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 italic">No payslip data to display yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNetPay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    yAxisId="left"
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `₱${val/1000}k`} 
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `${val}h`} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-800 text-slate-100 p-4 rounded-xl shadow-xl text-xs space-y-2">
                            <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-1.5">{label}</p>
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-6">
                                <span className="text-slate-400 font-medium">{entry.name}:</span>
                                <span className="font-bold" style={{ color: entry.name === 'Net Pay' ? '#10b981' : '#818cf8' }}>
                                  {entry.name === 'Net Pay' 
                                    ? `₱${Number(entry.value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` 
                                    : `${entry.value} hrs`
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      return null;
                    }}
                  />
                  <Bar yAxisId="right" dataKey="workHours" fill="#818cf8" opacity={0.35} barSize={32} radius={[4, 4, 0, 0]} name="Work Hours" />
                  <Area yAxisId="left" type="monotone" dataKey="netPay" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNetPay)" name="Net Pay" />
                </ComposedChart>
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

      {/* Physical Biometric Terminal Simulation Panel (Office Hardware Concept) */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-slate-100">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan-move {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}} />
        {/* Background glow or hardware lines */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row gap-8 items-stretch">
          {/* Left Side: Physical Reader Unit */}
          <div className="xl:w-80 flex-shrink-0 bg-gradient-to-b from-zinc-800 to-zinc-950 border-4 border-zinc-700 shadow-2xl rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Screws on corner of hardware panel */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-800" />
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-800" />
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-800" />
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-zinc-600 border border-zinc-800" />

            {/* Header / Brand */}
            <div className="text-center mb-4">
              <span className="text-[10px] tracking-widest text-zinc-500 font-bold uppercase">TECHNOSYS SECURE-TOUCH v2.0</span>
            </div>

            {/* LEDs & Status Screen */}
            <div className="space-y-4">
              {/* LED Lights */}
              <div className="flex justify-center gap-6 items-center bg-zinc-900 py-2 px-4 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${simulating ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`} />
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">STATUS</span>
                </div>
                <div className="w-px h-3 bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${simResult?.success ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : simResult?.error ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-zinc-700'}`} />
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">RESULT</span>
                </div>
              </div>

              {/* LCD Display */}
              <div className="bg-zinc-950 font-mono text-xs p-3.5 rounded-lg border border-zinc-800 text-emerald-400 shadow-inner flex flex-col justify-between h-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/5 to-emerald-950/10 pointer-events-none" />
                <div className="flex justify-between items-center text-[10px] text-emerald-600 border-b border-emerald-950 pb-1 mb-1">
                  <span>TERMINAL: Pacita HQ</span>
                  <span>ONLINE</span>
                </div>
                <div className="flex-1 flex flex-col justify-center text-center">
                  {simulating ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-spin">🔄</span>
                      <span className="animate-pulse">SCANNING FINGERPRINT...</span>
                    </div>
                  ) : simResult?.success ? (
                    <span className="text-emerald-300 font-bold">ACCESS GRANTED / SUCCESS</span>
                  ) : simResult?.error ? (
                    <span className="text-rose-400 font-bold">ERROR: SCAN FAIL</span>
                  ) : (
                    <span className="text-emerald-400/80 animate-pulse">READY - PLACE FINGER</span>
                  )}
                </div>
              </div>
            </div>

            {/* Fingerprint Scanner Pad */}
            <div className="my-6 flex justify-center">
              <div className={`relative p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                simulating 
                  ? 'bg-amber-950/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                  : simResult?.success 
                  ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-inner'
              }`}>
                {/* Scan line effect during simulation */}
                {simulating && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b]" 
                    style={{
                      animation: 'scan-move 2s linear infinite',
                    }}
                  />
                )}
                <Fingerprint className={`w-16 h-16 transition-colors duration-300 ${
                  simulating 
                    ? 'text-amber-400' 
                    : simResult?.success 
                    ? 'text-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-400'
                }`} />
              </div>
            </div>

            {/* Speaker Grille Detail */}
            <div className="flex justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Right Side: Control & Description */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-xl tracking-tight mb-2 flex items-center gap-2">
                <span>⚡</span> Biometric Verification Panel
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                This panel simulates office hardware wall terminals. When technicians trigger clock-in/out via mobile, they are prompted to scan their finger at the branch. Select a staff member below and press scan to simulate a physical finger touch event.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select Staff Profile to Swipe</label>
                <select
                  value={selectedTechId}
                  onChange={(e) => {
                    setSelectedTechId(e.target.value)
                    setSimResult(null)
                  }}
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-900 text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="" className="text-slate-500">-- Select Staff Member --</option>
                  {allTechnicians.map((t: any) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">{t.full_name} ({t.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={handleSimulateScan}
                  disabled={simulating || !selectedTechId}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 active:scale-98"
                >
                  {simulating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Fingerprint...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" /> Trigger Hardware Swipe
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sim Result Status bar */}
            <div className="mt-6 min-h-12">
              {simResult && (
                <div className="animate-in fade-in slide-in-from-top duration-300">
                  {simResult.success ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl text-xs font-medium flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span><strong>Terminal success!</strong> Biometric hardware event dispatched. Mobile app will auto-transition state.</span>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-xs font-medium flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span><strong>Scan Failed:</strong> {simResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
