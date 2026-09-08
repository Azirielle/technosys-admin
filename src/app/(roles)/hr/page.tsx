'use client'

import { useState } from 'react'
import { Ticket, CalendarOff } from 'lucide-react'
import { TicketingTab } from './TicketingTab'
import { LeavesTab } from './LeavesTab'

export default function TicketsAndLeavesPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'leaves'>('tickets')

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-full">
      {/* Top Application Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Tickets & Operations</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              HR Desk
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Manage technician disputes, inquiries, and leave workflows.</p>
        </div>

        {/* Segmented Tab Pill */}
        <div className="inline-flex items-center p-1 bg-zinc-200/70 rounded-xl border border-zinc-300/60 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${activeTab === 'tickets' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-zinc-600 hover:text-zinc-900'}
            `}
          >
            <Ticket className={`w-3.5 h-3.5 ${activeTab === 'tickets' ? 'text-indigo-600' : 'text-zinc-500'}`} />
            Support & Disputes
          </button>
          
          <button
            onClick={() => setActiveTab('leaves')}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${activeTab === 'leaves' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-zinc-600 hover:text-zinc-900'}
            `}
          >
            <CalendarOff className={`w-3.5 h-3.5 ${activeTab === 'leaves' ? 'text-indigo-600' : 'text-zinc-500'}`} />
            Leave Requests
          </button>
        </div>
      </div>

      {/* Tab Content Canvas */}
      <div className="flex-1 min-h-0 w-full">
        {activeTab === 'tickets' && <TicketingTab />}
        {activeTab === 'leaves' && <LeavesTab />}
      </div>
    </div>
  )
}

