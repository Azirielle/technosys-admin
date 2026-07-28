"use client"

import { useState } from "react"
import { 
  Shield, User, Clock, Trash2, AlertCircle, CheckCircle2, 
  FileText, Wrench, Calendar, CheckSquare, Package, DollarSign, 
  MessageSquare, Sparkles, UserCheck, ShieldAlert, ChevronDown, Lock
} from "lucide-react"
import { grantTemporaryOverride, revokeOverride } from "@/app/actions/overrides"
import DeletionQueue from "@/app/dashboard/settings/DeletionQueue"

export interface GranularFunction {
  id: string
  label: string
  category: 'service' | 'attendance' | 'inventory' | 'payroll' | 'tickets'
  description: string
  mappedRole: string
  iconName: string
}

const GRANULAR_FUNCTIONS: GranularFunction[] = [
  // Service Operations
  { id: 'schedules:dispatch', label: 'Dispatch & Schedule Technicians', category: 'service', description: 'Create, edit, and assign field technician dispatches to client locations.', mappedRole: 'coordinator', iconName: 'Calendar' },
  { id: 'schedules:driver_assign', label: 'Assign Designated Drivers', category: 'service', description: 'Authorize driver assignments for team dispatch vehicles.', mappedRole: 'coordinator', iconName: 'Wrench' },
  { id: 'schedules:geofence_override', label: 'Geofence Parameters Override', category: 'service', description: 'Modify office and client site GPS geofence radius bounds.', mappedRole: 'admin', iconName: 'AlertCircle' },
  { id: 'schedules:force_reassign', label: 'Force Reassign Active Ticket', category: 'service', description: 'Force reassign an ongoing ticket/dispatch to a different technician.', mappedRole: 'supervisor', iconName: 'User' },
  { id: 'schedules:view_live_tracking', label: 'View Real-time GPS Tracking', category: 'service', description: 'View live GPS coordinates and breadcrumb trails of field personnel.', mappedRole: 'supervisor', iconName: 'Search' },
  { id: 'schedules:cancel_dispatch', label: 'Cancel Active Dispatch', category: 'service', description: 'Cancel an active dispatch without penalty or strict validation.', mappedRole: 'coordinator', iconName: 'X' },
  { id: 'schedules:bypass_vehicle_inspection', label: 'Bypass Vehicle Checklist', category: 'service', description: 'Override the daily vehicle inspection checklist requirement for drivers.', mappedRole: 'admin', iconName: 'CheckSquare' },

  // Attendance Control
  { id: 'attendance:clock_out', label: 'Force Team Clock-Out', category: 'attendance', description: 'Force clock-out individual technicians or entire team dispatches.', mappedRole: 'supervisor', iconName: 'Clock' },
  { id: 'attendance:selfie_audit', label: 'Selfie Audit Verification', category: 'attendance', description: 'Review, approve, or reject biometric selfie verification logs.', mappedRole: 'hr', iconName: 'User' },
  { id: 'attendance:manual_dtr', label: 'Manual DTR Log Insertion', category: 'attendance', description: 'Manually insert missing clock-in or clock-out timestamps.', mappedRole: 'hr', iconName: 'FileText' },
  { id: 'attendance:dtr_override', label: 'Override DTR Timestamps', category: 'attendance', description: 'Edit existing DTR time logs for payroll compliance.', mappedRole: 'admin', iconName: 'CheckSquare' },
  { id: 'attendance:overtime_approval', label: 'Approve Overtime Payouts', category: 'attendance', description: 'Authorize OT claims and extra work hour calculations.', mappedRole: 'hr', iconName: 'Clock' },
  { id: 'attendance:approve_undertime', label: 'Approve Early Undertime', category: 'attendance', description: 'Approve early clock-outs or undertime requests without penalty.', mappedRole: 'hr', iconName: 'Unlock' },
  { id: 'attendance:view_absentee_reports', label: 'View Absenteeism Reports', category: 'attendance', description: 'Generate and view confidential chronic absenteeism reports.', mappedRole: 'hr', iconName: 'FileText' },
  { id: 'attendance:clear_biometrics', label: 'Reset Employee Biometrics', category: 'attendance', description: 'Reset or clear employee biometric device and device ID records.', mappedRole: 'admin', iconName: 'AlertCircle' },

  // Inventory & Equipment
  { id: 'inventory:item_catalog', label: 'Inventory Control & Catalog', category: 'inventory', description: 'Add, update, or edit tools, materials, and warehouse stock items.', mappedRole: 'admin', iconName: 'Package' },
  { id: 'inventory:stock_adjustment', label: 'Stock Quantity Adjustment', category: 'inventory', description: 'Adjust stock levels and write-off damaged equipment.', mappedRole: 'admin', iconName: 'Package' },
  { id: 'inventory:borrow_approval', label: 'Tool Borrow & Return Operations', category: 'inventory', description: 'Approve tool issuance and check-in logs for field teams.', mappedRole: 'coordinator', iconName: 'Wrench' },
  { id: 'inventory:force_return', label: 'Force Tool Return/Lost', category: 'inventory', description: 'Force mark a borrowed tool as returned or report it as lost.', mappedRole: 'coordinator', iconName: 'AlertCircle' },
  { id: 'inventory:purchase_order', label: 'Approve Purchase Orders', category: 'inventory', description: 'Create or approve purchase orders for low stock materials.', mappedRole: 'accountant', iconName: 'FileText' },
  { id: 'inventory:audit_logs', label: 'View Inventory Audit Logs', category: 'inventory', description: 'View historical inventory movement and secure audit logs.', mappedRole: 'admin', iconName: 'Search' },

  // Payroll & Compensation
  { id: 'payroll:run_generation', label: 'Generate Payroll Runs', category: 'payroll', description: 'Execute semi-monthly payroll calculations and allowance runs.', mappedRole: 'accountant', iconName: 'DollarSign' },
  { id: 'payroll:adjustments', label: 'Payroll Adjustments & Advances', category: 'payroll', description: 'Approve bonuses, cash advances, and salary deductions.', mappedRole: 'accountant', iconName: 'DollarSign' },
  { id: 'payroll:lock_batch', label: 'Finalize & Lock Payroll Batch', category: 'payroll', description: 'Lock payroll period to prevent further modifications.', mappedRole: 'accountant', iconName: 'Shield' },
  { id: 'payroll:unlock_batch', label: 'Unlock Payroll Batch (High Risk)', category: 'payroll', description: 'Unlock a previously finalized payroll batch for emergency corrections.', mappedRole: 'admin', iconName: 'AlertCircle' },
  { id: 'payroll:view_rates', label: 'View Confidential Rates', category: 'payroll', description: 'View confidential employee daily rates and salary tiers.', mappedRole: 'hr', iconName: 'User' },
  { id: 'payroll:export_bank', label: 'Export Bank Transmittal', category: 'payroll', description: 'Generate and export bank transmittal files for salary payout.', mappedRole: 'accountant', iconName: 'FileText' },
  { id: 'payroll:approve_loans', label: 'Approve Employee Loans', category: 'payroll', description: 'Approve or reject employee loan and cash advance requests.', mappedRole: 'hr', iconName: 'CheckCircle2' },

  // Tickets & Compliance
  { id: 'tickets:manage_tickets', label: 'Support Ticket Operations', category: 'tickets', description: 'Create, assign, escalate, and resolve internal support tickets.', mappedRole: 'hr', iconName: 'MessageSquare' },
  { id: 'leaves:approve_leaves', label: 'Approve Official Leaves', category: 'tickets', description: 'Approve or reject official employee vacation and sick leave requests.', mappedRole: 'hr', iconName: 'Calendar' },
  { id: 'broadcaster:send_announcements', label: 'Publish System Announcements', category: 'tickets', description: 'Send high-priority broadcast messages to mobile apps.', mappedRole: 'hr', iconName: 'Shield' },
  { id: 'tickets:delete_tickets', label: 'Delete Internal Tickets', category: 'tickets', description: 'Permanently delete internal support tickets from the system.', mappedRole: 'admin', iconName: 'Trash2' },
  { id: 'comms:view_private_messages', label: 'View Private Communications', category: 'tickets', description: 'View private internal ticket communications and notes.', mappedRole: 'admin', iconName: 'Search' },
  { id: 'hr:employee_onboarding', label: 'Employee Onboarding', category: 'tickets', description: 'Add new employees, configure profiles, and generate system credentials.', mappedRole: 'hr', iconName: 'User' },
  { id: 'hr:employee_termination', label: 'Employee Account Termination', category: 'tickets', description: 'Suspend, deactivate, or terminate employee system accounts.', mappedRole: 'admin', iconName: 'AlertCircle' },
]

const TARGET_ROLES = [
  { value: 'coordinator', label: 'Coordinator (Service & Dispatch)' },
  { value: 'hr', label: 'HR & Compliance (Attendance & Tickets)' },
  { value: 'accountant', label: 'Accountant (Payroll & Finance)' },
  { value: 'supervisor', label: 'Supervisor (Field Operations)' },
  { value: 'admin', label: 'Admin (Full Module Control)' },
]

export default function CeoOverridesClient({
  adminsList = [],
  activeOverrides = [],
  deletionRequests = []
}: {
  adminsList: any[]
  activeOverrides: any[]
  deletionRequests: any[]
}) {
  const [selectedTargetRole, setSelectedTargetRole] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([])
  const [durationDays, setDurationDays] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [activeTab, setActiveTab] = useState<'overrides' | 'deletions'>('overrides')

  // Available functions are filtered precisely by the selected role
  const availableFunctions = GRANULAR_FUNCTIONS.filter(f => f.mappedRole === selectedRole)

  const toggleFunction = (id: string) => {
    setSelectedFunctions(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleGrant = async () => {
    if (!selectedTargetRole || !selectedRole) {
      setErrorMsg("Please select both a target department role and a power role.")
      return
    }

    if (selectedFunctions.length === 0) {
      setErrorMsg("Please select at least one granular function to authorize.")
      return
    }

    const targetUsers = adminsList.filter(a => a.role === selectedTargetRole)
    if (targetUsers.length === 0) {
      setErrorMsg(`No employees found with the role: ${selectedTargetRole}`)
      return
    }

    setLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      // Loop over all users in the selected role and grant them the override
      let successCount = 0;
      for (const targetAdmin of targetUsers) {
        const res = await grantTemporaryOverride(targetAdmin.id, selectedRole, durationDays)
        if (!res.error) successCount++;
      }
      
      if (successCount > 0) {
        setSuccessMsg(`Successfully granted ${selectedFunctions.length} ${selectedRole.toUpperCase()} functions to ${successCount} ${selectedTargetRole.toUpperCase()}(s) for ${durationDays} day(s).`)
        setSelectedTargetRole("")
        setSelectedRole("")
        setSelectedFunctions([])
      } else {
        setErrorMsg("Failed to grant overrides. Please check server logs.")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to grant override.")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke the active override for ${name}?`)) return
    setLoading(true)
    try {
      const res = await revokeOverride(id)
      if (res.error) alert(res.error)
      else window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-md ring-4 ring-amber-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">CEO Governance & Feature Overrides</h1>
            <p className="text-xs font-semibold text-zinc-500 mt-1 leading-relaxed">
              Delegate specific, granular operational capabilities to administrators during department absences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs text-xs font-bold text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Executive Privilege Mode</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-zinc-200 bg-white px-4 rounded-2xl border shadow-xs gap-4">
        <button
          onClick={() => setActiveTab('overrides')}
          className={`py-3.5 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overrides'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Granular Feature Overrides ({activeOverrides.length})
        </button>

        <button
          onClick={() => setActiveTab('deletions')}
          className={`py-3.5 px-4 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'deletions'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Executive Deletion Queue ({deletionRequests.length})
        </button>
      </div>

      {activeTab === 'overrides' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: 4-Step Wizard */}
          <div className="xl:col-span-7 space-y-4">
            
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Override Delegation Wizard
                </h2>
              </div>
              
              <div className="p-5 space-y-8">
                
                {/* Step 1 & 2: Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Step 1 */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                      1. Target Administrator Department
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedTargetRole}
                        onChange={(e) => setSelectedTargetRole(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer transition-all"
                      >
                        <option value="" disabled hidden>Select the recipient role...</option>
                        {TARGET_ROLES.map(role => (
                          <option key={role.value} value={role.value} disabled={role.value === selectedRole}>
                            {role.label} {role.value === selectedRole ? "(Already Selected as Power)" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                      2. Target Role Capability
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedRole}
                        onChange={(e) => {
                          setSelectedRole(e.target.value);
                          setSelectedFunctions([]); // Reset checkboxes on role change
                        }}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none cursor-pointer transition-all"
                      >
                        <option value="" disabled hidden>Select the role power...</option>
                        {TARGET_ROLES.map(role => (
                          <option key={role.value} value={role.value} disabled={role.value === selectedTargetRole}>
                            {role.label} {role.value === selectedTargetRole ? "(Already Selected as Target)" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Step 3: Granular Function Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                    <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                      3. Granular Functions to Apply
                    </label>
                    {selectedFunctions.length > 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {selectedFunctions.length} Selected
                      </span>
                    )}
                  </div>

                  {!selectedRole ? (
                    <div className="py-8 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                      <Lock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-zinc-500">Select a Target Role above to view available functions.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                      {availableFunctions.map(func => {
                        const isChecked = selectedFunctions.includes(func.id)
                        return (
                          <div 
                            key={func.id}
                            onClick={() => toggleFunction(func.id)}
                            className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                              isChecked 
                                ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-500/30' 
                                : 'bg-white border-zinc-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="shrink-0 pt-0.5">
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                isChecked ? 'bg-amber-500 border-amber-600' : 'border-zinc-300 bg-white'
                              }`}>
                                {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-bold leading-tight ${isChecked ? 'text-amber-950' : 'text-zinc-800'}`}>
                                {func.label}
                              </h4>
                              <p className="text-[10px] text-zinc-500 mt-1 leading-snug line-clamp-2">
                                {func.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {selectedRole && (
                    <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                        Security Notice: Authorizing these functions will temporarily grant the target user the underlying <strong>{selectedRole.toUpperCase()}</strong> role template to perform these actions safely.
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 4: Duration & Auth */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                    4. Override Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { days: 1, label: '1 Day' },
                      { days: 3, label: '3 Days' },
                      { days: 7, label: '1 Week' },
                      { days: 30, label: '1 Month' },
                    ].map(d => (
                      <button
                        key={d.days}
                        type="button"
                        onClick={() => setDurationDays(d.days)}
                        className={`py-2 px-1 rounded-xl text-xs font-extrabold border text-center transition-all cursor-pointer ${
                          durationDays === d.days
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {successMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGrant}
                    disabled={loading || !selectedTargetRole || !selectedRole || selectedFunctions.length === 0}
                    className="w-full py-3.5 mt-2 bg-zinc-900 hover:bg-black disabled:opacity-40 disabled:hover:bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Shield className="w-4 h-4" />
                    {loading ? "Processing Authorization..." : "Authorize Temporary Override"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Active Overrides */}
          <div className="xl:col-span-5 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-2 px-1">
              <Clock className="w-4 h-4 text-zinc-400" /> Active Delegated Overrides
            </h2>

            {activeOverrides.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-zinc-400 flex flex-col items-center shadow-xs">
                <Shield className="w-10 h-10 mb-2 text-zinc-300" />
                <p className="text-sm font-bold text-zinc-600">No Active Overrides</p>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">All administrators are currently operating strictly under their native role capabilities.</p>
              </div>
            ) : (
              activeOverrides.map((override) => {
                const expires = new Date(override.expires_at)
                return (
                  <div key={override.id} className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between group hover:border-amber-400 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-zinc-900 text-sm">{override.target?.full_name}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-200">
                          {override.granted_role}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-semibold">
                        Expires: {expires.toLocaleDateString()} {expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">Authorized by: {override.granter?.full_name}</p>
                    </div>

                    <button
                      onClick={() => handleRevoke(override.id, override.target?.full_name)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Revoke Access"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'deletions' && (
        <DeletionQueue deletionRequests={deletionRequests} />
      )}
    </div>
  )
}
