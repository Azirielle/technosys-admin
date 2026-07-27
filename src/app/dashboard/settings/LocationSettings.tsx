"use client"

import { useState, useTransition } from "react"
import { MapPin, Navigation, Target, AlertCircle, CheckCircle2, Plus, Power, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { addOfficeLocation, toggleLocationActive } from "@/app/actions/geofence"
import dynamic from "next/dynamic"

const GeofenceMap = dynamic(() => import("./GeofenceMap"), { ssr: false })

interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
}

interface LocationSettingsProps {
  initialLocations: OfficeLocation[]
  userRole?: string
}

export default function LocationSettings({ initialLocations, userRole }: LocationSettingsProps) {
  const [locations, setLocations] = useState<OfficeLocation[]>(initialLocations)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form states for adding a new location
  const [name, setName] = useState("")
  const [latitude, setLatitude] = useState(initialLocations[0]?.latitude?.toString() || "14.5995")
  const [longitude, setLongitude] = useState(initialLocations[0]?.longitude?.toString() || "120.9842")
  const [radius, setRadius] = useState("50")

  const isSuperAdmin = userRole === "super_admin"

  const handleSelectLocation = (loc: OfficeLocation) => {
    setName(loc.name)
    setLatitude(loc.latitude.toString())
    setLongitude(loc.longitude.toString())
    setRadius(loc.radius_meters.toString())
  }

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedName = name.trim()
    const nameLower = trimmedName.toLowerCase()
    const duplicate = locations.some(loc => loc.name.trim().toLowerCase() === nameLower)
    if (duplicate) {
      setErrorMsg(`A branch location named "${trimmedName}" already exists. Please use a unique name.`)
      return
    }

    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await addOfficeLocation(formData)
      if (result?.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg(`Geofence location "${trimmedName}" added successfully.`)
        // Clear name
        setName("")
        
        // Refresh local list (we can reload the window to keep in sync with server revalidation)
        window.location.reload()
      }
    })
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    
    startTransition(async () => {
      const result = await toggleLocationActive(id, !currentActive)
      if (result?.error) {
        setErrorMsg(result.error)
      } else {
        setSuccessMsg(`Location status updated successfully.`)
        // Update local list
        setLocations(prev => prev.map(loc => {
          if (loc.id === id) {
            return { ...loc, is_active: !currentActive }
          }
          return loc
        }))
      }
    })
  }

  return (
    <div className="space-y-8">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-emerald-800">Success</h3>
            <p className="text-sm text-emerald-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Add New Location Form */}
        {isSuperAdmin ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add Geofence Location
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Register a new branch coordinates.</p>
            </div>

            <form onSubmit={handleAddLocation} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Branch / Site Name</label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Quezon City Branch"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Interactive Leaflet Map Editor */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Interactive Geofence Editor
                </label>
                <GeofenceMap
                  latitude={parseFloat(latitude) || 14.5995}
                  longitude={parseFloat(longitude) || 120.9842}
                  radius={parseFloat(radius) || 50}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat.toString())
                    setLongitude(lng.toString())
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-zinc-400" /> Latitude
                  </label>
                  <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-500">
                    {latitude ? parseFloat(latitude).toFixed(6) : "14.599500"}
                  </div>
                  <input type="hidden" name="latitude" value={latitude} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-zinc-400" /> Longitude
                  </label>
                  <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono text-zinc-500">
                    {longitude ? parseFloat(longitude).toFixed(6) : "120.984200"}
                  </div>
                  <input type="hidden" name="longitude" value={longitude} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-zinc-400" /> Radius (meters)
                </label>
                <input
                  type="number"
                  name="radius_meters"
                  min={1}
                  max={10000}
                  value={radius}
                  onChange={e => setRadius(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? "Adding Location..." : "Add Location"}
              </button>
            </form>
          </div>
        ) : null}

        {/* RIGHT COLUMN: Active Locations List */}
        <div className={`${isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col`}>
          <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Geofence Locations Registry
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">List of branch offices and allowed clock-in radii.</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-full font-semibold text-zinc-600">
              {locations.length} Registered
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {locations.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                No geofence locations registered. Technicians won't be able to clock in.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="p-4">Name</th>
                    <th className="p-4">Coordinates</th>
                    <th className="p-4">Radius</th>
                    <th className="p-4 text-center">Status</th>
                    {isSuperAdmin && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {locations.map(loc => (
                    <tr 
                      key={loc.id} 
                      onClick={() => handleSelectLocation(loc)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-bold text-zinc-800">{loc.name}</td>
                      <td className="p-4 font-mono text-xs text-zinc-500">
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      </td>
                      <td className="p-4 font-semibold text-zinc-600">{loc.radius_meters}m</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase inline-block ${
                          loc.is_active 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        }`}>
                          {loc.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleActive(loc.id, loc.is_active)}
                            disabled={isPending}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border cursor-pointer ${
                              loc.is_active 
                                ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100" 
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {loc.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
