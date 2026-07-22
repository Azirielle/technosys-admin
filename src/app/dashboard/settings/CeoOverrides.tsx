"use client"

import { useState } from "react"
import { Shield, Clock, Search, User, CheckCircle2, AlertCircle, X, Trash2, KeyRound } from "lucide-react"
import { grantTemporaryOverride, revokeOverride } from "@/app/actions/overrides"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

export default function CeoOverrides({ adminsList, activeOverrides }: { adminsList: any[], activeOverrides: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedFeature, setSelectedFeature] = useState<string>("")
  const [durationDays, setDurationDays] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const { alert, confirm } = useAlertConfirm()

  const menuFeatures = [
    { value: 'payroll', label: '💵 Payroll', desc: 'Access Payroll calculations, disputes & salary logs' },
    { value: 'attendance', label: '🕒 Attendance & Biometrics', desc: 'Access Live Attendance & Location verification' },
    { value: 'broadcaster', label: '📣 Broadcaster', desc: 'Create broadcasts & emergency push notifications' },
    { value: 'schedules', label: '🗓️ Schedules & DTR', desc: 'Manage technician work schedules & DTR logs' },
    { value: 'leaves', label: '🌴 Leave Requests', desc: 'Review & approve employee leave applications' },
    { value: 'employees', label: '👥 Employees Directory', desc: 'Access staff directory & profile management' },
    { value: 'tickets', label: '🎫 Support Tickets', desc: 'Access Service Desk & HR support tickets' },
    { value: 'inventory', label: '📦 Inventory & Tools', desc: 'Manage equipment, tools & stock levels' },
    { value: 'warnings', label: '⚠️ Warnings & Infractions', desc: 'Issue & review disciplinary notices' },
    { value: 'app_management', label: '📱 App Distribution', desc: 'Manage mobile APK updates & releases' },
    { value: 'settings', label: '⚙️ System Settings', desc: 'Manage office locations, forms & settings' },
    { value: 'admin', label: '🛡️ Full Administrator (All Modules)', desc: 'Grant complete administrative access across all menus' },
  ]

  const durations = [
    { value: 1, label: '1 Day' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
  ]

  const getFeatureObj = (val: string) => {
    return menuFeatures.find(f => f.value === val) || { label: val.toUpperCase(), desc: '' }
  }

  const handleGrant = async () => {
    if (!selectedUser || !selectedFeature) {
      setErrorMsg("Please select an employee and a menu feature to grant.")
      return
    }

    setLoading(true)
    setErrorMsg("")
    
    try {
      const featObj = getFeatureObj(selectedFeature)
      const result = await grantTemporaryOverride(selectedUser.id, selectedFeature, durationDays)
      if (result?.error) {
        setErrorMsg(result.error)
      } else {
        setSelectedUser(null)
        setSelectedFeature("")
        alert(
          `${selectedUser.full_name} has been granted temporary access to [${featObj.label}] for ${durationDays} days.`,
          "Menu Power Granted",
          "success"
        )
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (overrideId: string, fullName: string, featureVal: string) => {
    const featObj = getFeatureObj(featureVal)
    const isConfirmed = await confirm(
      `Are you sure you want to revoke temporary access to [${featObj.label}] for ${fullName}? They will instantly lose access to this feature menu.`,
      "Revoke Menu Access",
      "destructive"
    )
    
    if (isConfirmed) {
      const result = await revokeOverride(overrideId)
      if (result?.error) {
        alert(result.error, "Error", "destructive")
      } else {
        alert("The feature override has been successfully revoked.", "Revoked", "success")
      }
    }
  }

  const filteredAdmins = adminsList.filter((admin) => 
    admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Shield className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">CEO Feature Access Overrides</h2>
              <p className="text-sm text-zinc-500">Temporarily delegate specific menu feature access (e.g. Payroll, Attendance, Broadcaster) to employees.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Grant Form */}
            <div className="space-y-5 bg-zinc-50/50 p-5 rounded-xl border border-zinc-100">
              <h3 className="font-semibold text-zinc-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" /> Grant Feature Menu Power
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Select Employee</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search employee by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                    />
                  </div>
                  
                  {searchTerm && !selectedUser && (
                    <div className="mt-1 absolute z-20 w-full max-w-sm bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredAdmins.length === 0 ? (
                        <div className="p-3 text-sm text-zinc-500 text-center">No employees found.</div>
                      ) : (
                        filteredAdmins.map(admin => (
                          <button
                            key={admin.id}
                            onClick={() => { setSelectedUser(admin); setSearchTerm("") }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 focus:bg-zinc-50 border-b border-zinc-100 last:border-0"
                          >
                            <div className="font-medium text-zinc-900">{admin.full_name}</div>
                            <div className="text-xs text-zinc-500 capitalize">{admin.role?.replace('_', ' ')}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="bg-white p-3 border border-amber-200 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <div className="text-sm font-bold text-zinc-900">{selectedUser.full_name}</div>
                      <div className="text-xs text-zinc-500">Current Role: <span className="capitalize font-semibold text-zinc-700">{selectedUser.role?.replace('_', ' ')}</span></div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-rose-500 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Menu Feature to Grant</label>
                  <select
                    value={selectedFeature}
                    onChange={(e) => setSelectedFeature(e.target.value)}
                    className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="">Select menu feature...</option>
                    {menuFeatures.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {selectedFeature && (
                    <p className="text-[11px] text-zinc-500 mt-1 italic">
                      {getFeatureObj(selectedFeature).desc}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Duration</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {durations.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-md flex items-start gap-2 text-sm border border-rose-100">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={handleGrant}
                  disabled={loading || !selectedUser || !selectedFeature}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  {loading ? "Granting..." : "Grant Temporary Feature Access"}
                </button>
              </div>
            </div>

            {/* Active Overrides List */}
            <div>
              <h3 className="font-semibold text-zinc-800 text-sm flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-zinc-400" /> Active Feature Overrides
              </h3>
              
              <div className="space-y-3">
                {activeOverrides.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                    <Shield className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No active feature overrides.</p>
                  </div>
                ) : (
                  activeOverrides.map((override) => {
                    const expires = new Date(override.expires_at)
                    const featObj = getFeatureObj(override.granted_role)
                    return (
                      <div key={override.id} className="p-4 border border-amber-200 bg-amber-50/30 rounded-xl flex items-start justify-between group transition-all hover:bg-amber-50/50 shadow-xs">
                        <div>
                          <div className="font-bold text-zinc-900 text-sm">{override.target?.full_name}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-md border border-amber-200/60">
                              {featObj.label}
                            </span>
                            <span className="text-xs text-zinc-500">
                              Expires: {expires.toLocaleDateString()} {expires.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-2">
                            Granted by: {override.granter?.full_name}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRevoke(override.id, override.target?.full_name, override.granted_role)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          title="Revoke Feature Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
