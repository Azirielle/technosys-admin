"use client"
import { useState, useTransition } from "react"
import SelfieAuditWidget from "../SelfieAuditWidget"
import AttendanceHistoryTable from "./AttendanceHistoryTable"
import AttendanceWeeklyBoard from "./AttendanceWeeklyBoard"
import OvertimeRequestsTable from "./OvertimeRequestsTable"
import { Clock, History, Timer, UserCheck, Camera, MapPin, AlertCircle } from "lucide-react"
import { clockOutTechnician } from "@/app/actions/attendance"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

export default function AttendanceTabs({ 
  activeShifts = [],
  weekSchedules = [],
  pendingSelfies, 
  history, 
  otRequests,
  adminId,
  canApprove 
}: { 
  activeShifts?: any[]
  weekSchedules?: any[]
  pendingSelfies: any[]
  history: any[]
  otRequests: any[]
  adminId: string
  canApprove: boolean 
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'overtime' | 'history'>('active')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")
  const { alert, confirm } = useAlertConfirm()

  const pendingOtCount = otRequests.filter(r => r.status === 'pending').length

  const handleForceClockOut = async (logId: string, technicianName: string) => {
    const ok = await confirm(
      `Are you sure you want to force clock out ${technicianName}? This will set their clock-out time to now and calculate their worked hours.`,
      "Confirm Clock Out"
    );
    if (!ok) return;

    setErrorMsg("")
    startTransition(async () => {
      const res = await clockOutTechnician(logId)
      if (res && res.error) {
        setErrorMsg(res.error)
      } else {
        await alert(`${technicianName} has been successfully clocked out.`, "Success", "success")
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Active Shifts
          {activeShifts.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-full text-xs font-bold">
              {activeShifts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Action
          {pendingSelfies.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">
              {pendingSelfies.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('overtime')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'overtime'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Timer className="w-4 h-4" />
          Overtime Requests
          {pendingOtCount > 0 && (
            <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs font-bold">
              {pendingOtCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Recent History
        </button>
      </div>
 
      <div className="p-6 flex-grow bg-slate-50/20">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        
        {activeTab === 'active' && (
          <AttendanceWeeklyBoard 
            activeShifts={activeShifts} 
            weekSchedules={weekSchedules} 
            canApprove={canApprove} 
          />
        )}

        {activeTab === 'pending' && (
          pendingSelfies.length > 0 ? (
            <SelfieAuditWidget recentSelfies={pendingSelfies} canApprove={canApprove} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
              <Clock className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-700">All Caught Up!</h3>
              <p className="mt-2 text-center max-w-md">
                There are no pending attendance selfies requiring your approval right now.
              </p>
            </div>
          )
        )}

        {activeTab === 'overtime' && (
          <OvertimeRequestsTable requests={otRequests} adminId={adminId} canApprove={canApprove} />
        )}
 
        {activeTab === 'history' && (
          <AttendanceHistoryTable history={history} canEdit={canApprove} />
        )}
      </div>
    </div>
  )
}
