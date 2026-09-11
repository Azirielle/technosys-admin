'use client';

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, Filter, Calendar as CalendarIcon, MapPin, Map as MapIcon, Plus, X, User, Navigation, Info, Settings2,
  Edit3, UserCheck, Ban, CheckCircle2, AlertTriangle, RotateCcw, Users, Phone, DollarSign, UserPlus, Check,
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Award
} from "lucide-react";
import { 
  updateSchedule, reassignSchedule, cancelSchedule, createDispatchesWithCrew,
  getCasualHelpers, createCasualHelper, updateCasualHelper, toggleCasualHelperStatus 
} from "@/app/actions/schedules";

const GeofenceMap = dynamic(() => import("./GeofenceMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">Loading Interactive Map...</div>
});

export default function DispatchBoardClient() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-Level View Switcher
  const [viewTab, setViewTab] = useState<'dispatches' | 'casual_helpers'>('dispatches');
  
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
  
  // Show Cancelled Dispatches Toggle
  const [showCancelled, setShowCancelled] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [editAddressQuery, setEditAddressQuery] = useState("");
  const [editAddressResults, setEditAddressResults] = useState<any[]>([]);

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassigningSchedule, setReassigningSchedule] = useState<any>(null);
  const [newTechnicianId, setNewTechnicianId] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState<any>(null);
  const [cancelPreset, setCancelPreset] = useState("Client Rescheduled");
  const [cancelCustomNotes, setCancelCustomNotes] = useState("");
  
  // Search & Filter in Dispatch Modal
  const [techSearch, setTechSearch] = useState("");
  const [techFilterTier, setTechFilterTier] = useState<'all' | 'senior' | 'standard' | 'helper'>('all');

  // Lead & Support Crew State
  const [leadTechId, setLeadTechId] = useState<string>("");
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([]);
  const [selectedCasualHelperIds, setSelectedCasualHelperIds] = useState<string[]>([]);

  // Casual Helpers Register State
  const [casualHelpers, setCasualHelpers] = useState<any[]>([]);
  const [casualHelperLoading, setCasualHelperLoading] = useState(false);
  const [isCasualModalOpen, setIsCasualModalOpen] = useState(false);
  const [editingCasualHelper, setEditingCasualHelper] = useState<any>(null);
  const [casualForm, setCasualForm] = useState({
    fullName: "",
    contactNumber: "",
    dailyRate: 610.00,
    emergencyContact: "",
    notes: ""
  });
  const [casualSearch, setCasualSearch] = useState("");
  const [casualStatusFilter, setCasualStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
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
    fetchCasualHelpers();
  }, [dateFilter]);

  const fetchSchedules = async () => {
    setLoading(true);
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('schedules')
      .select('*, profiles!technician_id(full_name, role, technician_level), senior_partner:profiles!senior_partner_id(full_name), schedule_casual_helpers(id, casual_helper_id, casual_helpers(id, full_name, contact_number, daily_rate))')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });
      
    if (data) setSchedules(data);
    setLoading(false);
  };

  const fetchCasualHelpers = async () => {
    setCasualHelperLoading(true);
    const res = await getCasualHelpers();
    if (res?.success && res?.helpers) {
      setCasualHelpers(res.helpers);
    }
    setCasualHelperLoading(false);
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
    // Whitelist strictly field staff: technicians and regular helpers. Exclude administrative accounts.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, lifecycle_status, technician_level')
      .in('role', ['technician', 'helper'])
      .order('full_name');
    if (error) {
      console.error("Failed to fetch profiles:", error);
    }
    if (data) setProfiles(data);
  };

  // Autocomplete Search using internal geocode API proxy
  const searchAddress = async (query: string) => {
    setAddressQuery(query);
    setFormData(p => ({ ...p, location: query }));
    if (query.length >= 2) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const results = await res.json();
        setAddressResults(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error("Geocode search failed", e);
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

    if (isOfficeMode) {
      if (!leadTechId) {
        alert("Please select a technician for Office Duty.");
        return;
      }
      setIsSubmitting(true);
      const res = await createDispatchesWithCrew({
        leadTechnicianId: leadTechId,
        helperTechnicianIds: [],
        casualHelperIds: [],
        clientName: "Office Duty",
        location: "Pacita HQ",
        date: formData.date,
        startTime: formData.start_time,
        endTime: formData.end_time,
        attendanceMode: "hq",
        geofenceLat: 14.3541,
        geofenceLon: 121.0665,
        geofenceRadius: 100,
        attendanceTrackingMode: 'pacita_hq'
      });
      setIsSubmitting(false);
      if (res?.success) {
        setIsModalOpen(false);
        setLeadTechId("");
        setSelectedHelperIds([]);
        setSelectedCasualHelperIds([]);
        fetchSchedules();
      } else {
        alert(res?.error || "Error scheduling office hours.");
      }
      return;
    }

    if (!leadTechId) {
      alert("Operational Hierarchy Rule: Every dispatch requires a designated Lead Technician (Senior or Standard Technician). Helpers cannot be deployed unsupervised.");
      return;
    }

    if (!formData.client_name.trim()) {
      alert("Please enter a Client / Assignment name.");
      return;
    }

    setIsSubmitting(true);
    const res = await createDispatchesWithCrew({
      leadTechnicianId: leadTechId,
      helperTechnicianIds: selectedHelperIds,
      casualHelperIds: selectedCasualHelperIds,
      clientName: formData.client_name,
      location: formData.location,
      date: formData.date,
      startTime: formData.start_time,
      endTime: formData.end_time,
      attendanceMode: formData.attendance_mode,
      geofenceLat: formData.geofence_lat,
      geofenceLon: formData.geofence_lon,
      geofenceRadius: formData.geofence_radius,
      attendanceTrackingMode: formData.attendance_mode === 'hq' ? 'pacita_hq' : 'direct_on_site'
    });

    setIsSubmitting(false);
    if (res?.success) {
      setIsModalOpen(false);
      setLeadTechId("");
      setSelectedHelperIds([]);
      setSelectedCasualHelperIds([]);
      setFormData(p => ({ ...p, client_name: "", location: "" }));
      fetchSchedules();
      fetchCasualHelpers();
    } else {
      alert(res?.error || "Error creating dispatch.");
    }
  };

  const openRegisterCasualModal = (helperToEdit?: any) => {
    if (helperToEdit) {
      setEditingCasualHelper(helperToEdit);
      setCasualForm({
        fullName: helperToEdit.full_name,
        contactNumber: helperToEdit.contact_number,
        dailyRate: helperToEdit.daily_rate || 610.00,
        emergencyContact: helperToEdit.emergency_contact || "",
        notes: helperToEdit.notes || ""
      });
    } else {
      setEditingCasualHelper(null);
      setCasualForm({
        fullName: "",
        contactNumber: "",
        dailyRate: 610.00,
        emergencyContact: "",
        notes: ""
      });
    }
    setIsCasualModalOpen(true);
  };

  const handleSaveCasualHelper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casualForm.fullName.trim()) {
      alert("Full name is required.");
      return;
    }
    if (!casualForm.contactNumber.trim()) {
      alert("Contact number is required.");
      return;
    }

    setIsSubmitting(true);
    let res: any;
    if (editingCasualHelper) {
      res = await updateCasualHelper(editingCasualHelper.id, casualForm);
    } else {
      res = await createCasualHelper(casualForm);
      if (res.success && res.helper) {
        // If modal open, auto-select this new casual worker for the dispatch
        setSelectedCasualHelperIds(prev => [...prev, res.helper.id]);
      }
    }
    setIsSubmitting(false);

    if (res?.error) {
      alert(res.error);
    } else {
      setIsCasualModalOpen(false);
      setEditingCasualHelper(null);
      fetchCasualHelpers();
    }
  };

  const handleToggleCasualStatus = async (helper: any) => {
    const res = await toggleCasualHelperStatus(helper.id, helper.status);
    if (res?.error) {
      alert(res.error);
    } else {
      fetchCasualHelpers();
    }
  };

  const openEditModal = (schedule: any) => {
    const sDate = schedule.start_time ? new Date(schedule.start_time) : new Date();
    const eDate = schedule.end_time ? new Date(schedule.end_time) : new Date();
    const dateStr = sDate.toISOString().split('T')[0];
    const startTimeStr = sDate.toTimeString().slice(0, 5);
    const endTimeStr = schedule.end_time ? eDate.toTimeString().slice(0, 5) : "17:00";

    setEditFormData({
      id: schedule.id,
      technician_id: schedule.technician_id || "",
      client_name: schedule.client_name || "",
      location: schedule.location || "",
      date: dateStr,
      start_time: startTimeStr,
      end_time: endTimeStr,
      attendance_mode: schedule.attendance_mode || "direct_dispatch",
      geofence_lat: Number(schedule.geofence_lat) || 14.5995,
      geofence_lon: Number(schedule.geofence_lon) || 120.9842,
      geofence_radius: schedule.geofence_radius || 500,
      coordinate_override: `${schedule.geofence_lat || 14.5995}, ${schedule.geofence_lon || 120.9842}`
    });
    setEditAddressQuery(schedule.location || "");
    setEditAddressResults([]);
    setIsEditModalOpen(true);
  };

  const searchEditAddress = async (query: string) => {
    setEditAddressQuery(query);
    setEditFormData((p: any) => ({ ...p, location: query }));
    if (query.length >= 2) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const results = await res.json();
        setEditAddressResults(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error("Geocode search failed", e);
      }
    } else {
      setEditAddressResults([]);
    }
  };

  const selectEditAddress = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setEditFormData((p: any) => ({
      ...p,
      location: result.display_name,
      geofence_lat: lat,
      geofence_lon: lon,
      coordinate_override: `${lat}, ${lon}`
    }));
    setEditAddressQuery(result.display_name);
    setEditAddressResults([]);
  };

  const openReassignModal = (schedule: any) => {
    setReassigningSchedule(schedule);
    setNewTechnicianId("");
    setReassignReason("");
    setIsReassignModalOpen(true);
  };

  const openCancelModal = (schedule: any) => {
    setCancellingSchedule(schedule);
    setCancelPreset("Client Rescheduled");
    setCancelCustomNotes("");
    setIsCancelModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.id) return;
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append('scheduleId', editFormData.id);
    fd.append('clientName', editFormData.client_name);
    fd.append('location', editFormData.location);
    fd.append('startTime', `${editFormData.date}T${editFormData.start_time}:00`);
    if (editFormData.end_time) {
      fd.append('endTime', `${editFormData.date}T${editFormData.end_time}:00`);
    }
    fd.append('attendanceMode', editFormData.attendance_mode);
    if (editFormData.geofence_lat) fd.append('geofenceLat', editFormData.geofence_lat.toString());
    if (editFormData.geofence_lon) fd.append('geofenceLon', editFormData.geofence_lon.toString());
    if (editFormData.geofence_radius) fd.append('geofenceRadius', editFormData.geofence_radius.toString());
    if (editFormData.technician_id) fd.append('technicianId', editFormData.technician_id);

    const res = await updateSchedule(fd);
    setIsSubmitting(false);
    if (res?.error) {
      alert(res.error);
    } else {
      setIsEditModalOpen(false);
      setEditFormData(null);
      fetchSchedules();
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningSchedule || !newTechnicianId) {
      alert("Please select a replacement technician.");
      return;
    }
    setIsSubmitting(true);
    const res = await reassignSchedule(reassigningSchedule.id, newTechnicianId, null, reassignReason);
    setIsSubmitting(false);
    if (res?.error) {
      alert(res.error);
    } else {
      setIsReassignModalOpen(false);
      setReassigningSchedule(null);
      setNewTechnicianId("");
      setReassignReason("");
      fetchSchedules();
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSchedule) return;
    const finalReason = cancelPreset === 'Other' 
      ? cancelCustomNotes.trim() 
      : (cancelCustomNotes.trim() ? `${cancelPreset}: ${cancelCustomNotes.trim()}` : cancelPreset);

    if (!finalReason) {
      alert("Please enter a cancellation reason.");
      return;
    }

    setIsSubmitting(true);
    const res = await cancelSchedule(cancellingSchedule.id, finalReason);
    setIsSubmitting(false);
    if (res?.error) {
      alert(res.error);
    } else {
      setIsCancelModalOpen(false);
      setCancellingSchedule(null);
      setCancelPreset("Client Rescheduled");
      setCancelCustomNotes("");
      fetchSchedules();
    }
  };

  const filtered = schedules
    .filter(s => showCancelled ? true : s.status !== 'cancelled')
    .filter(s => 
      (s.profiles?.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      s.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.location?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'hq': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'direct_dispatch': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'out_of_town': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />In Duty</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Scheduled</span>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-none mb-1">
            {viewTab === 'dispatches' ? 'Scheduling & Dispatch' : 'Casual Helpers Register'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {viewTab === 'dispatches' 
              ? 'Manage daily field assignments, crew hierarchy, and geofences.' 
              : 'Register and manage on-demand casual support crew with daily-wage tracking.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewTab === 'dispatches' ? (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Dispatch
            </button>
          ) : (
            <button 
              onClick={() => openRegisterCasualModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Register Casual Worker
            </button>
          )}
        </div>
      </div>

      {/* Top View Switcher Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewTab('dispatches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            viewTab === 'dispatches'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
              : 'bg-white text-zinc-600 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/60'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          Active Dispatches ({filtered.length})
        </button>
        <button
          type="button"
          onClick={() => { setViewTab('casual_helpers'); fetchCasualHelpers(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            viewTab === 'casual_helpers'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
              : 'bg-white text-zinc-600 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Casual Helpers Register ({casualHelpers.length})
        </button>
      </div>

      {viewTab === 'dispatches' && (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-700 overflow-hidden flex flex-col flex-1 pb-6">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Search technician, client, location..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-9 pr-3 py-2 border border-zinc-200/80 dark:border-zinc-700 rounded-md leading-5 bg-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CalendarIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-3 pr-3 py-2 border border-zinc-200/80 dark:border-zinc-700 rounded-md leading-5 bg-white text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-medium cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none bg-white px-3 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800/60 shadow-2xs">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => { setShowCancelled(e.target.checked); setCurrentPage(1); }}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Show Cancelled ({schedules.filter(s => s.status === 'cancelled').length})</span>
            </label>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium hidden md:block">
              {new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full border-collapse border border-zinc-200/80 dark:border-zinc-700">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Technician</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Client / Assignment</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Location & Geofence</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Time Window</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Mode</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Status</th>
                <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="border border-zinc-200/80 dark:border-zinc-700 px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 font-medium">Loading schedule...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-zinc-200/80 dark:border-zinc-700 px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 font-medium">No dispatches found for this date.</td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className={`hover:bg-blue-50/50 transition-colors ${s.status === 'cancelled' ? 'bg-zinc-50/70 opacity-75' : ''}`}>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${s.technician_id ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {s.profiles?.full_name || (s.technician_id ? 'Unknown Staff' : 'Unassigned')}
                            </span>
                            {s.profiles?.technician_level === 'senior' && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200">
                                SENIOR
                              </span>
                            )}
                            {s.profiles?.role === 'helper' && (
                              <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded uppercase tracking-wider border border-zinc-200">
                                HELPER
                              </span>
                            )}
                          </div>
                          {s.senior_partner?.full_name && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                              Lead: {s.senior_partner.full_name}
                            </span>
                          )}
                          {s.schedule_casual_helpers && s.schedule_casual_helpers.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200" 
                                title={s.schedule_casual_helpers.map((sch: any) => `${sch.casual_helpers?.full_name || 'Worker'} (${sch.casual_helpers?.contact_number || 'No phone'})`).join('\n')}
                              >
                                <Users className="w-2.5 h-2.5 text-blue-500" />
                                +{s.schedule_casual_helpers.length} Casual Helper{s.schedule_casual_helpers.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4">
                      <p className={`text-sm font-bold ${s.status === 'cancelled' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{s.client_name}</p>
                      {s.cancellation_reason && (
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                          Cancelled: {s.cancellation_reason}
                        </p>
                      )}
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-1.5 text-sm text-zinc-900 dark:text-zinc-100">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.location}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                          <span>{s.geofence_lat?.toFixed(5)}, {s.geofence_lon?.toFixed(5)}</span>
                          <span className="px-1.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200/80 dark:border-zinc-800">{s.geofence_radius}m radius</span>
                        </div>
                      </div>
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">to {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded border text-[10px] uppercase font-bold tracking-wider ${getModeBadge(s.attendance_mode)}`}>
                        {s.attendance_mode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          disabled={s.status === 'cancelled'}
                          title={s.status === 'cancelled' ? "Cannot edit cancelled dispatch" : "Edit Dispatch Details"}
                          className="p-1.5 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openReassignModal(s)}
                          disabled={s.status === 'cancelled'}
                          title={s.status === 'cancelled' ? "Cannot reassign cancelled dispatch" : "Reassign Technician"}
                          className="p-1.5 text-zinc-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openCancelModal(s)}
                          disabled={s.status === 'cancelled'}
                          title={s.status === 'cancelled' ? "Already cancelled" : "Cancel Dispatch"}
                          className="p-1.5 text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/60 px-4 py-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between mt-auto">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length) || 0}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-semibold">{filtered.length}</span> results
          </p>
          <nav className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-l-md border border-zinc-200/80 dark:border-zinc-700 bg-white text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-800/60 disabled:opacity-50 text-sm font-medium"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-2 border-t border-b border-zinc-200/80 dark:border-zinc-800 text-sm font-medium ${currentPage === i + 1 ? 'bg-blue-50 text-blue-600 border-blue-200 z-10' : 'bg-white text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-800/60'} -ml-px`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-2 rounded-r-md border border-zinc-200/80 dark:border-zinc-700 border-l bg-white text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-800/60 disabled:opacity-50 -ml-px text-sm font-medium"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
      )}

      {/* Casual Helpers Register View */}
      {viewTab === 'casual_helpers' && (
        <div className="flex flex-col flex-1 gap-5 overflow-y-auto">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Helpers</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{casualHelpers.length}</p>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">On-demand registered roster</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active on Roster</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {casualHelpers.filter(c => c.status === 'active').length}
                </p>
                <span className="text-[10px] text-emerald-600/80 font-medium">Ready for deployment</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Dispatches Handled</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {casualHelpers.reduce((sum, c) => sum + (c.dispatch_count || 0), 0)}
                </p>
                <span className="text-[10px] text-amber-600/80 font-medium">Total missions completed</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">NCR Daily Baseline</p>
                <p className="text-2xl font-black text-blue-700 mt-1">₱610.00</p>
                <span className="text-[10px] text-blue-600/80 font-medium">DOLE Statutory baseline</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Casual Helpers Catalog Table */}
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-700 overflow-hidden flex flex-col flex-1 pb-4">
            {/* Toolbar */}
            <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search casual helper name, phone, notes..."
                    value={casualSearch}
                    onChange={(e) => setCasualSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-zinc-200/80 dark:border-zinc-700 rounded-md leading-5 bg-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-zinc-200/80 dark:border-zinc-700 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setCasualStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${casualStatusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-100'}`}
                  >
                    All ({casualHelpers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCasualStatusFilter('active')}
                    className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${casualStatusFilter === 'active' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-100'}`}
                  >
                    Active ({casualHelpers.filter(c => c.status === 'active').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCasualStatusFilter('inactive')}
                    className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${casualStatusFilter === 'inactive' ? 'bg-rose-50 text-rose-700' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-100'}`}
                  >
                    Inactive ({casualHelpers.filter(c => c.status !== 'active').length})
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openRegisterCasualModal()}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                + Register New Worker
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3">Worker Name & Operational Notes</th>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3">Contact Phone</th>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-right">Daily Wage Rate</th>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center">Missions Handled</th>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center">Status</th>
                    <th className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                  {casualHelpers
                    .filter(c => casualStatusFilter === 'all' ? true : casualStatusFilter === 'active' ? c.status === 'active' : c.status !== 'active')
                    .filter(c => 
                      c.full_name.toLowerCase().includes(casualSearch.toLowerCase()) ||
                      (c.contact_number || '').includes(casualSearch) ||
                      (c.notes || '').toLowerCase().includes(casualSearch.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-zinc-500 dark:text-zinc-400 font-medium">
                          No casual helpers match the specified criteria.
                        </td>
                      </tr>
                    ) : (
                      casualHelpers
                        .filter(c => casualStatusFilter === 'all' ? true : casualStatusFilter === 'active' ? c.status === 'active' : c.status !== 'active')
                        .filter(c => 
                          c.full_name.toLowerCase().includes(casualSearch.toLowerCase()) ||
                          (c.contact_number || '').includes(casualSearch) ||
                          (c.notes || '').toLowerCase().includes(casualSearch.toLowerCase())
                        )
                        .map((ch) => (
                          <tr key={ch.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 font-bold text-xs">
                                  {ch.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ch.full_name}</span>
                                  {ch.notes && (
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{ch.notes}</span>
                                  )}
                                  {ch.emergency_contact && (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Emergency: {ch.emergency_contact}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                <Phone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                                <span>{ch.contact_number}</span>
                              </div>
                            </td>
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                ₱{Number(ch.daily_rate).toFixed(2)}/day
                              </span>
                            </td>
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5 whitespace-nowrap text-center">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200/80 dark:border-zinc-800">
                                {ch.dispatch_count || 0} missions
                              </span>
                            </td>
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                ch.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}>
                                {ch.status}
                              </span>
                            </td>
                            <td className="border border-zinc-200/80 dark:border-zinc-700 px-4 py-3.5 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openRegisterCasualModal(ch)}
                                  title="Edit Worker Details"
                                  className="p-1.5 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCasualStatus(ch)}
                                  title={ch.status === 'active' ? 'Deactivate Worker' : 'Activate Worker'}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    ch.status === 'active'
                                      ? 'text-emerald-600 hover:text-rose-600 hover:bg-rose-50'
                                      : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Casual Worker Modal */}
      {isCasualModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {editingCasualHelper ? 'Edit Casual Worker' : 'Register Casual Worker'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">On-demand support crew without app accounts.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCasualModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCasualHelper} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rommel Bautista"
                  value={casualForm.fullName}
                  onChange={(e) => setCasualForm({ ...casualForm, fullName: e.target.value })}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="0917-xxx-xxxx"
                    value={casualForm.contactNumber}
                    onChange={(e) => setCasualForm({ ...casualForm, contactNumber: e.target.value })}
                    className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Daily Wage Rate (₱) *</label>
                  <input
                    type="number"
                    step="10"
                    min="500"
                    required
                    value={casualForm.dailyRate}
                    onChange={(e) => setCasualForm({ ...casualForm, dailyRate: parseFloat(e.target.value) || 610 })}
                    className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Emergency Contact (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Elena Bautista (0918-xxx-xxxx)"
                  value={casualForm.emergencyContact}
                  onChange={(e) => setCasualForm({ ...casualForm, emergencyContact: e.target.value })}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Skills / Operational Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Certified for heavy lifting, grease trap cleaning, safety boots equipped"
                  value={casualForm.notes}
                  onChange={(e) => setCasualForm({ ...casualForm, notes: e.target.value })}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCasualModalOpen(false)}
                  className="px-4 py-2 bg-white border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Saving...' : editingCasualHelper ? 'Update Worker' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 transition-all duration-300 ${isOfficeMode ? 'max-w-md' : 'max-w-5xl'}`}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isOfficeMode ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {isOfficeMode ? 'Schedule Office Hours' : 'Smart Dispatch'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {isOfficeMode ? 'Assign tech to HQ' : 'Assign tech and configure geofence'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Mode Switcher */}
            <div className="bg-white border-b border-zinc-100 p-2 flex justify-center">
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => toggleOfficeMode(false)}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${!isOfficeMode ? 'bg-white shadow-sm text-blue-700 border border-zinc-200/80 dark:border-zinc-800' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'}`}
                >
                  Standard Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => toggleOfficeMode(true)}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-colors ${isOfficeMode ? 'bg-white shadow-sm text-emerald-700 border border-zinc-200/80 dark:border-zinc-800' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'}`}
                >
                  HQ / Office Mode
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={`flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden ${isOfficeMode ? '' : 'h-[65vh] min-h-[400px]'}`}>
              
              {/* Left Pane - Form */}
              <div className={`w-full p-6 overflow-y-auto flex flex-col gap-5 ${isOfficeMode ? '' : 'lg:w-[45%] border-r border-zinc-100'}`}>
                
                {/* Tech & Time */}
                <div className="grid grid-cols-1 gap-4">
                  {isOfficeMode ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                        HQ Duty Technician *
                      </label>
                      <select
                        value={leadTechId}
                        onChange={(e) => setLeadTechId(e.target.value)}
                        className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 bg-white"
                      >
                        <option value="">-- Choose Field Staff --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} disabled={p.lifecycle_status === 'on_leave'}>
                            {p.full_name} ({p.technician_level === 'senior' ? 'Senior Tech' : p.role === 'helper' ? 'Helper' : 'Technician'}){p.lifecycle_status === 'on_leave' ? ' - ON LEAVE' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Section 1: Lead Technician */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                              1. Lead Technician <span className="text-rose-500">*</span>
                            </label>
                          </div>
                          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md">
                            <button
                              type="button"
                              onClick={() => setTechFilterTier('all')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${techFilterTier === 'all' ? 'bg-white shadow-xs text-blue-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200'}`}
                            >
                              All Techs
                            </button>
                            <button
                              type="button"
                              onClick={() => setTechFilterTier('senior')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${techFilterTier === 'senior' ? 'bg-white shadow-xs text-amber-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200'}`}
                            >
                              Senior Only
                            </button>
                          </div>
                        </div>
                        
                        <div className="border border-zinc-200/80 dark:border-zinc-700 rounded-lg overflow-hidden flex flex-col bg-white">
                          <div className="p-2 border-b border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                            <input 
                              type="text" 
                              placeholder="Search lead technician..." 
                              value={techSearch}
                              onChange={(e) => setTechSearch(e.target.value)}
                              className="w-full bg-transparent text-xs outline-none placeholder-zinc-400 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div className="max-h-36 overflow-y-auto p-1 bg-white divide-y divide-zinc-50">
                            {profiles
                              .filter(p => p.role === 'technician')
                              .filter(p => techFilterTier === 'senior' ? p.technician_level === 'senior' : true)
                              .filter(p => p.full_name.toLowerCase().includes(techSearch.toLowerCase()))
                              .map(p => {
                                const isSelected = leadTechId === p.id;
                                const isBusy = busyTechIds.includes(p.id);
                                const isOnLeave = p.lifecycle_status === 'on_leave';
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      if (!isOnLeave) {
                                        setLeadTechId(p.id);
                                        setSelectedHelperIds(prev => prev.filter(id => id !== p.id));
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                                      isOnLeave ? 'opacity-40 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/60' : isSelected ? 'bg-blue-50 border border-blue-200 shadow-xs' : 'hover:bg-zinc-50 dark:bg-zinc-800/60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200'}`}>
                                        {isSelected ? <Check className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                          {p.full_name}
                                        </span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                          {p.technician_level === 'senior' ? (
                                            <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1 py-0.2 rounded border border-amber-200 uppercase">SENIOR</span>
                                          ) : (
                                            <span className="text-[8px] font-bold bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200 uppercase">TECH</span>
                                          )}
                                          {isOnLeave ? (
                                            <span className="text-[8px] font-bold text-rose-600">ON LEAVE</span>
                                          ) : isBusy ? (
                                            <span className="text-[8px] font-bold text-amber-600">BUSY</span>
                                          ) : (
                                            <span className="text-[8px] font-bold text-emerald-600">AVAILABLE</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Lead
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Support Crew - Regular Helpers */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                            2. Company Helpers ({selectedHelperIds.length} selected)
                          </label>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Regular field assistants</span>
                        </div>
                        <div className="border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-1.5 max-h-28 overflow-y-auto bg-white space-y-1">
                          {profiles
                            .filter(p => (p.role === 'helper' || p.technician_level === 'helper') && p.id !== leadTechId)
                            .map(p => {
                              const isChecked = selectedHelperIds.includes(p.id);
                              const isOnLeave = p.lifecycle_status === 'on_leave';
                              return (
                                <label key={p.id} className={`flex items-center gap-2.5 p-1.5 rounded cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/70' : 'hover:bg-zinc-50 dark:bg-zinc-800/60'}`}>
                                  <input
                                    type="checkbox"
                                    disabled={isOnLeave}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedHelperIds([...selectedHelperIds, p.id]);
                                      } else {
                                        setSelectedHelperIds(selectedHelperIds.filter(id => id !== p.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                                  />
                                  <div className="flex items-center justify-between flex-1 min-w-0">
                                    <span className={`text-xs font-medium truncate ${isOnLeave ? 'text-zinc-400 dark:text-zinc-500 line-through' : isChecked ? 'text-blue-900 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                      {p.full_name}
                                    </span>
                                    <span className="text-[8px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded uppercase">
                                      {isOnLeave ? 'ON LEAVE' : 'HELPER'}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      {/* Section 3: Support Crew - Casual Helpers */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                            3. Casual Helpers ({selectedCasualHelperIds.length} selected)
                          </label>
                          <button
                            type="button"
                            onClick={() => openRegisterCasualModal()}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer"
                          >
                            + Quick Register
                          </button>
                        </div>
                        <div className="border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-1.5 max-h-28 overflow-y-auto bg-white space-y-1">
                          {casualHelpers.filter(ch => ch.status === 'active').length === 0 ? (
                            <div className="p-2 text-center text-xs text-zinc-400 dark:text-zinc-500">No active casual helpers registered</div>
                          ) : (
                            casualHelpers.filter(ch => ch.status === 'active').map(ch => {
                              const isChecked = selectedCasualHelperIds.includes(ch.id);
                              return (
                                <label key={ch.id} className={`flex items-center gap-2.5 p-1.5 rounded cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/70' : 'hover:bg-zinc-50 dark:bg-zinc-800/60'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCasualHelperIds([...selectedCasualHelperIds, ch.id]);
                                      } else {
                                        setSelectedCasualHelperIds(selectedCasualHelperIds.filter(id => id !== ch.id));
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                  />
                                  <div className="flex items-center justify-between flex-1 min-w-0">
                                    <div className="flex flex-col min-w-0">
                                      <span className={`text-xs font-medium truncate ${isChecked ? 'text-blue-900 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        {ch.full_name}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{ch.contact_number}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      ₱{Number(ch.daily_rate).toFixed(0)}/day
                                    </span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Hierarchy Alert Banner */}
                      {!leadTechId && (selectedHelperIds.length > 0 || selectedCasualHelperIds.length > 0) && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Hierarchy Rule: </span>
                            A Lead Technician must be selected. Support crew cannot be dispatched without a Senior or Standard Technician.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isOfficeMode && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Client / Assignment</label>
                      <input 
                        type="text" required placeholder="e.g. Ayala Malls Routine Inspect"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Date</label>
                      <input 
                        type="date" required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    {!isOfficeMode && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Mode</label>
                        <select 
                          value={formData.attendance_mode}
                          onChange={(e) => setFormData({...formData, attendance_mode: e.target.value})}
                          className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                        >
                          <option value="direct_dispatch">Direct Dispatch</option>
                          <option value="out_of_town">Out of Town</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Start Time</label>
                      <input 
                        type="time" required
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">End Time</label>
                      <input 
                        type="time" required
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {!isOfficeMode && (
                  <>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-700 w-full my-1"></div>

                    {/* Geofence Engine */}
                    <div>
                      <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MapIcon className="w-3.5 h-3.5" /> Geofence Configuration
                      </label>
                      
                      <div className="relative mb-3">
                        <input 
                          type="text" 
                          placeholder="Search PH Address (Nominatim)..."
                          value={addressQuery}
                          onChange={(e) => searchAddress(e.target.value)}
                          className="w-full border border-blue-200 rounded-lg p-2.5 pl-9 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                        />
                        <Search className="absolute left-3 top-3 w-4 h-4 text-blue-400" />
                        
                        {/* Autocomplete Dropdown */}
                        {addressResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200/80 dark:border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {addressResults.map((res: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => selectAddress(res)}
                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-zinc-100 last:border-0 text-sm flex items-start gap-2"
                              >
                                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 line-clamp-2">{res.display_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Radius Tolerance</label>
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{formData.geofence_radius} meters</span>
                        </div>
                        <input 
                          type="range" min="50" max="2000" step="50"
                          value={formData.geofence_radius}
                          onChange={(e) => setFormData({...formData, geofence_radius: parseInt(e.target.value)})}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>

                      {/* Advanced Fallback */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="w-full p-3 flex justify-between items-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 transition-colors text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
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
                              <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Paste Coordinates (Lat, Lon)</label>
                              <input 
                                type="text" placeholder="14.5995, 120.9842"
                                value={formData.coordinate_override}
                                onChange={(e) => handleCoordinateOverride(e.target.value)}
                                className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono text-zinc-800 dark:text-zinc-200"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Latitude</label>
                                <input 
                                  type="number" step="any"
                                  value={formData.geofence_lat}
                                  onChange={(e) => setFormData({...formData, geofence_lat: parseFloat(e.target.value)})}
                                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono text-zinc-800 dark:text-zinc-200"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-1">Longitude</label>
                                <input 
                                  type="number" step="any"
                                  value={formData.geofence_lon}
                                  onChange={(e) => setFormData({...formData, geofence_lon: parseFloat(e.target.value)})}
                                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono text-zinc-800 dark:text-zinc-200"
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
                <div className="hidden lg:block lg:w-[55%] relative bg-zinc-100 dark:bg-zinc-800 h-full min-h-[500px]">
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
                  <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur shadow-md border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg text-xs max-w-xs pointer-events-none">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">Interactive Geofence</p>
                    <p className="text-zinc-600">The blue circle represents the valid clock-in zone. You can drag the marker to adjust the precise location.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:bg-zinc-800/60 shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || (isOfficeMode ? !leadTechId : (!leadTechId || !formData.client_name))}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : 'Create Dispatch & Geofence'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Edit Dispatch Modal */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-zinc-200/80 dark:border-zinc-800 transition-all duration-300 max-w-5xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Edit Field Dispatch</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Update assignment details, timing, and site geofence.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
              {/* Left Pane - Form Fields */}
              <div className="w-full lg:w-[45%] p-6 space-y-4 overflow-y-auto max-h-[600px]">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Client / Assignment</label>
                  <input 
                    type="text" required
                    value={editFormData.client_name}
                    onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
                    className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Date</label>
                    <input 
                      type="date" required
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Attendance Mode</label>
                    <select
                      value={editFormData.attendance_mode}
                      onChange={(e) => setEditFormData({ ...editFormData, attendance_mode: e.target.value })}
                      className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="direct_dispatch">Direct Dispatch</option>
                      <option value="hq">Office / HQ</option>
                      <option value="out_of_town">Out of Town</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Start Time</label>
                    <input 
                      type="time" required
                      value={editFormData.start_time}
                      onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                      className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">End Time</label>
                    <input 
                      type="time" required
                      value={editFormData.end_time}
                      onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                      className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Location Search */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Site Address / Search</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Type landmark or search address..."
                      value={editAddressQuery}
                      onChange={(e) => searchEditAddress(e.target.value)}
                      className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    />
                    {editAddressResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-[500] bg-white border border-zinc-200/80 dark:border-zinc-800 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-zinc-100">
                        {editAddressResults.map((r: any, idx: number) => (
                          <div 
                            key={idx}
                            onClick={() => selectEditAddress(r)}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                          >
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{r.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Radius Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Geofence Radius</label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {editFormData.geofence_radius}m
                    </span>
                  </div>
                  <input 
                    type="range" min="50" max="2000" step="25"
                    value={editFormData.geofence_radius}
                    onChange={(e) => setEditFormData({ ...editFormData, geofence_radius: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                    <span>50m (Strict)</span>
                    <span>500m (Standard)</span>
                    <span>2000m (Wide Area)</span>
                  </div>
                </div>
              </div>

              {/* Right Pane - Visual Map */}
              <div className="hidden lg:block lg:w-[55%] relative bg-zinc-100 dark:bg-zinc-800 h-full min-h-[500px]">
                <GeofenceMap 
                  lat={editFormData.geofence_lat}
                  lon={editFormData.geofence_lon}
                  radius={editFormData.geofence_radius}
                  onPositionChange={(pos) => setEditFormData({
                    ...editFormData,
                    geofence_lat: pos[0],
                    geofence_lon: pos[1],
                    coordinate_override: `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
                  })}
                />
                <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur shadow-md border border-zinc-200/80 dark:border-zinc-800 p-3 rounded-lg text-xs max-w-xs pointer-events-none">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">Drag to Adjust Location</p>
                  <p className="text-zinc-600">The blue circle is the geofence perimeter. Coordinates update automatically.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:bg-zinc-800/60 shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSubmit}
                disabled={isSubmitting || !editFormData.client_name}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Dispatch Updates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Technician Modal */}
      {isReassignModalOpen && reassigningSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Reassign Technician</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Transfer assignment to replacement personnel.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReassignModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Client:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{reassigningSchedule.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Current Assignee:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{reassigningSchedule.profiles?.full_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Schedule Date:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{new Date(reassigningSchedule.start_time).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Select Replacement Technician</label>
                <select
                  value={newTechnicianId}
                  onChange={(e) => setNewTechnicianId(e.target.value)}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 bg-white"
                >
                  <option value="">-- Choose Active Field Technician --</option>
                  {profiles
                    .filter(p => p.role === 'technician')
                    .filter(p => p.id !== reassigningSchedule.technician_id)
                    .map(p => (
                      <option key={p.id} value={p.id} disabled={p.lifecycle_status === 'on_leave'}>
                        {p.full_name} ({p.technician_level === 'senior' ? 'Senior Tech' : 'Technician'}){p.lifecycle_status === 'on_leave' ? ' - ON LEAVE' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Transfer Note / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Assigned tech reported illness"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-4 py-2 bg-white border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:bg-zinc-800/60 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleReassignSubmit}
                disabled={isSubmitting || !newTechnicianId}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Dispatch Modal */}
      {isCancelModalOpen && cancellingSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200/80 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-rose-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Cancel Dispatch</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Record operational reason and notify technician.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Client:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{cancellingSchedule.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Technician:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{cancellingSchedule.profiles?.full_name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Mandatory Cancellation Reason</label>
                <select
                  value={cancelPreset}
                  onChange={(e) => setCancelPreset(e.target.value)}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 bg-white mb-2"
                >
                  <option value="Client Rescheduled">Client Rescheduled</option>
                  <option value="Site Inaccessible / Severe Weather">Site Inaccessible / Severe Weather</option>
                  <option value="Technician Emergency / Illness">Technician Emergency / Illness</option>
                  <option value="Operational / Priority Reallocation">Operational / Priority Reallocation</option>
                  <option value="Duplicate Dispatch Entry">Duplicate Dispatch Entry</option>
                  <option value="Other">Other Reason (Specify below)</option>
                </select>

                <textarea
                  rows={3}
                  placeholder="Additional context or operational explanation..."
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  className="w-full border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-rose-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 bg-white border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:bg-zinc-800/60 text-xs cursor-pointer"
              >
                Keep Dispatch
              </button>
              <button 
                onClick={handleCancelSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
