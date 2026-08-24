'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Search } from 'lucide-react'

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

  return (
    // We use negative margins (-m-8) to break out of the layout padding and make the map truly full screen
    <div className="flex flex-col h-[calc(100vh-2rem)] w-[calc(100%+4rem)] -m-8 relative overflow-hidden bg-gray-100">
      <div className="absolute inset-0 z-0">
        <LiveMapWrapper locations={filtered} />
      </div>

      {/* Floating Control Panel (5-Second Rule: Easy access without changing pages) */}
      <div className="absolute top-4 left-4 z-[400] w-80 bg-white/95 backdrop-blur-md shadow-2xl rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-1">Fleet Tracking</h1>
          <p className="text-xs text-gray-500 mb-4">Monitor real-time field operations.</p>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search technicians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm font-medium transition-shadow shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-center text-gray-500 py-6 font-medium">Locating fleet...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-center text-gray-500 py-6 font-medium">No technicians active.</p>
          ) : (
            filtered.map(tech => (
              <div key={tech.id} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors flex items-center gap-4 group">
                <div className="relative">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white ${tech.isOnline ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-gray-400 group-hover:bg-gray-500'} transition-colors`}>
                    {tech.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${tech.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate mb-0.5">{tech.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center text-[10px] font-bold text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {tech.time}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tech.isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {tech.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
