"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react'

export default function DashboardCharts({ payslips, recentTechnicians }: { payslips: any[], recentTechnicians: any[] }) {
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
        <h3 className="font-bold text-slate-900 mb-6 text-lg tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {payslips.slice(0, 3).map((p, i) => (
            <div key={`p-${i}`} className="flex items-start gap-3 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Payslip Published</p>
                <p className="text-xs text-slate-500 mt-0.5">For {p.technician?.full_name}</p>
              </div>
            </div>
          ))}

          {recentTechnicians.slice(0, 3).map((t, i) => (
            <div key={`t-${i}`} className="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">New Employee Joined</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.full_name} ({t.role})</p>
              </div>
            </div>
          ))}

          {payslips.length === 0 && recentTechnicians.length === 0 && (
             <p className="text-sm text-slate-500 italic">No recent activity.</p>
          )}
        </div>
      </div>

    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
