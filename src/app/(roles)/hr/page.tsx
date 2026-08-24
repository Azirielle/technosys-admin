'use client'

import { useState } from 'react'
import { Ticket, CalendarOff } from 'lucide-react'
import { TicketingTab } from './TicketingTab'
import { LeavesTab } from './LeavesTab'

export default function TicketsAndLeavesPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'leaves'>('tickets')

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden p-6">
      {/* Compressed Header & Button Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none mb-1">Tickets & Leaves</h1>
          <p className="text-xs text-gray-500">Manage employee requests and leaves.</p>
        </div>

        {/* Literal Button Navigation */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`
              flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all
              ${activeTab === 'tickets' ? 'bg-white shadow-sm text-indigo-700 border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}
            `}
          >
            <Ticket className={`w-4 h-4 ${activeTab === 'tickets' ? 'text-indigo-600' : 'text-gray-400'}`} />
            Ticketing (Disputes)
          </button>
          
          <button
            onClick={() => setActiveTab('leaves')}
            className={`
              flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all
              ${activeTab === 'leaves' ? 'bg-white shadow-sm text-indigo-700 border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}
            `}
          >
            <CalendarOff className={`w-4 h-4 ${activeTab === 'leaves' ? 'text-indigo-600' : 'text-gray-400'}`} />
            Leave Requests
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 w-full overflow-hidden flex flex-col">
        {activeTab === 'tickets' && <TicketingTab />}
        {activeTab === 'leaves' && <LeavesTab />}
      </div>
    </div>
  )
}
