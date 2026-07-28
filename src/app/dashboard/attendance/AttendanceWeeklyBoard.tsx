"use client"
import { useState } from "react"
import { CalendarRange, MapPin, Users, CheckSquare, Clock } from "lucide-react"
import TeamClockOutModal from "./TeamClockOutModal"

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const generateWeekDays = (baseDate: Date) => {
  const current = new Date(baseDate)
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) // Start week on Monday
  const startOfWeek = new Date(current.setDate(diff))
  
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    days.push(d)
  }
  return days
}

export default function AttendanceWeeklyBoard({ 
  activeShifts, 
  weekSchedules,
  canApprove
}: { 
  activeShifts: any[]
  weekSchedules: any[]
  canApprove: boolean
}) {
  const [selectedTeam, setSelectedTeam] = useState<any[] | null>(null)
  const weekDays = generateWeekDays(new Date())
  const todayStr = getLocalDateString(new Date())

  // Process data to group active shifts by their schedules
  const boardData: Record<string, any[]> = {} // grouped by date -> array of clustered shifts

  weekDays.forEach(day => {
    const dateStr = getLocalDateString(day)
    boardData[dateStr] = []
  })

  // Map each time_log to its schedule if available
  const shiftsWithSchedule = activeShifts.map(shift => {
    const techId = shift.technician_id
    // Find a schedule for this person today
    const matchingSchedule = weekSchedules.find(s => {
      const isToday = getLocalDateString(new Date(s.start_time)) === getLocalDateString(new Date(shift.app_time_in))
      const isPart = s.technician_id === techId || s.senior_partner_id === techId
      return isToday && isPart
    })
    
    return {
      ...shift,
      schedule: matchingSchedule || null
    }
  })

  // Cluster the shifts by schedule.id or, if no schedule, uniquely by tech_id
  const clusteredShifts = new Map<string, any[]>()
  
  shiftsWithSchedule.forEach(shift => {
    const dateKey = getLocalDateString(new Date(shift.app_time_in))
    const clusterKey = shift.schedule ? `sched_${shift.schedule.id}` : `solo_${shift.id}`
    
    if (!clusteredShifts.has(clusterKey)) {
      clusteredShifts.set(clusterKey, [])
    }
    clusteredShifts.get(clusterKey)?.push(shift)
  })

  // Distribute to boardData
  clusteredShifts.forEach((shiftsGroup, clusterKey) => {
    const dateKey = getLocalDateString(new Date(shiftsGroup[0].app_time_in))
    if (boardData[dateKey]) {
      boardData[dateKey].push(shiftsGroup)
    }
  })

  const handleClockOutTeam = (teamShifts: any[]) => {
    if (!canApprove) return
    const team = teamShifts.map(s => ({
      logId: s.id,
      name: s.technician?.full_name || 'Staff',
      role: s.technician?.role || 'technician',
      timeIn: s.app_time_in,
      isDriver: s.schedule?.driver_id === s.technician_id
    }))
    setSelectedTeam(team)
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-extrabold tracking-wide text-zinc-900 uppercase flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-indigo-600" />
          Weekly Dispatch Board
        </h2>
      </div>

      <div className="p-6 bg-zinc-50/30 overflow-x-auto">
        <div className="flex gap-4 min-w-[1100px] min-h-[60vh]">
          {weekDays.map((dayDate, idx) => {
            const dateKey = getLocalDateString(dayDate)
            const dayClusters = boardData[dateKey] || []
            const isToday = dateKey === todayStr
            const weekdayName = dayDate.toLocaleDateString(undefined, { weekday: 'short' })

            return (
              <div 
                key={dateKey} 
                className={`flex-1 min-w-[280px] bg-white rounded-2xl border ${
                  isToday ? 'border-indigo-200 shadow-md ring-1 ring-indigo-500/10' : 'border-zinc-200/80 shadow-xs'
                } flex flex-col overflow-hidden`}
              >
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isToday ? 'bg-indigo-600 border-indigo-600' : 'bg-zinc-50/80 border-zinc-100'
                }`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-100' : 'text-zinc-500'}`}>
                      {weekdayName}
                    </span>
                    <span className={`text-lg font-extrabold mt-0.5 ${isToday ? 'text-white' : 'text-zinc-800'}`}>
                      {dayDate.getDate()}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 bg-zinc-50/30">
                  {dayClusters.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                      <p className="text-xs font-semibold text-zinc-400">No active shifts</p>
                    </div>
                  )}

                  {dayClusters.map((cluster, i) => {
                    const sched = cluster[0].schedule
                    const isTeam = cluster.length > 1
                    return (
                      <div key={i} className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all group">
                        <div className="p-3 bg-zinc-50/50 border-b border-zinc-100">
                          {sched ? (
                            <>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 mb-1 line-clamp-1">
                                {sched.client_name}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                                <MapPin className="w-3 h-3 text-zinc-400" />
                                <span className="line-clamp-1">{sched.location}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 line-clamp-1">
                              Standalone Shift
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-2">
                            <Users className="w-3.5 h-3.5" />
                            {isTeam ? 'Team Dispatch' : 'Individual'}
                          </div>
                          
                          {cluster.map((shift: any) => (
                            <div key={shift.id} className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-zinc-700 truncate pr-2">
                                {shift.technician?.full_name} {shift.schedule?.driver_id === shift.technician_id && '(Driver)'}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(shift.app_time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>

                        {canApprove && (
                          <div className="p-2 border-t border-zinc-100 bg-white">
                            <button
                              onClick={() => handleClockOutTeam(cluster)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-xs font-bold border border-rose-150 transition-all cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              {isTeam ? 'Clock Out Team' : 'Clock Out'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedTeam && (
        <TeamClockOutModal 
          team={selectedTeam} 
          onClose={() => setSelectedTeam(null)} 
          onSuccess={() => {
            setSelectedTeam(null)
            window.location.reload()
          }} 
        />
      )}
    </div>
  )
}
