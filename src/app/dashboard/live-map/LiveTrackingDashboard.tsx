"use client"
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { ActiveTechnician } from '@/app/actions/tracking'
import { Navigation, Clock, UserCircle2, AlertTriangle } from 'lucide-react'

// Dynamically import the Leaflet map so it only runs on the client to avoid SSR 'window is not defined' errors
const TrackingMap = dynamic(() => import('./TrackingMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
      <Clock className="w-8 h-8 animate-spin" />
      <span className="ml-3 font-medium">Loading Live Map...</span>
    </div>
  )
})

export default function LiveTrackingDashboard({ initialTechnicians }: { initialTechnicians: ActiveTechnician[] }) {
  const [technicians, setTechnicians] = useState<ActiveTechnician[]>(initialTechnicians)
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to realtime updates for technician_locations
    const channel = supabase
      .channel('live_tracking_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'technician_locations'
        },
        (payload) => {
          // payload.new contains the updated row
          const newLocation = payload.new as any;
          if (newLocation && newLocation.technician_id) {
            setTechnicians(prev => 
              prev.map(tech => 
                tech.technician_id === newLocation.technician_id 
                  ? { 
                      ...tech, 
                      latitude: newLocation.latitude, 
                      longitude: newLocation.longitude,
                      status: newLocation.status,
                      last_updated: newLocation.updated_at
                    } 
                  : tech
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Helper to check if GPS is stale (over 15 minutes old)
  const isStale = (lastUpdated: string | null) => {
    if (!lastUpdated) return true;
    const updatedTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    return (now - updatedTime) > 15 * 60 * 1000; // 15 mins in ms
  }

  return (
    <div className="flex h-full w-full">
      
      {/* Sidebar List */}
      <div className="w-80 flex-none bg-white border-r border-slate-200 overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex justify-between items-center">
            Active Roster
            <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-xs">
              {technicians.length}
            </span>
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {technicians.map(tech => {
            const stale = isStale(tech.last_updated);
            const isSelected = tech.technician_id === selectedTechId;

            return (
              <button 
                key={tech.technician_id}
                onClick={() => setSelectedTechId(tech.technician_id)}
                className={`w-full text-left p-4 transition-colors ${
                  isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tech.avatar_url ? (
                    <img src={tech.avatar_url} alt={tech.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{tech.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {tech.latitude ? (
                        stale ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                            <AlertTriangle className="w-3 h-3" /> Stale GPS
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live
                          </span>
                        )
                      ) : (
                        <span className="text-xs font-medium text-slate-400">No Location</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          
          {technicians.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Navigation className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No active technicians right now.</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-grow relative bg-slate-100 z-0">
        <TrackingMap 
          technicians={technicians} 
          selectedTechId={selectedTechId} 
          onSelectTech={setSelectedTechId} 
        />
      </div>

    </div>
  )
}
