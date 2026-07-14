"use client"

import { useState, useTransition } from "react"
import { ShieldAlert, Plus, Edit2, CheckCircle2, XCircle, Search, Loader2, X, AlertCircle } from "lucide-react"
import { createWarning, updateWarning, forwardWarning, rejectWarning, deleteWarning } from "@/app/actions/warnings"

type Employee = { id: string, full_name: string, role: string }
type Warning = any // using any for quick dev, typed via Supabase normally

export default function WarningsClient({ initialWarnings, employees, currentUserRole }: { initialWarnings: Warning[], employees: Employee[], currentUserRole: string }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'issued' | 'rejected'>('pending')
  const [warnings, setWarnings] = useState<Warning[]>(initialWarnings)
  const [isPending, startTransition] = useTransition()
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'create' | 'review' | 'edit'>('create')
  const [currentWarning, setCurrentWarning] = useState<Warning | null>(null)
  
  // Form State
  const [employeeId, setEmployeeId] = useState("")
  const [warningLevel, setWarningLevel] = useState("First Written Warning")
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0])
  const [policies, setPolicies] = useState("")
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const isHR = ['hr', 'admin', 'super_admin', 'ceo'].includes(currentUserRole)
  const isServiceDept = ['coordinator', 'branch_manager', 'supervisor', 'admin', 'super_admin', 'ceo'].includes(currentUserRole)

  const openCreateDrawer = () => {
    setViewMode('create')
    setCurrentWarning(null)
    setEmployeeId("")
    setWarningLevel("First Written Warning")
    setIncidentDate(new Date().toISOString().split('T')[0])
    setPolicies("")
    setSubject("")
    setDetails("")
    setErrorMsg("")
    setSuccessMsg("")
    setShowRejectInput(false)
    setIsDrawerOpen(true)
  }

  const openReviewDrawer = (w: Warning) => {
    setViewMode('review')
    setCurrentWarning(w)
    setEmployeeId(w.employee_id)
    setWarningLevel(w.warning_level)
    setIncidentDate(w.incident_date || "")
    setPolicies(w.policies_violated || "")
    setSubject(w.subject)
    setDetails(w.details)
    setErrorMsg("")
    setSuccessMsg("")
    setShowRejectInput(false)
    setIsDrawerOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    
    const formData = new FormData()
    formData.append("employee_id", employeeId)
    formData.append("warning_level", warningLevel)
    formData.append("incident_date", incidentDate)
    formData.append("policies_violated", policies)
    formData.append("subject", subject)
    formData.append("details", details)

    if (viewMode === 'edit' && currentWarning) {
      formData.append("id", currentWarning.id)
    }

    startTransition(async () => {
      const res = (viewMode === 'edit') ? await updateWarning(formData) : await createWarning(formData)
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg(viewMode === 'edit' ? "Warning updated!" : "Warning created and sent for review!")
        setTimeout(() => {
          setIsDrawerOpen(false)
          window.location.reload()
        }, 1500)
      }
    })
  }

  const handleForward = async () => {
    if (!currentWarning) return
    startTransition(async () => {
      const res = await forwardWarning(currentWarning.id)
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg("Warning forwarded to technician successfully!")
        setTimeout(() => {
          setIsDrawerOpen(false)
          window.location.reload()
        }, 1500)
      }
    })
  }

  const handleRejectSubmit = async () => {
    if (!currentWarning || !rejectionReason.trim()) {
      setErrorMsg("Rejection reason is required.")
      return
    }
    const formData = new FormData()
    formData.append("id", currentWarning.id)
    formData.append("reason", rejectionReason)
    
    startTransition(async () => {
      const res = await rejectWarning(formData)
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg("Warning rejected.")
        setTimeout(() => {
          setIsDrawerOpen(false)
          window.location.reload()
        }, 1500)
      }
    })
  }

  const filteredWarnings = warnings.filter(w => {
    if (activeTab === 'pending') return w.status === 'pending_service_review'
    if (activeTab === 'issued') return w.status === 'issued_to_technician' || w.status === 'acknowledged'
    if (activeTab === 'rejected') return w.status === 'rejected'
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            Warning Notices
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage disciplinary actions and workflow approvals.</p>
        </div>
        
        {isHR && (
          <button 
            onClick={openCreateDrawer}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Issue New Warning
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-rose-600 text-rose-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          Pending Review ({warnings.filter(w => w.status === 'pending_service_review').length})
        </button>
        <button 
          onClick={() => setActiveTab('issued')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'issued' ? 'border-rose-600 text-rose-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          Active / Issued
        </button>
        <button 
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'rejected' ? 'border-rose-600 text-rose-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          Rejected
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Date</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Employee</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Level</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Subject</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Status</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredWarnings.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm font-medium text-zinc-500">No warnings in this category.</td></tr>
            ) : (
              filteredWarnings.map(w => (
                <tr key={w.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-zinc-600">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-bold text-zinc-900">{w.employee?.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-rose-700">{w.warning_level}</td>
                  <td className="px-4 py-3 text-xs text-zinc-700 max-w-xs truncate">{w.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider 
                      ${w.status === 'pending_service_review' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        w.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {w.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => openReviewDrawer(w)}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-zinc-200">
            
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-zinc-900">
                    {viewMode === 'create' ? 'Issue Warning Notice' : 'Review Warning Notice'}
                  </h2>
                  <p className="text-xs font-semibold text-zinc-500">
                    {viewMode === 'create' ? 'Draft a new disciplinary action' : `Status: ${currentWarning?.status.replace(/_/g, ' ')}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="warning-form" onSubmit={handleSave} className="space-y-5">
                {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {errorMsg}</div>}
                {successMsg && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {successMsg}</div>}

                {viewMode === 'review' && currentWarning?.rejection_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                    <p className="text-xs font-black text-red-800 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm font-medium text-red-900">{currentWarning.rejection_reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Employee (Technician)</label>
                  <select 
                    required 
                    value={employeeId} 
                    onChange={e => setEmployeeId(e.target.value)} 
                    disabled={viewMode === 'review'}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-70"
                  >
                    <option value="" disabled>Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Warning Level</label>
                    <select 
                      value={warningLevel} 
                      onChange={e => setWarningLevel(e.target.value)}
                      disabled={viewMode === 'review'}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-70"
                    >
                      <option>Verbal Warning</option>
                      <option>First Written Warning</option>
                      <option>Second Written Warning</option>
                      <option>Final Warning</option>
                      <option>Suspension</option>
                      <option>Termination</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Incident Date</label>
                    <input 
                      type="date" 
                      value={incidentDate} 
                      onChange={e => setIncidentDate(e.target.value)}
                      disabled={viewMode === 'review'}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-70"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Policies Violated</label>
                  <input 
                    value={policies} 
                    onChange={e => setPolicies(e.target.value)}
                    disabled={viewMode === 'review'}
                    placeholder="e.g. Code of Conduct Sec 2.1"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Subject</label>
                  <input 
                    required
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    disabled={viewMode === 'review'}
                    placeholder="Brief description of the incident"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Full Details</label>
                  <textarea 
                    required
                    rows={5}
                    value={details} 
                    onChange={e => setDetails(e.target.value)}
                    disabled={viewMode === 'review'}
                    placeholder="Explain what happened..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none disabled:opacity-70"
                  />
                </div>
                
                {currentWarning?.editor && (
                  <p className="text-[10px] font-bold text-zinc-400">Last edited by {currentWarning.editor.full_name}</p>
                )}
              </form>
            </div>

            <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-3">
              {viewMode === 'create' || viewMode === 'edit' ? (
                <div className="flex gap-3">
                  <button onClick={() => viewMode === 'edit' ? setViewMode('review') : setIsDrawerOpen(false)} type="button" className="flex-1 py-3 text-sm font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
                  <button type="submit" form="warning-form" disabled={isPending} className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center">
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Warning'}
                  </button>
                </div>
              ) : null}

              {viewMode === 'review' && currentWarning?.status === 'pending_service_review' ? (
                <>
                  {showRejectInput ? (
                    <div className="space-y-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-red-700">Reason for Rejection</label>
                      <input 
                        value={rejectionReason} 
                        onChange={e => setRejectionReason(e.target.value)} 
                        autoFocus
                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" 
                        placeholder="Why is this rejected?" 
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 text-xs font-bold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50">Cancel</button>
                        <button onClick={handleRejectSubmit} disabled={isPending} className="flex-1 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 flex justify-center items-center">
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex gap-3 w-full">
                        {isServiceDept && (
                          <button onClick={() => setViewMode('edit')} className="flex-1 py-2.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                        )}
                        {isServiceDept && (
                          <button onClick={() => setShowRejectInput(true)} className="flex-1 py-2.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 flex items-center justify-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                        )}
                        {(isHR && !isServiceDept) && (
                           <button onClick={() => setViewMode('edit')} className="flex-1 py-2.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit Draft</button>
                        )}
                      </div>
                      {isServiceDept && (
                        <button onClick={handleForward} disabled={isPending} className="w-full py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Approve & Forward to Tech</>}
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : null}
              
              {viewMode === 'review' && currentWarning?.status === 'rejected' && isHR && (
                <button onClick={() => setViewMode('edit')} className="w-full py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" /> Fix & Resubmit
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}
