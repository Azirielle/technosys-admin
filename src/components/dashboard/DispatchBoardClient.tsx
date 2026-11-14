'use client'

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import ModalDialog from "@/components/ui/ModalDialog";
import { 
  Calendar as CalendarIcon, Users, UserPlus, Search, Plus, X, 
  MapPin, Check, User, AlertTriangle 
} from "lucide-react";

import { 
  updateSchedule, reassignSchedule, cancelSchedule,
  getCasualHelpers, createCasualHelper, updateCasualHelper, toggleCasualHelperStatus 
} from "@/app/actions/schedules";

// Scheduling Modular Subcomponents
import { 
  ScheduleItem, ProfileItem, CasualHelperItem, 
  HorizonGranularity, ViewMode, AssignmentTypeFilter, AssignmentType,
  formatLocalDate 
} from "./scheduling/types";
import SchedulingKpis from "./scheduling/SchedulingKpis";
import HorizonFilterBar from "./scheduling/HorizonFilterBar";
import ScheduleTableView from "./scheduling/ScheduleTableView";
import ScheduleTimelineView from "./scheduling/ScheduleTimelineView";
import ScheduleMonthCalendarView from "./scheduling/ScheduleMonthCalendarView";
import TechnicianRosterDrawer from "./scheduling/TechnicianRosterDrawer";
import SteppedDispatchDrawer from "./scheduling/SteppedDispatchDrawer";
import DeploymentDrawer from "./scheduling/DeploymentDrawer";
import OfficeDutyDrawer from "./scheduling/OfficeDutyDrawer";
import QuickRescheduleDrawer from "./scheduling/QuickRescheduleDrawer";
import NewAssignmentModal from "./scheduling/NewAssignmentModal";

import Pagination from "@/components/ui/Pagination";
import { 
  TableContainer, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, 
  TableEmptyState, StatusDot, MutedBadge 
} from "@/components/ui/DataTable";

export default function DispatchBoardClient() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-Level View Switcher
  const [viewTab, setViewTab] = useState<'dispatches' | 'casual_helpers'>('dispatches');

  // Horizon & Filter States
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [granularity, setGranularity] = useState<HorizonGranularity>('day');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<AssignmentTypeFilter>('all');
  const [kpiFilter, setKpiFilter] = useState<'all' | 'unassigned' | 'conflicts'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showCancelled, setShowCancelled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // KPI Metrics State
  const [kpiMetrics, setKpiMetrics] = useState({
    onSiteCount: 0,
    deploymentsCount: 0,
    needsTeamCount: 0,
    conflictsCount: 0
  });

  // Creation & Modular Drawer States
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);
  const [isDispatchDrawerOpen, setIsDispatchDrawerOpen] = useState(false);
  const [isDeploymentDrawerOpen, setIsDeploymentDrawerOpen] = useState(false);
  const [isOfficeDutyDrawerOpen, setIsOfficeDutyDrawerOpen] = useState(false);
  const [isRosterDrawerOpen, setIsRosterDrawerOpen] = useState(false);
  const [preselectedTechId, setPreselectedTechId] = useState<string | undefined>(undefined);
  const [initialScheduleForDispatch, setInitialScheduleForDispatch] = useState<any | null>(null);

  // Quick Reschedule Drawer State
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);
  const [reschedulingSchedule, setReschedulingSchedule] = useState<ScheduleItem | null>(null);
  const [rescheduleDrawerTab, setRescheduleDrawerTab] = useState<'reschedule' | 'edit_details' | 'history'>('reschedule');

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassigningSchedule, setReassigningSchedule] = useState<ScheduleItem | null>(null);
  const [newTechnicianId, setNewTechnicianId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState<ScheduleItem | null>(null);
  const [cancelPreset, setCancelPreset] = useState("");
  const [cancelCustomNotes, setCancelCustomNotes] = useState("");

  // Casual Helpers Register State
  const [casualHelpers, setCasualHelpers] = useState<CasualHelperItem[]>([]);
  const [casualHelperLoading, setCasualHelperLoading] = useState(false);
  const [isCasualModalOpen, setIsCasualModalOpen] = useState(false);
  const [editingCasualHelper, setEditingCasualHelper] = useState<any>(null);
  const [casualSearch, setCasualSearch] = useState("");
  const [casualStatusFilter, setCasualStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [casualCurrentPage, setCasualCurrentPage] = useState(1);
  const [casualForm, setCasualForm] = useState({
    fullName: "",
    contactNumber: "",
    dailyRate: 610.00,
    emergencyContact: "",
    notes: ""
  });

  // Schedule Collision / Conflict Detector
  const detectConflicts = (items: ScheduleItem[]): Set<string> => {
    const conflictedIds = new Set<string>();
    const activeItems = items.filter(s => s.status !== 'cancelled');

    for (let i = 0; i < activeItems.length; i++) {
      const a = activeItems[i];
      const aStart = new Date(a.start_time).getTime();
      const aEnd = a.end_time ? new Date(a.end_time).getTime() : aStart + 2 * 3600000;

      const aTechs = new Set<string>();
      if (a.technician_id) aTechs.add(a.technician_id);
      a.schedule_crew_assignments?.forEach(c => {
        if (c.status === 'active' && c.technician_id) aTechs.add(c.technician_id);
      });

      if (aTechs.size === 0) continue;

      for (let j = i + 1; j < activeItems.length; j++) {
        const b = activeItems[j];
        const bStart = new Date(b.start_time).getTime();
        const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart + 2 * 3600000;

        // Overlap in active hours
        if (aStart < bEnd && aEnd > bStart) {
          let sharesTech = false;
          if (b.technician_id && aTechs.has(b.technician_id)) {
            sharesTech = true;
          }
          if (!sharesTech && b.schedule_crew_assignments) {
            sharesTech = b.schedule_crew_assignments.some(
              c => c.status === 'active' && aTechs.has(c.technician_id)
            );
          }
          if (sharesTech) {
            conflictedIds.add(a.id);
            conflictedIds.add(b.id);
          }
        }
      }
    }
    return conflictedIds;
  };

  // Initial Fetch & Refresh on Horizon / Granularity / Date Change
  useEffect(() => {
    fetchSchedules();
    fetchProfiles();
    fetchCasualHelpers();
  }, [currentDate, granularity]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          profiles!technician_id(full_name, role, technician_level, is_driver),
          senior_partner:profiles!senior_partner_id(full_name),
          schedule_crew_assignments:schedule_crew(
            id, technician_id, assignment_role, status, joined_at, released_at, notes,
            profiles(full_name, role, technician_level, is_driver)
          ),
          schedule_casual_helpers(id, casual_helper_id, casual_helpers(id, full_name, contact_number, daily_rate))
        `);

      let startWindow: Date;
      let endWindow: Date;

      if (granularity === 'day') {
        startWindow = new Date(currentDate);
        startWindow.setHours(0, 0, 0, 0);
        endWindow = new Date(currentDate);
        endWindow.setHours(23, 59, 59, 999);

        query = query
          .gte('start_time', startWindow.toISOString())
          .lte('start_time', endWindow.toISOString())
          .order('start_time', { ascending: true });
      } else if (granularity === 'week') {
        startWindow = new Date(currentDate);
        const day = startWindow.getDay();
        const diff = startWindow.getDate() - day + (day === 0 ? -6 : 1);
        startWindow.setDate(diff);
        startWindow.setHours(0, 0, 0, 0);
        endWindow = new Date(startWindow);
        endWindow.setDate(startWindow.getDate() + 6);
        endWindow.setHours(23, 59, 59, 999);

        query = query
          .gte('start_time', startWindow.toISOString())
          .lte('start_time', endWindow.toISOString())
          .order('start_time', { ascending: true });
      } else if (granularity === 'month') {
        startWindow = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
        endWindow = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

        query = query
          .gte('start_time', startWindow.toISOString())
          .lte('start_time', endWindow.toISOString())
          .order('start_time', { ascending: true });
      } else {
        // 'past'
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        startWindow = new Date(0);
        endWindow = startOfToday;

        query = query
          .lt('start_time', startOfToday.toISOString())
          .order('start_time', { ascending: false });
      }

      const { data: regularData, error: regularErr } = await query;
      if (regularErr) throw regularErr;

      let combined = (regularData || []) as unknown as ScheduleItem[];

      // If viewing active horizon, pull ongoing multi-day deployments that started earlier
      if (granularity !== 'past') {
        const { data: ongoingDeployments } = await supabase
          .from('schedules')
          .select(`
            *,
            profiles!technician_id(full_name, role, technician_level, is_driver),
            senior_partner:profiles!senior_partner_id(full_name),
            schedule_crew_assignments:schedule_crew(
              id, technician_id, assignment_role, status, joined_at, released_at, notes,
              profiles(full_name, role, technician_level, is_driver)
            ),
            schedule_casual_helpers(id, casual_helper_id, casual_helpers(id, full_name, contact_number, daily_rate))
          `)
          .eq('assignment_type', 'deployment')
          .neq('status', 'cancelled')
          .lte('start_time', endWindow.toISOString());

        if (ongoingDeployments && ongoingDeployments.length > 0) {
          const existingIds = new Set(combined.map(s => s.id));
          ongoingDeployments.forEach((dep: any) => {
            if (!existingIds.has(dep.id)) {
              const depEnd = dep.end_time 
                ? new Date(dep.end_time).getTime() 
                : (dep.target_review_date ? new Date(dep.target_review_date).getTime() : Infinity);
              if (depEnd >= startWindow.getTime()) {
                combined.push(dep);
              }
            }
          });
        }
      }

      setSchedules(combined);

      // Compute Period-Aware KPI Metrics
      const onSite = combined.filter(s => (s.assignment_type === 'on_site' || !s.assignment_type) && s.status !== 'cancelled').length;
      const deployments = combined.filter(s => s.assignment_type === 'deployment' && s.status !== 'cancelled').length;
      const needsTeam = combined.filter(s => (!s.technician_id || s.status === 'unassigned') && s.status !== 'cancelled').length;
      const conflicts = detectConflicts(combined).size;

      setKpiMetrics({
        onSiteCount: onSite,
        deploymentsCount: deployments,
        needsTeamCount: needsTeam,
        conflictsCount: conflicts
      });
    } catch (err: any) {
      console.error("Failed to fetch schedules:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, lifecycle_status, technician_level, is_driver')
      .in('role', ['technician', 'helper'])
      .order('full_name');
    if (data) setProfiles(data as any[]);
  };

  const fetchCasualHelpers = async () => {
    setCasualHelperLoading(true);
    const res = await getCasualHelpers();
    if (res?.success && res?.helpers) {
      setCasualHelpers(res.helpers);
    }
    setCasualHelperLoading(false);
  };

  // Conflict IDs memoized for the active list
  const conflictedScheduleIds = useMemo(() => detectConflicts(schedules), [schedules]);

  // Filtered schedules for search, assignment type filter, cancelled toggle, and kpi click filter
  const filteredSchedules = schedules
    .filter(s => showCancelled ? true : s.status !== 'cancelled')
    .filter(s => {
      if (assignmentTypeFilter === 'all') return true;
      if (assignmentTypeFilter === 'on_site') {
        return s.assignment_type === 'on_site' || !s.assignment_type;
      }
      return s.assignment_type === assignmentTypeFilter;
    })
    .filter(s => {
      if (kpiFilter === 'all') return true;
      if (kpiFilter === 'unassigned') {
        return !s.technician_id || s.status === 'unassigned';
      }
      if (kpiFilter === 'conflicts') {
        return conflictedScheduleIds.has(s.id);
      }
      return true;
    })
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (s.profiles?.full_name?.toLowerCase() || '').includes(q) ||
        s.client_name.toLowerCase().includes(q) ||
        (s.project_name?.toLowerCase() || '').includes(q) ||
        (s.location?.toLowerCase() || '').includes(q)
      );
    });

  // Quick Action Handlers
  const handleOpenReschedule = (s: ScheduleItem) => {
    setReschedulingSchedule(s);
    setRescheduleDrawerTab('reschedule');
    setIsRescheduleDrawerOpen(true);
  };

  const handleOpenEdit = (s: ScheduleItem) => {
    setReschedulingSchedule(s);
    setRescheduleDrawerTab('edit_details');
    setIsRescheduleDrawerOpen(true);
  };

  const handleOpenReassign = (s: ScheduleItem) => {
    setReassigningSchedule(s);
    setNewTechnicianId("");
    setReassignReason("");
    setIsReassignModalOpen(true);
  };

  const handleOpenCancel = (s: ScheduleItem) => {
    setCancellingSchedule(s);
    setCancelPreset("");
    setCancelCustomNotes("");
    setIsCancelModalOpen(true);
  };

  const handleOpenAssignNow = (s: ScheduleItem) => {
    setInitialScheduleForDispatch(s);
    setPreselectedTechId(undefined);
    setIsDispatchDrawerOpen(true);
  };

  const handleSelectTechForDispatch = (techId: string) => {
    setPreselectedTechId(techId);
    setInitialScheduleForDispatch(null);
    setIsDispatchDrawerOpen(true);
  };

  // Submit Reassign
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
      fetchSchedules();
    }
  };

  // Submit Cancel
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
      fetchSchedules();
    }
  };

  // Casual Helpers Handlers
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
    if (!casualForm.fullName.trim() || !casualForm.contactNumber.trim()) {
      alert("Full name and contact number are required.");
      return;
    }

    setIsSubmitting(true);
    let res: any;
    if (editingCasualHelper) {
      res = await updateCasualHelper(editingCasualHelper.id, casualForm);
    } else {
      res = await createCasualHelper(casualForm);
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

  const filteredCasual = casualHelpers
    .filter(h => {
      if (casualStatusFilter === 'all') return true;
      return (h.status || 'active') === casualStatusFilter;
    })
    .filter(h => 
      h.full_name.toLowerCase().includes(casualSearch.toLowerCase()) ||
      h.contact_number.includes(casualSearch) ||
      (h.notes || '').toLowerCase().includes(casualSearch.toLowerCase())
    );

  return (
    <div className="flex flex-col h-full w-full max-w-full px-6 pt-5 pb-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 mb-3 px-0.5">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#121215] dark:text-[#F4F4F6]">
            {viewTab === 'dispatches' ? 'Scheduling & Dispatch' : 'Temporary Workers'}
          </h1>
          <p className="text-xs sm:text-sm text-[#575762] dark:text-[#B0B2BD]">
            {viewTab === 'dispatches'
              ? 'Assign technicians and crews to jobs, and see who is working where.'
              : 'Helpers hired per job who do not use the mobile app.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {viewTab === 'dispatches' ? (
            <button 
              onClick={() => setIsNewAssignmentModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] transition-colors font-bold text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Assignment</span>
            </button>
          ) : (
            <button 
              onClick={() => openRegisterCasualModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#4D55CC] hover:bg-[#4338CA] text-[#FAF9FB] transition-colors font-bold text-xs cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Temporary Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Top View Switcher Tabs (Gestalt Segmented Strip) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#EBEAEF] dark:bg-[#1E1F27] border border-black/[0.04] dark:border-white/[0.05] max-w-fit mb-3">
        <button
          type="button"
          onClick={() => setViewTab('dispatches')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'dispatches'
              ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
              : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#4D55CC] dark:text-[#7A82E6]" />
          <span>Assignments & Operations ({schedules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setViewTab('casual_helpers'); fetchCasualHelpers(); }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            viewTab === 'casual_helpers'
              ? 'bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
              : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215] dark:hover:text-[#F4F4F6]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#4D55CC] dark:text-[#7A82E6]" />
          <span>Temporary Workers ({casualHelpers.length})</span>
        </button>
      </div>

      {/* TAB 1: SCHEDULING & DISPATCH WORKSPACE */}
      {viewTab === 'dispatches' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-0">
          {/* 1. Live Period-Aware KPI Cards */}
          <SchedulingKpis
            onSiteCount={kpiMetrics.onSiteCount}
            deploymentsCount={kpiMetrics.deploymentsCount}
            needsTeamCount={kpiMetrics.needsTeamCount}
            conflictsCount={kpiMetrics.conflictsCount}
            granularity={granularity}
            onFilterType={(type) => {
              setCurrentPage(1);
              if (type === 'on_site') {
                setAssignmentTypeFilter('on_site');
                setKpiFilter('all');
              } else if (type === 'deployment') {
                setAssignmentTypeFilter('deployment');
                setKpiFilter('all');
              } else if (type === 'unassigned') {
                setAssignmentTypeFilter('all');
                setKpiFilter(prev => prev === 'unassigned' ? 'all' : 'unassigned');
              } else if (type === 'conflicts') {
                setAssignmentTypeFilter('all');
                setKpiFilter(prev => prev === 'conflicts' ? 'all' : 'conflicts');
              }
            }}
          />

          {/* 2. Universal Horizon & Filter Bar */}
          <HorizonFilterBar
            currentDate={currentDate}
            onDateChange={(d) => {
              setCurrentDate(d);
              setCurrentPage(1);
            }}
            granularity={granularity}
            onGranularityChange={(g) => {
              setGranularity(g);
              setCurrentPage(1);
              if (g === 'month') {
                setViewMode('timeline');
              } else if (g === 'day' || g === 'week') {
                setViewMode('table');
              } else if (g === 'past') {
                const prevMonth = new Date();
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                setCurrentDate(prevMonth);
                setViewMode('table');
              }
            }}
            assignmentTypeFilter={assignmentTypeFilter}
            onAssignmentTypeFilterChange={(t) => {
              setAssignmentTypeFilter(t);
              setKpiFilter('all');
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showCancelled={showCancelled}
            onToggleShowCancelled={setShowCancelled}
            totalCount={filteredSchedules.length}
          />

          {/* 3. Primary Center Workspace: Table vs. Timeline vs. Calendar */}
          {viewMode === 'table' ? (
            <ScheduleTableView
              schedules={filteredSchedules}
              loading={loading}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onQuickReschedule={handleOpenReschedule}
              onReassign={handleOpenReassign}
              onEdit={handleOpenEdit}
              onCancel={handleOpenCancel}
              onAssignNow={handleOpenAssignNow}
              granularity={granularity}
              upcomingCount={kpiMetrics.onSiteCount}
              onSwitchToUpcoming={() => {
                setGranularity('week');
                setCurrentDate(new Date());
              }}
            />
          ) : granularity === 'month' ? (
            <ScheduleMonthCalendarView
              currentDate={currentDate}
              schedules={schedules}
              technicians={profiles}
              onSelectDate={(d) => {
                setCurrentDate(d);
              }}
              onQuickReschedule={handleOpenReschedule}
              onEdit={handleOpenEdit}
              onSwitchToTimeline={(d) => {
                setCurrentDate(d);
                setGranularity('day');
                setViewMode('timeline');
              }}
              onDispatchTechnician={(techId, d) => {
                setCurrentDate(d);
                setPreselectedTechId(techId);
                setIsDispatchDrawerOpen(true);
              }}
              onNewAssignmentForDate={(d) => {
                setCurrentDate(d);
                setIsNewAssignmentModalOpen(true);
              }}
            />
          ) : (
            <ScheduleTimelineView
              schedules={filteredSchedules}
              technicians={profiles}
              selectedDate={formatLocalDate(currentDate)}
              onQuickReschedule={handleOpenReschedule}
              onEdit={handleOpenEdit}
              onDispatchSlot={(techId) => {
                setPreselectedTechId(techId);
                setIsDispatchDrawerOpen(true);
              }}
            />
          )}
        </div>
      )}

      {/* TAB 2: CASUAL HELPERS REGISTER */}
      {viewTab === 'casual_helpers' && (
        <div className="bg-[#F5F4F7] dark:bg-[#1E1F27] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden flex flex-col flex-1 shadow-xs">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 items-center flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8E8D9A]" />
                <input
                  type="text"
                  placeholder="Search worker name, contact, notes..."
                  value={casualSearch}
                  onChange={(e) => setCasualSearch(e.target.value)}
                  className="block w-full pl-8 pr-3 py-1.5 border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs bg-[#FAF9FB] dark:bg-[#2B2C35] text-[#121215] dark:text-[#F4F4F6] placeholder-[#8E8D9A] focus:outline-none focus:ring-2 focus:ring-[#4D55CC]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-[#EBEAEF] dark:bg-[#262732] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.05]">
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setCasualStatusFilter(f)}
                    className={`px-3 py-1 text-xs rounded-lg font-bold capitalize transition-all cursor-pointer ${
                      casualStatusFilter === f
                        ? 'bg-[#FAF9FB] dark:bg-[#1E1F27] text-[#121215] dark:text-[#F4F4F6] shadow-xs'
                        : 'text-[#575762] dark:text-[#B0B2BD] hover:text-[#121215]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-[#8E8D9A] font-mono">
              Total Registered: {casualHelpers.length}
            </span>
          </div>

          {/* Casual Table (Direct Native Matching EmployeeFilesClient) */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#EBEAEF] dark:bg-[#262732] border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] font-bold text-[#575762] dark:text-[#B0B2BD] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 min-w-[200px]">Worker Name</th>
                  <th className="py-3 px-4 min-w-[160px]">Contact Number</th>
                  <th className="py-3 px-4 min-w-[130px]">Daily Wage</th>
                  <th className="py-3 px-4 min-w-[120px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] text-xs">
                {casualHelperLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#8E8D9A]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4D55CC] animate-ping" />
                        <span className="text-xs font-semibold">Loading casual staff register...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCasual.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#8E8D9A]">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#8E8D9A]">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-[#121215] dark:text-[#F4F4F6] text-sm">No casual workers found</span>
                        <span className="text-xs leading-relaxed text-[#8E8D9A] dark:text-[#7A7C88]">
                          No helpers match your search criteria. Click &apos;Register Temporary Worker&apos; to add on-demand support staff.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCasual.slice((casualCurrentPage - 1) * itemsPerPage, casualCurrentPage * itemsPerPage).map((ch) => (
                    <tr 
                      key={ch.id}
                      className="transition-colors border-b border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EBEAEF] dark:bg-[#343640] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[10px] font-extrabold text-[#121215] dark:text-[#F4F4F6] shrink-0">
                            {ch.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-[#121215] dark:text-[#F4F4F6]">
                            {ch.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-[#575762] dark:text-[#B0B2BD] font-mono">
                          {ch.contact_number}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ₱{ch.daily_rate?.toFixed(2) || '610.00'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(ch.status || 'active') === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8D9A] border border-black/[0.08]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8E8D9A]" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRegisterCasualModal(ch)}
                            className="px-3 py-1 text-xs font-bold bg-[#FAF9FB] dark:bg-[#2B2C35] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#4D55CC] dark:text-[#7A82E6] rounded-xl border border-black/[0.08] dark:border-white/[0.08] transition-colors cursor-pointer shadow-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCasualStatus(ch)}
                            className="px-3 py-1 text-xs font-bold text-[#575762] hover:text-[#121215] dark:text-[#B0B2BD] dark:hover:text-[#F4F4F6] rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            {(ch.status || 'active') === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FAF9FB]/60 dark:bg-[#1E1F27]/60 p-2.5">
            <Pagination
              currentPage={casualCurrentPage}
              totalPages={Math.ceil(filteredCasual.length / itemsPerPage)}
              totalItems={filteredCasual.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCasualCurrentPage}
              itemNamePlural="workers"
            />
          </div>
        </div>
      )}

      {/* DRAWERS & MODALS */}

      {/* 1. New Assignment Branching Modal */}
      <NewAssignmentModal
        isOpen={isNewAssignmentModalOpen}
        onClose={() => setIsNewAssignmentModalOpen(false)}
        onSelectType={(type: AssignmentType) => {
          setIsNewAssignmentModalOpen(false);
          if (type === 'on_site') {
            setPreselectedTechId(undefined);
            setInitialScheduleForDispatch(null);
            setIsDispatchDrawerOpen(true);
          } else if (type === 'deployment') {
            setIsDeploymentDrawerOpen(true);
          } else if (type === 'office_duty') {
            setIsOfficeDutyDrawerOpen(true);
          }
        }}
      />

      {/* 2. On-Site Service Stepped Dispatch Drawer */}
      <SteppedDispatchDrawer
        isOpen={isDispatchDrawerOpen}
        onClose={() => setIsDispatchDrawerOpen(false)}
        profiles={profiles}
        casualHelpers={casualHelpers}
        existingSchedules={schedules}
        onOpenCasualRegisterModal={() => openRegisterCasualModal()}
        preselectedTechId={preselectedTechId}
        initialSchedule={initialScheduleForDispatch}
        selectedDate={currentDate}
        onSuccess={(targetDate) => {
          if (targetDate) {
            setCurrentDate(new Date(targetDate));
          }
          fetchSchedules();
        }}
      />

      {/* 3. Out-of-Town Deployment Dedicated Drawer */}
      <DeploymentDrawer
        isOpen={isDeploymentDrawerOpen}
        onClose={() => setIsDeploymentDrawerOpen(false)}
        profiles={profiles}
        existingSchedules={schedules}
        selectedDate={currentDate}
        onSuccess={() => {
          fetchSchedules();
        }}
      />

      {/* 4. Main Office Duty Attendance Shift Drawer */}
      <OfficeDutyDrawer
        isOpen={isOfficeDutyDrawerOpen}
        onClose={() => setIsOfficeDutyDrawerOpen(false)}
        profiles={profiles}
        existingSchedules={schedules}
        selectedDate={currentDate}
        onSuccess={() => {
          fetchSchedules();
        }}
      />

      {/* 5. Quick Reschedule Slide-Over Drawer with Audit History */}
      <QuickRescheduleDrawer
        isOpen={isRescheduleDrawerOpen}
        onClose={() => setIsRescheduleDrawerOpen(false)}
        schedule={reschedulingSchedule}
        allSchedules={schedules}
        initialTab={rescheduleDrawerTab}
        onReassign={(s) => {
          setIsRescheduleDrawerOpen(false);
          handleOpenReassign(s);
        }}
        onCancel={(s) => {
          setIsRescheduleDrawerOpen(false);
          handleOpenCancel(s);
        }}
        onSuccess={(targetDate) => {
          if (targetDate) {
            setCurrentDate(new Date(targetDate));
          }
          fetchSchedules();
        }}
      />

      {/* 6. Technician Availability Roster Drawer */}
      <TechnicianRosterDrawer
        isOpen={isRosterDrawerOpen}
        onClose={() => setIsRosterDrawerOpen(false)}
        profiles={profiles}
        schedules={schedules}
        onSelectForDispatch={handleSelectTechForDispatch}
      />

      {/* 7. Reassign Modal */}
      <ModalDialog
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Lead Technician"
        subtitle="Transfer this assignment to another qualified technician. Original assignee will receive a real-time transfer notification."
        maxWidth="md"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-xs space-y-1">
            <span className="text-zinc-500 block">Current Assignment:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 block">
              {reassigningSchedule?.client_name}
            </strong>
            <span className="text-zinc-500 block">
              Currently Assigned: {reassigningSchedule?.profiles?.full_name || 'Unassigned'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Select Replacement Technician *
            </label>
            <select
              required
              value={newTechnicianId}
              onChange={(e) => setNewTechnicianId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            >
              <option value="">-- Choose Field Technician --</option>
              {profiles
                .filter(p => p.role === 'technician' && p.technician_level !== 'helper' && p.id !== reassigningSchedule?.technician_id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.technician_level || 'Tech'}) {p.lifecycle_status === 'on_leave' ? '[ON LEAVE]' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Transfer Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Client requested rescheduling / Tech running late on previous run"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsReassignModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTechnicianId}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Transferring..." : "Confirm Reassignment"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* 8. Cancel Dispatch Modal */}
      <ModalDialog
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Dispatch Assignment"
        subtitle="Cancelling will remove this dispatch from active duty and log the operational reason in the audit trail."
        maxWidth="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-1">
            <span className="text-rose-600 font-bold block">Assignment to Cancel:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 block">
              {cancellingSchedule?.client_name} ({cancellingSchedule?.location})
            </strong>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Cancellation Reason Preset *
            </label>
            <select
              value={cancelPreset}
              onChange={(e) => setCancelPreset(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            >
              <option value="">-- Select a cancellation reason --</option>
              <option value="Client Rescheduled">Client Rescheduled</option>
              <option value="Severe Weather / Flooding">Severe Weather / Flooding</option>
              <option value="Client Site Inaccessible">Client Site Inaccessible</option>
              <option value="Parts / Materials Unavailable">Parts / Materials Unavailable</option>
              <option value="Technician Emergency">Technician Emergency</option>
              <option value="Other">Other (Specify Below)</option>
            </select>
          </div>

          {cancelPreset === 'Other' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Custom Cancellation Notes *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Enter specific operational justification..."
                value={cancelCustomNotes}
                onChange={(e) => setCancelCustomNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Keep Dispatch
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cancelPreset || (cancelPreset === 'Other' && !cancelCustomNotes.trim())}
              className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* 9. Casual Helper Register Modal */}
      <ModalDialog
        isOpen={isCasualModalOpen}
        onClose={() => setIsCasualModalOpen(false)}
        title={editingCasualHelper ? "Edit Casual Support Worker" : "Register On-Demand Casual Worker"}
        subtitle="Casual support staff are deployed for heavy material handling, cable pulling, or multi-site runs."
        maxWidth="md"
      >
        <form onSubmit={handleSaveCasualHelper} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Juan Dela Cruz"
              value={casualForm.fullName}
              onChange={(e) => setCasualForm({ ...casualForm, fullName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Mobile Contact Number *
            </label>
            <input
              type="tel"
              required
              placeholder="0917-xxx-xxxx"
              value={casualForm.contactNumber}
              onChange={(e) => setCasualForm({ ...casualForm, contactNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Daily Rate (₱ PHP) *
            </label>
            <input
              type="number"
              required
              min={100}
              step={10}
              value={casualForm.dailyRate}
              onChange={(e) => setCasualForm({ ...casualForm, dailyRate: parseFloat(e.target.value) || 610.00 })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Emergency Contact & Relationship
            </label>
            <input
              type="text"
              placeholder="e.g., Maria Dela Cruz (Spouse) - 0918-xxx-xxxx"
              value={casualForm.emergencyContact}
              onChange={(e) => setCasualForm({ ...casualForm, emergencyContact: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCasualModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : (editingCasualHelper ? "Update Helper" : "Register Worker")}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
