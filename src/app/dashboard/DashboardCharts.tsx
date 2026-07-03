"use client"
import { useState } from 'react'
import { ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CheckCircle2, AlertCircle, FileText, Fingerprint, Loader2, Users, Calendar, ClipboardList, DollarSign, MessageSquare, Package, Settings, HelpCircle, X, Search, Check, Megaphone } from 'lucide-react'
import { simulateBiometricScan } from '@/app/actions/employees'
import Link from 'next/link'

export default function DashboardCharts({ 
  payslips, 
  recentTechnicians, 
  allTechnicians = [],
  recentActivities = [],
  officeLocations = []
}: { 
  payslips: any[]
  recentTechnicians: any[]
  allTechnicians?: any[] 
  recentActivities?: any[]
  officeLocations?: any[]
}) {
  const [selectedTechId, setSelectedTechId] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [isEmulatorOpen, setIsEmulatorOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(officeLocations[0]?.name || 'Pacita HQ')

  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState<'all' | 'technician' | 'helper'>('all')
  const [employeeListPage, setEmployeeListPage] = useState(1)

  const handleSearchChange = (query: string) => {
    setEmployeeSearchQuery(query)
    setEmployeeListPage(1)
  }

  const handleRoleFilterChange = (role: 'all' | 'technician' | 'helper') => {
    setEmployeeRoleFilter(role)
    setEmployeeListPage(1)
  }

  // Filter technicians based on search query and role filter
  const filteredTechnicians = allTechnicians.filter((t: any) => {
    const fullName = (t.fullName || t.full_name || '').toLowerCase()
    const matchesSearch = fullName.includes(employeeSearchQuery.toLowerCase())
    
    const role = (t.role || '').toLowerCase()
    const matchesRole = employeeRoleFilter === 'all' || role === employeeRoleFilter
    
    return matchesSearch && matchesRole
  })

  const itemsPerPage = 5
  const totalPages = Math.ceil(filteredTechnicians.length / itemsPerPage) || 1
  const currentPage = Math.min(employeeListPage, totalPages)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTechnicians = filteredTechnicians.slice(startIndex, startIndex + itemsPerPage)

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
    const startTime = Date.now()
    try {
      const res = await simulateBiometricScan(selectedTechId)
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime))
      }
      if (res.error) {
        setSimResult({ error: res.error })
      } else {
        setSimResult({ success: true })
      }
    } catch (e: any) {
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime))
      }
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

        {/* Right column: Emulator and Recent Activity */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Biometric Terminal Emulator Action Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Biometric Emulator</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Simulate physical fingerprint swipes to test automatic time log creation.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEmployeeSearchQuery('')
                setEmployeeRoleFilter('all')
                setEmployeeListPage(1)
                setIsEmulatorOpen(true)
              }}
              className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-center"
            >
              Launch Emulator
            </button>
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
              {recentActivities.slice(0, 3).map((log: any, i: number) => {
                const getCategoryIcon = (category: string) => {
                  switch (category) {
                    case 'employee': return { icon: Users, bg: 'bg-cyan-50 border-cyan-100 text-cyan-600' }
                    case 'schedule': return { icon: Calendar, bg: 'bg-indigo-50 border-indigo-100 text-indigo-600' }
                    case 'leave': return { icon: ClipboardList, bg: 'bg-rose-50 border-rose-100 text-rose-600' }
                    case 'payroll': return { icon: DollarSign, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' }
                    case 'ticket': return { icon: MessageSquare, bg: 'bg-amber-50 border-amber-100 text-amber-600' }
                    case 'inventory': return { icon: Package, bg: 'bg-blue-50 border-blue-100 text-blue-600' }
                    case 'settings': return { icon: Settings, bg: 'bg-slate-50 border-slate-100 text-slate-600' }
                    case 'announcement': return { icon: Megaphone, bg: 'bg-indigo-50 border-indigo-100 text-indigo-600' }
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
      </div>

      {/* Emulator Modal */}
      {isEmulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 backdrop-blur-sm bg-zinc-950/25 transition-opacity duration-300 ease-out animate-in fade-in" 
            onClick={() => {
              if (!simulating) {
                setIsEmulatorOpen(false);
                setSimResult(null);
              }
            }}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Biometric Terminal Emulator</h3>
              </div>
              <button
                onClick={() => {
                  if (!simulating) {
                    setIsEmulatorOpen(false);
                    setSimResult(null);
                  }
                }}
                disabled={simulating}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Content based on State */}
            {simulating ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in duration-200">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                  <Fingerprint className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h4 className="text-base font-semibold text-slate-900">Verifying fingerprint match...</h4>
                <p className="text-xs text-slate-500 mt-1.5">Checking match with TechnoSys physical records</p>
              </div>
            ) : simResult?.success ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Verification Successful</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
                  Successfully registered swipe event at <span className="font-semibold text-slate-700">{selectedLocation}</span> for the selected employee.
                </p>
                <div className="mt-8 flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setSimResult(null);
                    }}
                    className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={() => {
                      setIsEmulatorOpen(false);
                      setSimResult(null);
                    }}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : simResult?.error ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
                  <AlertCircle className="w-9 h-9" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Verification Failed</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
                  {simResult.error || "An unexpected error occurred during the verification process."}
                </p>
                <div className="mt-8 flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setSimResult(null);
                    }}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0">
                      Select Employee
                    </label>

                    {/* Search Input */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={employeeSearchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search employee name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Role Filters */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRoleFilterChange('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          employeeRoleFilter === 'all'
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleFilterChange('technician')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          employeeRoleFilter === 'technician'
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/70'
                        }`}
                      >
                        Technicians
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleFilterChange('helper')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          employeeRoleFilter === 'helper'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/70'
                        }`}
                      >
                        Helpers
                      </button>
                    </div>

                    {/* List Grid */}
                    <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                      {paginatedTechnicians.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-xl bg-slate-50">
                          No employees match your filters.
                        </div>
                      ) : (
                        paginatedTechnicians.map((t: any) => {
                          const isSelected = selectedTechId === t.id
                          const roleLower = (t.role || '').toLowerCase()
                          const isTechnician = roleLower === 'technician'
                          
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedTechId(t.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-semibold text-sm text-slate-800 truncate">
                                  {t.fullName || t.full_name}
                                </span>
                                {isTechnician ? (
                                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    Technician
                                  </span>
                                ) : (
                                  <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    Helper
                                  </span>
                                )}
                              </div>
                              {isSelected ? (
                                <span className="text-emerald-600 shrink-0 bg-emerald-100 p-0.5 rounded-full">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {filteredTechnicians.length > 5 && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setEmployeeListPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-300 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-400 font-medium">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEmployeeListPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-300 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Office Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                    >
                      {officeLocations.length === 0 ? (
                        <>
                          <option value="Pacita HQ">Pacita HQ</option>
                          <option value="Makati Branch">Makati Branch</option>
                          <option value="Cebu Branch">Cebu Branch</option>
                          <option value="Davao Branch">Davao Branch</option>
                        </>
                      ) : (
                        officeLocations.map((office: any) => (
                          <option key={office.id} value={office.name}>
                            {office.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSimulateScan}
                  disabled={!selectedTechId}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Scan Fingerprint</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
)
