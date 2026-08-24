'use client';

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Calendar as CalendarIcon, MapPin, Map as MapIcon, Plus, X, User, Navigation, Info, Settings2 } from "lucide-react";

const GeofenceMap = dynamic(() => import("./GeofenceMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium">Loading Interactive Map...</div>
});

export default function DispatchBoardClient() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Datatable State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // Default Today
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOfficeMode, setIsOfficeMode] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  
  const [techSearch, setTechSearch] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    technician_ids: [] as string[],
    client_name: "",
    location: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "17:00",
    attendance_mode: "direct_dispatch",
    geofence_lat: 14.5995, // Default Manila
    geofence_lon: 120.9842,
    geofence_radius: 500,
    coordinate_override: "" 
  });

  // Toggle Office Mode
  const toggleOfficeMode = (enabled: boolean) => {
    setIsOfficeMode(enabled);
    if (enabled) {
      setFormData(p => ({
        ...p,
        attendance_mode: "hq",
        location: "Pacita HQ",
        client_name: "Office Duty",
        geofence_lat: 14.3541, // Approx Pacita HQ coords
        geofence_lon: 121.0665,
        geofence_radius: 100
      }));
    } else {
      setFormData(p => ({
        ...p,
        attendance_mode: "direct_dispatch",
        location: "",
        client_name: ""
      }));
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchProfiles();
  }, [dateFilter]);

  const fetchSchedules = async () => {
    setLoading(true);
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('schedules')
      .select('*, profiles!technician_id(full_name)')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });
      
    if (data) setSchedules(data);
    setLoading(false);
  };

  const [busyTechIds, setBusyTechIds] = useState<string[]>([]);

  useEffect(() => {
    const checkConflicts = async () => {
      if (!formData.date || !formData.start_time || !formData.end_time) return;
      
      const startIso = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
      const endIso = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();
      
      const { data } = await supabase
        .from('schedules')
        .select('technician_id')
        .lt('start_time', endIso)
        .gt('end_time', startIso);
        
      if (data) {
        setBusyTechIds(data.map(d => d.technician_id));
      }
    };
    checkConflicts();
  }, [formData.date, formData.start_time, formData.end_time]);

  const fetchProfiles = async () => {
    // Select the new technician_level and lifecycle_status for conflict awareness
    const { data, error } = await supabase.from('profiles').select('id, full_name, lifecycle_status, technician_level').order('full_name');
    if (error) {
      console.error("Failed to fetch profiles:", error);
    }
    if (data) setProfiles(data);
  };

  // Autocomplete Search using Nominatim
  const searchAddress = async (query: string) => {
    setAddressQuery(query);
    setFormData(p => ({ ...p, location: query }));
    if (query.length >= 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph`);
        const results = await res.json();
        setAddressResults(results);
      } catch (e) {
        console.error("Nominatim search failed", e);
      }
    } else {
      setAddressResults([]);
    }
  };

  const selectAddress = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setFormData(p => ({ 
      ...p, 
      location: result.display_name, 
      geofence_lat: lat, 
      geofence_lon: lon,
      coordinate_override: `${lat}, ${lon}`
    }));
    setAddressQuery(result.display_name);
    setAddressResults([]);
  };

  const handleCoordinateOverride = (val: string) => {
    setFormData(p => ({ ...p, coordinate_override: val }));
    const parts = val.split(',').map(s => s.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        setFormData(p => ({ ...p, geofence_lat: lat, geofence_lon: lon }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.technician_ids.length === 0) {
      alert("Please select at least one technician.");
      return;
    }

    const selectedProfiles = profiles.filter(p => formData.technician_ids.includes(p.id));
    const hasHelper = selectedProfiles.some(p => p.technician_level === 'helper');
    const hasSeniorOrTech = selectedProfiles.some(p => p.technician_level === 'senior' || p.technician_level === 'technician' || !p.technician_level);
    
    if (hasHelper && !hasSeniorOrTech) {
      alert("A Helper cannot be deployed alone. Please also select a Senior or Standard Technician.");
      return;
    }
    
    setIsSubmitting(true);
    
    const startTime = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
    const endTime = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();

    const insertData = formData.technician_ids.map(techId => ({
      technician_id: techId,
      client_name: formData.client_name,
      location: formData.location,
      start_time: startTime,
      end_time: endTime,
      attendance_mode: formData.attendance_mode,
      geofence_lat: formData.geofence_lat,
      geofence_lon: formData.geofence_lon,
      geofence_radius: formData.geofence_radius,
      attendance_tracking_mode: formData.attendance_mode === 'hq' ? 'pacita_hq' : 'direct_on_site'
    }));

    const { error } = await supabase.from('schedules').insert(insertData);

    setIsSubmitting(false);
    if (!error) {
      setIsModalOpen(false);
      fetchSchedules();
    } else {
      alert("Error creating dispatch: " + error.message);
    }
  };

  const filtered = schedules.filter(s => 
    (s.profiles?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    s.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'hq': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'direct_dispatch': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'out_of_town': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none mb-1">Scheduling & Dispatch</h1>
          <p className="text-xs text-gray-500">Manage daily field assignments and geofences.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Dispatch
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden flex flex-col flex-1 pb-6">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-300 bg-gray-50 flex flex-wrap gap-4 items-center justify-start">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search technician or client..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm font-medium cursor-pointer"
            />
          </div>
          <div className="ml-auto text-sm text-gray-500 font-medium">
            {new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Technician</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Client / Assignment</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location & Geofence</th>
                <th className="border border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time Window</th>
                <th className="border border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Mode</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500 font-medium">Loading schedule...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-6 py-12 text-center text-gray-500 font-medium">No dispatches found for this date.</td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="border border-gray-300 px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                          <User className="h-4 w-4 text-indigo-700" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{s.profiles?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-4">
                      <p className="text-sm font-bold text-gray-900">{s.client_name}</p>
                    </td>
                    <td className="border border-gray-300 px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-1.5 text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.location}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-5 text-[10px] font-mono text-gray-500">
                          <span>{s.geofence_lat?.toFixed(5)}, {s.geofence_lon?.toFixed(5)}</span>
                          <span className="px-1.5 bg-gray-100 rounded border border-gray-200">{s.geofence_radius}m radius</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-gray-500">to {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded border text-[10px] uppercase font-bold tracking-wider ${getModeBadge(s.attendance_mode)}`}>
                        {s.attendance_mode.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-300 flex items-center justify-between mt-auto">
          <p className="text-sm text-gray-700">
            Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length) || 0}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-semibold">{filtered.length}</span> results
          </p>
          <nav className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-2 border-t border-b border-gray-300 text-sm font-medium ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 z-10' : 'bg-white text-gray-500 hover:bg-gray-50'} -ml-px`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-2 rounded-r-md border border-gray-300 border-l bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 -ml-px text-sm font-medium"
            >
              Next
            </button>
          </nav>
        </div>
      </div>

      {/* Smart Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 transition-all duration-300 ${isOfficeMode ? 'max-w-md' : 'max-w-5xl'}`}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isOfficeMode ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {isOfficeMode ? 'Schedule Office Hours' : 'Smart Dispatch'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {isOfficeMode ? 'Assign tech to HQ' : 'Assign tech and configure geofence'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Mode Switcher */}
            <div className="bg-white border-b border-gray-100 p-2 flex justify-center">
              <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => toggleOfficeMode(false)}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${!isOfficeMode ? 'bg-white shadow-sm text-indigo-700 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Standard Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => toggleOfficeMode(true)}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${isOfficeMode ? 'bg-white shadow-sm text-emerald-700 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  HQ / Office Mode
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={`flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden ${isOfficeMode ? '' : 'h-[65vh] min-h-[400px]'}`}>
              
              {/* Left Pane - Form */}
              <div className={`w-full p-6 overflow-y-auto flex flex-col gap-5 ${isOfficeMode ? '' : 'lg:w-[45%] border-r border-gray-100'}`}>
                
                {/* Tech & Time */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Technicians ({formData.technician_ids.length} selected)</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (formData.technician_ids.length === profiles.length) {
                            setFormData({...formData, technician_ids: []}); // Deselect all
                          } else {
                            setFormData({...formData, technician_ids: profiles.map(p => p.id)}); // Select all
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                      >
                        {formData.technician_ids.length === profiles.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white">
                      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Filter technicians..." 
                          value={techSearch}
                          onChange={(e) => setTechSearch(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none placeholder-gray-400 text-gray-900"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto p-1 bg-white">
                        {profiles.filter(p => p.full_name.toLowerCase().includes(techSearch.toLowerCase())).length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-500 font-medium">No technicians found</div>
                        ) : (
                          profiles.filter(p => p.full_name.toLowerCase().includes(techSearch.toLowerCase())).map(p => (
                            <label key={p.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${formData.technician_ids.includes(p.id) ? 'bg-indigo-50/50' : ''}`}>
                              <input 
                                type="checkbox"
                                disabled={p.lifecycle_status === 'on_leave'} 
                                checked={formData.technician_ids.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, technician_ids: [...formData.technician_ids, p.id]});
                                  } else {
                                    setFormData({...formData, technician_ids: formData.technician_ids.filter(id => id !== p.id)});
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                                  <User className="h-3 w-3 text-gray-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-sm font-medium ${p.lifecycle_status === 'on_leave' ? 'text-gray-400 line-through' : formData.technician_ids.includes(p.id) ? 'text-indigo-900 font-bold' : 'text-gray-700'}`}>
                                    {p.full_name}
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {p.technician_level === 'senior' && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">SENIOR</span>}
                                    {p.technician_level === 'helper' && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">HELPER</span>}
                                    {p.lifecycle_status === 'on_leave' ? (
                                      <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase tracking-wider">ON LEAVE</span>
                                    ) : busyTechIds.includes(p.id) ? (
                                      <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wider">BUSY</span>
                                    ) : (
                                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">AVAILABLE</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {!isOfficeMode && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Client / Assignment</label>
                      <input 
                        type="text" required placeholder="e.g. Ayala Malls Routine Inspect"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Date</label>
                      <input 
                        type="date" required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      />
                    </div>
                    {!isOfficeMode && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Mode</label>
                        <select 
                          value={formData.attendance_mode}
                          onChange={(e) => setFormData({...formData, attendance_mode: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                        >
                          <option value="direct_dispatch">Direct Dispatch</option>
                          <option value="out_of_town">Out of Town</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Start Time</label>
                      <input 
                        type="time" required
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">End Time</label>
                      <input 
                        type="time" required
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {!isOfficeMode && (
                  <>
                    <div className="h-px bg-gray-200 w-full my-1"></div>

                    {/* Geofence Engine */}
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MapIcon className="w-3.5 h-3.5" /> Geofence Configuration
                      </label>
                      
                      <div className="relative mb-3">
                        <input 
                          type="text" 
                          placeholder="Search PH Address (Nominatim)..."
                          value={addressQuery}
                          onChange={(e) => searchAddress(e.target.value)}
                          className="w-full border border-indigo-200 rounded-lg p-2.5 pl-9 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                        />
                        <Search className="absolute left-3 top-3 w-4 h-4 text-indigo-400" />
                        
                        {/* Autocomplete Dropdown */}
                        {addressResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {addressResults.map((res: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => selectAddress(res)}
                                className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm flex items-start gap-2"
                              >
                                <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-gray-700 line-clamp-2">{res.display_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Radius Tolerance</label>
                          <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">{formData.geofence_radius} meters</span>
                        </div>
                        <input 
                          type="range" min="50" max="2000" step="50"
                          value={formData.geofence_radius}
                          onChange={(e) => setFormData({...formData, geofence_radius: parseInt(e.target.value)})}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Advanced Fallback */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="w-full p-3 flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold text-gray-700 uppercase tracking-wider"
                        >
                          <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Manual Fallback (Override)</span>
                          <span>{showAdvanced ? '−' : '+'}</span>
                        </button>
                        {showAdvanced && (
                          <div className="p-3 space-y-3">
                            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 flex items-start gap-1.5">
                              <Info className="w-4 h-4 shrink-0 mt-0.5" />
                              <p>If Nominatim fails, you can paste coordinates directly from Google Maps (e.g. <code>14.599, 120.984</code>) or type them manually.</p>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Paste Coordinates (Lat, Lon)</label>
                              <input 
                                type="text" placeholder="14.5995, 120.9842"
                                value={formData.coordinate_override}
                                onChange={(e) => handleCoordinateOverride(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-gray-800"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Latitude</label>
                                <input 
                                  type="number" step="any"
                                  value={formData.geofence_lat}
                                  onChange={(e) => setFormData({...formData, geofence_lat: parseFloat(e.target.value)})}
                                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-gray-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Longitude</label>
                                <input 
                                  type="number" step="any"
                                  value={formData.geofence_lon}
                                  onChange={(e) => setFormData({...formData, geofence_lon: parseFloat(e.target.value)})}
                                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-gray-800"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Pane - Visual Map */}
              {!isOfficeMode && (
                <div className="hidden lg:block lg:w-[55%] relative bg-gray-100 h-full min-h-[500px]">
                  <GeofenceMap 
                    lat={formData.geofence_lat}
                    lon={formData.geofence_lon}
                    radius={formData.geofence_radius}
                    onPositionChange={(pos) => setFormData({
                      ...formData,
                      geofence_lat: pos[0],
                      geofence_lon: pos[1],
                      coordinate_override: `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
                    })}
                  />
                  {/* Visualizer Help Overlay */}
                  <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur shadow-md border border-gray-200 p-3 rounded-lg text-xs max-w-xs pointer-events-none">
                    <p className="font-bold text-gray-900 mb-0.5">Interactive Geofence</p>
                    <p className="text-gray-600">The blue circle represents the valid clock-in zone. You can drag the marker to adjust the precise location.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || formData.technician_ids.length === 0 || !formData.client_name}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Dispatch & Geofence'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
