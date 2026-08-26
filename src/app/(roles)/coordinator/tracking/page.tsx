'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Search, ChevronDown, ChevronUp, Minimize2, Maximize2, Users, CheckCircle2 } from 'lucide-react'

// Dynamically import Leaflet map to prevent SSR window errors
const LiveMapWrapper = dynamic(() => import('@/components/dashboard/LiveMapWrapper'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-400 font-medium">Initializing Map Engine...</div>
})

type TechLocation = {
  id: string
  lat: number
  lon: number
  name: string
  isOnline: boolean
  time: string
  status: string
}

export default function TrackingPage() {
  const [locations, setLocations] = useState<TechLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('technician_locations')
      .select('*, profiles!technician_id(full_name)')
      
    if (data) {
      const formatted = data.map((loc: any) => {
        // Calculate if updated in last 15 minutes (Visual 5-Second Rule for 'Online' status)
        const updatedTime = new Date(loc.updated_at)
        const diffMinutes = (new Date().getTime() - updatedTime.getTime()) / (1000 * 60)
        const isOnline = diffMinutes < 15

        return {
          id: loc.technician_id,
          lat: Number(loc.latitude),
          lon: Number(loc.longitude),
          name: loc.profiles?.full_name || 'Unknown Tech',
          isOnline: isOnline,
          time: updatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: loc.status || 'working'
        }
      })
      setLocations(formatted)
    }
    setLoading(false)
  }

  const filtered = locations.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const activeCount = locations.filter(l => l.isOnline).length

  return (
    // We use negative margins (-m-8) to break out of the layout padding and make the map truly full screen
    <div className="flex flex-col h-[calc(100vh-2rem)] w-[calc(100%+4rem)] -m-8 relative overflow-hidden bg-gray-100">
      <div className="absolute inset-0 z-0">
        <LiveMapWrapper locations={filtered} selectedTechId={selectedTechId} />
      </div>

      {/* Floating Collapsible Window Control Panel */}
      <div 
        className={`absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
          isCollapsed ? 'w-72 max-h-14 cursor-pointer hover:bg-gray-50' : 'w-80 max-h-[calc(100vh-6rem)]'
        }`}
      >
        {/* Window Header */}
        <div 
          onClick={() => isCollapsed && setIsCollapsed(false)}
          className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-gray-900 truncate">Fleet Tracking</h1>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {activeCount} Active
                </span>
              </div>
              {!isCollapsed && (
                <p className="text-[11px] text-gray-500 font-medium truncate">Monitor real-time field operations</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsCollapsed(!isCollapsed)
            }}
            title={isCollapsed ? "Expand Fleet Tracking Window" : "Minimize Window"}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-2 shrink-0"
          >
            {isCollapsed ? <Maximize2 className="w-4 h-4 text-indigo-600" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandable Content Body */}
        {!isCollapsed && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search technicians..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium transition-shadow shadow-xs text-gray-900"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-xs text-center text-gray-500 py-6 font-medium">Locating fleet...</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-center text-gray-500 py-6 font-medium">No technicians active.</p>
              ) : (
                filtered.map(tech => {
                  const isSelected = tech.id === selectedTechId
                  return (
                    <div 
                      key={tech.id} 
                      onClick={() => setSelectedTechId(isSelected ? null : tech.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 group mb-1 ${
                        isSelected 
                          ? 'bg-indigo-50/90 border-2 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs border-2 border-white ${
                          tech.isOnline ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-gray-400 group-hover:bg-gray-500'
                        } transition-colors`}>
                          {tech.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${tech.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate mb-0.5 ${isSelected ? 'text-indigo-900 font-extrabold' : 'text-gray-900'}`}>{tech.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center text-[10px] font-bold text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {tech.time}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-700' 
                              : tech.isOnline 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {tech.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
