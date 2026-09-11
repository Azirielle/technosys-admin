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
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Tickets & Operations</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
              HR Desk
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage technician disputes, inquiries, and leave workflows.</p>
        </div>

        {/* Segmented Tab Pill */}
        <div className="inline-flex items-center p-1 bg-zinc-200/70 dark:bg-zinc-800/80 rounded-xl border border-zinc-300/60 dark:border-zinc-700 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${activeTab === 'tickets' ? 'bg-white dark:bg-zinc-900 shadow-xs text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}
            `}
          >
            <Ticket className={`w-3.5 h-3.5 ${activeTab === 'tickets' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
            Support & Disputes
          </button>
          
          <button
            onClick={() => setActiveTab('leaves')}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${activeTab === 'leaves' ? 'bg-white dark:bg-zinc-900 shadow-xs text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}
            `}
          >
            <CalendarOff className={`w-3.5 h-3.5 ${activeTab === 'leaves' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
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

