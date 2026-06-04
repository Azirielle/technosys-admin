"use client"
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CheckCircle2, AlertCircle, FileText, Fingerprint, Loader2 } from 'lucide-react'
import { simulateBiometricScan } from '@/app/actions/employees'

export default function DashboardCharts({ 
  payslips, 
  recentTechnicians, 
  allTechnicians = [] 
}: { 
  payslips: any[]
  recentTechnicians: any[]
  allTechnicians?: any[] 
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
        {/* Chart Section - Obsidian Glass Panel */}
        <div className="lg:col-span-2 p-6 bg-slate-950/95 ring-1 ring-white/5 border-0 shadow-2xl rounded-[2rem] relative">
          {/* Top glow detail */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
          <h3 className="font-extrabold text-slate-100 mb-6 text-lg tracking-tight">Payroll Distribution</h3>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">No payslip data to display yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: '#0f172a' }} 
                    contentStyle={{ backgroundColor: '#09090d', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', color: '#f8fafc' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="netPay" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Pay" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-ambient-soft overflow-hidden flex flex-col hover:shadow-lg hover:shadow-slate-100/30 hover:translate-y-[-1px] transition-spring">
          <h3 className="font-bold text-slate-800 mb-6 text-lg tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" /> Recent Activity
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {payslips.slice(0, 3).map((p, i) => (
              <div key={`p-${i}`} className="flex items-start gap-3 pb-4 border-b border-slate-50">
                <div className="w-8.5 h-8.5 rounded-xl bg-emerald-500/8 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 tracking-tight">Payslip Published</p>
                  <p className="text-xs text-slate-400 mt-0.5">For {p.technician?.full_name}</p>
                </div>
              </div>
            ))}

            {recentTechnicians.slice(0, 3).map((t, i) => (
              <div key={`t-${i}`} className="flex items-start gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-cyan-500/8 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 tracking-tight">New Employee Joined</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.full_name} ({t.role})</p>
                </div>
              </div>
            ))}

            {payslips.length === 0 && recentTechnicians.length === 0 && (
               <p className="text-sm text-slate-400 italic">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Physical Biometric Terminal Simulation Panel */}
      <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-ambient-soft hover:shadow-lg hover:shadow-slate-100/30 hover:translate-y-[-1px] transition-spring">
        <h3 className="font-bold text-slate-800 text-lg tracking-tight flex items-center gap-2 mb-2">
          <Fingerprint className="w-5 h-5 text-emerald-500" /> Physical Biometrics Terminal Simulator (Office Hardware)
        </h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          This panel simulates physical wall-mounted biometric fingerprint scan devices at company offices (e.g. Pacita, Makati). Tapping Clock-In/Out on mobile prompts the technician to present a physical fingerprint scan. Use this tool to simulate matching physical swipes in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select Employee to Scan Finger</label>
            <select
              value={selectedTechId}
              onChange={(e) => {
                setSelectedTechId(e.target.value)
                setSimResult(null)
              }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-spring"
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
            className="w-full sm:w-auto px-6 py-3.5 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-50 text-white font-bold rounded-xl transition-spring flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
          >
            {simulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Swiping Daliri...
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4 text-emerald-400" /> Simulate Fingerprint Scan
              </>
            )}
          </button>
        </div>

        {simResult && (
          <div className="mt-4 animate-in fade-in slide-in-from-top duration-300">
            {simResult.success ? (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simulated fingerprint swipe registered! Mobile device listening on WebSockets/fallback will automatically complete clocking.</span>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
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
