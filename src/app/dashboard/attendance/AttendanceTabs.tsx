"use client"
import { useState } from "react"
import PendingSelfiesWidget from "../PendingSelfiesWidget"
import AttendanceHistoryTable from "./AttendanceHistoryTable"
import { Clock, History } from "lucide-react"

export default function AttendanceTabs({ pendingSelfies, history, canApprove }: { pendingSelfies: any[], history: any[], canApprove: boolean }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
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
        {activeTab === 'pending' && (
          pendingSelfies.length > 0 ? (
            <PendingSelfiesWidget pendingSelfies={pendingSelfies} canApprove={canApprove} />
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

        {activeTab === 'history' && (
          <AttendanceHistoryTable history={history} canEdit={canApprove} />
        )}
      </div>
    </div>
  )
}
