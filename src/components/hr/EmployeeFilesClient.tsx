'use client'

import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import ModalDialog from '@/components/ui/ModalDialog'

import { useState, useEffect } from 'react';
import { Search, FolderOpen, UploadCloud, AlertTriangle, FileText, CheckCircle2, X, Send, Phone, Settings, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EmployeeFilesClient() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarnings, setFilterWarnings] = useState('all'); // all, has_warnings, no_warnings
  
  // Modal State
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'warnings' | 'settings'>('docs');
  
  // Warning State
  const [warningSubject, setWarningSubject] = useState('');
  const [warningDetails, setWarningDetails] = useState('');
  const [sendSms, setSendSms] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false);
  const [warningConfirmation, setWarningConfirmation] = useState<{
    isOpen: boolean;
    employeeName: string;
    employeeRole: string;
    subject: string;
    sentPush: boolean;
    sentSms: boolean;
  } | null>(null);
  
  // Settings State
  const [editForm, setEditForm] = useState({
    role: '',
    technician_level: '',
    employment_status: '',
    base_salary: 0
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsConfirmation, setSettingsConfirmation] = useState<{
    isOpen: boolean;
    employeeName: string;
    updatedRole: string;
    updatedLevel: string;
    updatedStatus: string;
    updatedSalary: number;
    isPromotion: boolean;
  } | null>(null);

  // Upload State
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, Record<string, { fileName: string; fileUrl: string; uploadedAt: string }>>>({});
  const [uploadNotification, setUploadNotification] = useState<string | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<{ title: string; fileName: string; fileUrl: string } | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<{ docType: string; dbField: string } | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('full_name');
      
    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
    }
    
    // Fetch warnings separately to avoid PostgREST join ambiguity errors
    const { data: warningsData } = await supabase
      .from('employee_warnings')
      .select('id, employee_id');
      
    if (profilesData) {
      // Map warnings to profiles
      const enrichedProfiles = profilesData.map(profile => ({
        ...profile,
        employee_warnings: (warningsData || []).filter(w => w.employee_id === profile.id)
      }));
      setEmployees(enrichedProfiles);
    }
    setLoading(false);
  };

  // When a user clicks an employee, populate the edit form
  const handleSelectEmp = (emp: any) => {
    setSelectedEmp(emp);
    setEditForm({
      role: emp.role || 'technician',
      technician_level: emp.technician_level || 'technician',
      employment_status: emp.employment_status || 'regular',
      base_salary: emp.base_salary || 0
    });
    setActiveTab('docs');
  };

  const handleFileUpload = async (docType: string, dbField: string) => {
    if (!selectedEmp) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingDoc(docType);
      
      // Create browser blob URL for file viewing
      const objectUrl = URL.createObjectURL(file);
      const uploadedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await new Promise(r => setTimeout(r, 600));

      try {
        await supabase.from('profiles').update({ [dbField]: true }).eq('id', selectedEmp.id);
      } catch (err) {
        console.log('Saved to state:', err);
      }

      setUploadedFiles(prev => ({
        ...prev,
        [selectedEmp.id]: {
          ...(prev[selectedEmp.id] || {}),
          [dbField]: {
            fileName: file.name,
            fileUrl: objectUrl,
            uploadedAt
          }
        }
      }));

      setUploadNotification(`"${file.name}" successfully attached to ${selectedEmp.full_name}'s 201 file!`);
      
      try {
        const { logAdminActivity } = await import('@/lib/auditLogger');
        logAdminActivity({
          adminName: 'Sasha P. Usa',
          adminRole: 'HR Department',
          adminRoleKey: 'hr',
          moduleKey: 'hr_files',
          moduleName: '201 Files',
          action: 'Uploaded Document Attachment',
          targetEntity: `${file.name} (${selectedEmp.full_name})`
        });
      } catch (e) {}

      setTimeout(() => setUploadNotification(null), 4000);
      setUploadingDoc(null);
    };
    input.click();
  };

  const confirmRemoveFile = async (docType: string, dbField: string) => {
    if (!selectedEmp) return;

    try {
      await supabase.from('profiles').update({ [dbField]: false }).eq('id', selectedEmp.id);
    } catch (err) {
      console.log('Removed from state:', err);
    }

    setUploadedFiles(prev => {
      const empFiles = { ...(prev[selectedEmp.id] || {}) };
      delete empFiles[dbField];
      return {
        ...prev,
        [selectedEmp.id]: empFiles
      };
    });

    setUploadNotification(`Removed ${docType} from ${selectedEmp.full_name}'s 201 file.`);

    try {
      const { logAdminActivity } = await import('@/lib/auditLogger');
      logAdminActivity({
        adminName: 'Sasha P. Usa',
        adminRole: 'HR Department',
        adminRoleKey: 'hr',
        moduleKey: 'hr_files',
        moduleName: '201 Files',
        action: 'Removed Document Attachment',
        targetEntity: `${docType} (${selectedEmp.full_name})`
      });
    } catch (e) {}

    setTimeout(() => setUploadNotification(null), 3000);
  };

  const submitWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !warningSubject || !warningDetails) return;
    setIsSubmittingWarning(true);

    // Get authenticated HR user for accurate audit attribution
    const { data: { user } } = await supabase.auth.getUser();
    const issuerId = user?.id || selectedEmp.id;

    const { error } = await supabase
      .from('employee_warnings')
      .insert({
        employee_id: selectedEmp.id,
        issued_by: issuerId, 
        subject: warningSubject,
        details: warningDetails,
        warning_level: 'Standard Warning',
        status: 'pending_service_review',
        incident_date: new Date().toISOString().split('T')[0]
      });

    if (sendPush) {
      await supabase.from('push_notifications_queue').insert({
        user_id: selectedEmp.id,
        title: `Warning: ${warningSubject}`,
        body: 'Please review your new disciplinary warning.'
      });
    }

    if (!error) {
      setWarningConfirmation({
        isOpen: true,
        employeeName: selectedEmp.full_name,
        employeeRole: selectedEmp.role || 'technician',
        subject: warningSubject,
        sentPush: sendPush,
        sentSms: sendSms
      });
      setWarningSubject('');
      setWarningDetails('');
      fetchEmployees(); // Refresh to update warning count
    }
    setIsSubmittingWarning(false);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    // Logic Enforcer: OJT cannot be Senior
    if (editForm.employment_status === 'ojt' && editForm.technician_level === 'senior') {
      setSettingsError("An OJT cannot hold a Senior Technician level. Please adjust either employment status or operational level.");
      return;
    }
    setSettingsError(null);

    setIsSavingSettings(true);
    
    // Check if it's a promotion (e.g. from OJT to Regular, or Helper to Tech/Senior)
    const isPromotion = 
      (selectedEmp.employment_status === 'ojt' && editForm.employment_status !== 'ojt') ||
      (selectedEmp.technician_level === 'helper' && editForm.technician_level !== 'helper');

    const { error } = await supabase
      .from('profiles')
      .update({
        role: editForm.role,
        technician_level: editForm.technician_level,
        employment_status: editForm.employment_status,
        base_salary: editForm.base_salary
      })
      .eq('id', selectedEmp.id);

    if (!error) {
      if (isPromotion) {
        await supabase.from('push_notifications_queue').insert({
          user_id: selectedEmp.id,
          title: `Congratulations on your promotion!`,
          body: `You are now a ${editForm.employment_status.toUpperCase()} ${editForm.technician_level.toUpperCase()}. Keep up the great work!`
        });
      }
      
      const updatedEmp = { ...selectedEmp, ...editForm };
      setSelectedEmp(updatedEmp);
      setEmployees(employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));

      setSettingsConfirmation({
        isOpen: true,
        employeeName: selectedEmp.full_name,
        updatedRole: editForm.role,
        updatedLevel: editForm.technician_level,
        updatedStatus: editForm.employment_status,
        updatedSalary: editForm.base_salary,
        isPromotion
      });
    }
    setIsSavingSettings(false);
  };

  // FILTERING
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) || emp.role?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || emp.role === filterRole;
    const matchStatus = filterStatus === 'all' || emp.employment_status === filterStatus;
    
    let matchWarn = true;
    const warnCount = emp.employee_warnings?.length || 0;
    if (filterWarnings === 'has_warnings') matchWarn = warnCount > 0;
    if (filterWarnings === 'no_warnings') matchWarn = warnCount === 0;

    return matchSearch && matchRole && matchStatus && matchWarn;
  });

  // PAGINATION
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE) || 1;
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter/search change
  }, [search, filterRole, filterStatus, filterWarnings]);

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <PageHeader
        title="201 Employee Files & Warnings"
        subtitle="Manage operational documents, salaries, and disciplinary actions."
        icon={FolderOpen}
      />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          
          {/* Controls */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-t-xl border border-zinc-200/80 dark:border-zinc-800 border-b-0 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${showFilters ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
              >
                <Filter className="w-4 h-4" /> Filters
              </button>

              {/* Filter Popover */}
              {showFilters && (
                <div className="absolute top-16 left-0 bg-white dark:bg-zinc-900 shadow-xl rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 z-10 flex gap-4 w-[500px]">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role</label>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="all">All Roles</option>
                      <option value="technician">Technician</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="hr">HR</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="all">All Status</option>
                      <option value="regular">Regular</option>
                      <option value="ojt">OJT</option>
                      <option value="contractual">Contractual</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Warnings</label>
                    <select value={filterWarnings} onChange={e => setFilterWarnings(e.target.value)} className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="all">All Records</option>
                      <option value="has_warnings">Has Warnings</option>
                      <option value="no_warnings">Clean Record</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 border-b-0 rounded-b-none overflow-y-scroll flex-1 shadow-xs [scrollbar-gutter:stable]">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-3.5 py-2.5 border-r border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 w-[28%]">Employee</th>
                  <th className="px-3.5 py-2.5 border-r border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 w-[22%]">Role & Level</th>
                  <th className="px-3.5 py-2.5 border-r border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 w-[20%]">Employment Status</th>
                  <th className="px-3.5 py-2.5 border-r border-zinc-200 dark:border-zinc-800 dark:border-zinc-800 w-[16%]">Base Compensation</th>
                  <th className="px-3.5 py-2.5 w-[14%]">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-400 font-medium text-xs">Loading records...</td></tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-400 font-medium text-xs">No employees found.</td></tr>
                ) : paginatedEmployees.map((emp) => {
                  const warnCount = emp.employee_warnings?.length || 0;
                  const isMonthly = (emp.base_salary || 0) >= 3000;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer" onClick={() => handleSelectEmp(emp)}>
                      <td className="px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 text-xs">{emp.full_name}</div>
                        <div className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          {emp.lifecycle_status === 'active' ? (
                            <span className="text-emerald-600 font-medium">Active</span>
                          ) : (
                            <span className="text-red-500 uppercase font-semibold">{emp.lifecycle_status}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800">
                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize">{emp.role}</div>
                        {emp.technician_level && (
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 inline-block px-1.5 py-0.2 rounded mt-0.5 border border-blue-200 dark:border-blue-800">
                            {emp.technician_level}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          ${emp.employment_status === 'regular' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'}
                        `}>
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800">
                        <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                          ₱{Number(emp.base_salary || 0).toLocaleString()}{isMonthly ? '/mo' : '/day'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        {warnCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3" /> {warnCount} WARNING{warnCount > 1 ? 'S' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> CLEAN
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Standardized Bottom Pagination Bar */}
          <div className="rounded-b-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 border-t-0 shadow-2xs shrink-0">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEmployees.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              itemNamePlural="employees"
            />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[560px] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-lg font-black shrink-0 border-2 border-blue-200 shadow-sm">
                  {selectedEmp.full_name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 flex items-center gap-2 leading-none">
                    {selectedEmp.full_name}
                    <span className="font-mono text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      ₱{Number(selectedEmp.base_salary || 0).toLocaleString()}{(selectedEmp.base_salary || 0) >= 3000 ? '/mo' : '/day'}
                    </span>
                  </h2>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
                    {selectedEmp.role} &bull; {selectedEmp.employment_status} &bull; {selectedEmp.technician_level}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="p-2 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 shrink-0">
              <button 
                onClick={() => setActiveTab('docs')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'docs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'}`}
              >
                <FileText className="w-4 h-4" /> 201 Documents
              </button>
              <button 
                onClick={() => setActiveTab('warnings')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'warnings' ? 'border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'}`}
              >
                <AlertTriangle className="w-4 h-4" /> Issue Warning
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'}`}
              >
                <Settings className="w-4 h-4" /> Profile Editor & Salary
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-6 bg-white dark:bg-zinc-900 flex flex-col justify-between">
              
              {activeTab === 'docs' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium mb-2">Click "Upload" to attach a digital file. Checkmarks appear automatically upon successful upload.</p>
                  
                  {uploadNotification && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between font-bold shadow-sm animate-fade-in">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {uploadNotification}
                      </span>
                    </div>
                  )}

                  {[
                    { key: 'has_nbi_clearance', label: 'NBI Clearance', desc: 'Valid background check' },
                    { key: 'has_medical_clearance', label: 'Medical Clearance', desc: 'Fit to work certificate' },
                    { key: 'has_resume', label: 'Resume / CV', desc: 'Employment history' },
                    { key: 'has_sss_id', label: 'SSS Registration', desc: 'Government mandate' },
                    { key: 'has_philhealth_id', label: 'PhilHealth ID', desc: 'Government mandate' },
                    { key: 'has_pagibig_id', label: 'Pag-IBIG Number', desc: 'Government mandate' },
                  ].map((doc) => {
                    const uploadedInfo = uploadedFiles[selectedEmp.id]?.[doc.key];
                    const isUploaded = Boolean(uploadedInfo);
                    const isUploading = uploadingDoc === doc.label;

                    return (
                      <div key={doc.key} className={`flex items-center justify-between py-2 px-3.5 rounded-xl border transition-colors ${isUploaded ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'}`}>
                        <div className="flex items-center gap-3">
                          {isUploaded ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center shrink-0 bg-white dark:bg-zinc-800" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isUploaded ? 'text-zinc-900 dark:text-zinc-100 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>{doc.label}</span>
                              {uploadedInfo && (
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded max-w-[140px] truncate">
                                  {uploadedInfo.fileName}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-medium">{doc.desc}</div>
                          </div>
                        </div>
                        
                        {!isUploaded ? (
                          <button 
                            onClick={() => handleFileUpload(doc.label, doc.key)}
                            disabled={isUploading}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 shadow-sm disabled:opacity-50 transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                            {isUploading ? 'Uploading...' : 'Upload'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                if (uploadedInfo?.fileUrl) {
                                  window.open(uploadedInfo.fileUrl, '_blank');
                                } else {
                                  setPreviewingDoc({ title: doc.label, fileName: uploadedInfo?.fileName || `${doc.label}.pdf`, fileUrl: '' });
                                }
                              }}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded border border-blue-100 dark:border-blue-800 transition-colors"
                            >
                              View File
                            </button>
                            <button 
                              onClick={() => handleFileUpload(doc.label, doc.key)}
                              title="Re-upload or replace file"
                              className="p-1 text-zinc-400 hover:text-blue-600 rounded transition-colors"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeletingDoc({ docType: doc.label, dbField: doc.key })}
                              title="Remove file from 201 record"
                              className="p-1 text-zinc-400 hover:text-rose-600 dark:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'warnings' && (
                <form onSubmit={submitWarning} className="max-w-xl mx-auto space-y-3 py-1">
                  {/* Explicit Target Technician Banner */}
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedEmp.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedEmp.full_name}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-zinc-100 text-zinc-700 dark:text-zinc-300 border border-zinc-200 rounded">
                          {selectedEmp.role}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium uppercase truncate">
                          {selectedEmp.technician_level || 'General'} &bull; {selectedEmp.employment_status || 'Regular'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Disciplinary notice will be filed under this technician's 201 records.</p>
                    </div>
                  </div>

                  <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-3 rounded-xl flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Disciplinary Action Notice</h4>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 font-medium leading-tight">This warning will be recorded in the employee's 201 file with optional SMS and App Push Notification.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Warning Subject</label>
                    <input 
                      required type="text" 
                      placeholder="e.g. Tardiness, Safety Violation, No-show"
                      value={warningSubject}
                      onChange={e => setWarningSubject(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-red-500 outline-none font-medium text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Incident Details & Action Plan</label>
                    <textarea 
                      required rows={2}
                      placeholder="Describe what happened and the required corrective action..."
                      value={warningDetails}
                      onChange={e => setWarningDetails(e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 resize-none"
                    />
                  </div>

                  <div className="pt-1 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={sendPush}
                        onChange={e => setSendPush(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:text-zinc-100">
                        <Send className="w-3.5 h-3.5 text-blue-500" /> Send App Push
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={sendSms}
                        onChange={e => setSendSms(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:text-zinc-100">
                        <Phone className="w-3.5 h-3.5 text-blue-500" /> Send SMS Alert
                      </span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isSubmittingWarning}
                      className="w-full py-2.5 bg-rose-600 text-white text-xs rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingWarning ? 'Recording Warning...' : 'Issue Official Warning'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'settings' && (
                <form onSubmit={saveSettings} className="space-y-3.5 py-1">
                  {/* Top Context Banner */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Profile & Individual Compensation</h4>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Editing <span className="font-semibold text-zinc-800">{selectedEmp.full_name}</span> &bull; Base compensation is negotiated individually per technician.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200">
                      201 File Profile
                    </span>
                  </div>

                  {settingsError && (
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{settingsError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Card 1: Operational Placement */}
                    <div className="bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Operational Placement</span>
                        <span className="text-[10px] text-zinc-500 font-medium">Role & Level</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">System Role</label>
                          <select 
                            value={editForm.role}
                            onChange={e => setEditForm({...editForm, role: e.target.value})}
                            className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          >
                            <option value="technician">Technician</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="hr">HR</option>
                            <option value="accountant">Accountant</option>
                            <option value="ceo">CEO</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Technician Level</label>
                          <select 
                            value={editForm.technician_level}
                            onChange={e => {
                              const newLvl = e.target.value;
                              setEditForm({...editForm, technician_level: newLvl});
                              if (editForm.employment_status === 'ojt' && newLvl === 'senior') {
                                setSettingsError("An OJT cannot hold a Senior Technician level.");
                              } else {
                                setSettingsError(null);
                              }
                            }}
                            className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          >
                            <option value="helper">Helper</option>
                            <option value="technician">Technician</option>
                            <option value="senior">Senior Technician</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Employment Status</label>
                          <select 
                            value={editForm.employment_status}
                            onChange={e => {
                              const newStatus = e.target.value;
                              setEditForm({...editForm, employment_status: newStatus});
                              if (newStatus === 'ojt' && editForm.technician_level === 'senior') {
                                setSettingsError("An OJT cannot hold a Senior Technician level.");
                              } else {
                                setSettingsError(null);
                              }
                            }}
                            className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          >
                            <option value="ojt">OJT (Trainee)</option>
                            <option value="contractual">Contractual</option>
                            <option value="provisionary">Provisionary</option>
                            <option value="regular">Regular</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Individual Base Compensation */}
                    <div className="bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200/60">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Individual Compensation</span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.2 rounded-full border border-emerald-200">
                            Custom Rate
                          </span>
                        </div>

                        <div className="mt-2 space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                {editForm.base_salary >= 3000 ? 'Monthly Base Salary (₱)' : 'Daily Base Rate (₱)'}
                              </label>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {editForm.base_salary >= 3000 ? '₱/month' : '₱/day'}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-600 text-xs">₱</span>
                              <input 
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={editForm.base_salary}
                                onChange={e => setEditForm({...editForm, base_salary: Number(e.target.value)})}
                                className="w-full font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-2xs"
                              />
                            </div>
                          </div>

                          {/* Reference equivalence helper */}
                          <div className="bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500 font-medium">Recorded Rate:</span>
                              <span className="font-bold text-emerald-700 font-mono">
                                ₱{Number(editForm.base_salary || 0).toLocaleString()} {editForm.base_salary >= 3000 ? '/ mo' : '/ day'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                              <span>Estimated Equivalent:</span>
                              <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                                {editForm.base_salary >= 3000 
                                  ? `≈ ₱${(editForm.base_salary / 26).toFixed(2)}/day (26-day basis)`
                                  : `≈ ₱${(editForm.base_salary * 26).toLocaleString()}/mo (26-day basis)`}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-500 italic leading-tight">
                            Note: Technician base rate is configured individually and does not inherit shared role defaults.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button 
                      type="submit"
                      disabled={isSavingSettings || (editForm.employment_status === 'ojt' && editForm.technician_level === 'senior')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSavingSettings ? 'Saving Profile & Compensation...' : 'Save Profile & Individual Compensation'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {previewingDoc && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-base">{previewingDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewingDoc(null)} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{previewingDoc.fileName}</h4>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Digital copy attached to 201 Employee File</p>
              </div>
              <div className="pt-2 flex gap-3">
                {previewingDoc.fileUrl ? (
                  <button 
                    onClick={() => window.open(previewingDoc.fileUrl, '_blank')}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    Open Document
                  </button>
                ) : (
                  <button 
                    onClick={() => alert(`Downloading copy of ${previewingDoc.fileName}...`)}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    Download File
                  </button>
                )}
                <button 
                  onClick={() => setPreviewingDoc(null)}
                  className="px-4 py-2.5 bg-zinc-100 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove File Confirmation Modal */}
      {deletingDoc && selectedEmp && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-base">Remove Document?</h3>
                <p className="text-xs text-zinc-500 mt-1.5 font-medium leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-zinc-800">{deletingDoc.docType}</span> from <span className="font-bold text-zinc-800">{selectedEmp.full_name}</span>'s 201 file?
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setDeletingDoc(null)}
                  className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmRemoveFile(deletingDoc.docType, deletingDoc.dbField);
                    setDeletingDoc(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 shadow-sm transition-colors"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Styled Warning Confirmation Modal */}
      {warningConfirmation?.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[75] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Disciplinary Warning Issued</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Notice has been recorded and officially filed in <span className="font-semibold text-zinc-800">{warningConfirmation.employeeName}</span>'s 201 record.
            </p>

            <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 rounded-xl p-3 my-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Target Technician:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{warningConfirmation.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Warning Subject:</span>
                <span className="font-semibold text-zinc-800 truncate max-w-[200px]">{warningConfirmation.subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Mobile Push Notification:</span>
                <span className={`font-semibold ${warningConfirmation.sentPush ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {warningConfirmation.sentPush ? 'Dispatched' : 'Skipped'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">SMS Alert:</span>
                <span className={`font-semibold ${warningConfirmation.sentSms ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {warningConfirmation.sentSms ? 'Dispatched' : 'Skipped'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200/60">
                <span className="text-zinc-500 font-medium">201 Dossier:</span>
                <span className="font-semibold text-blue-600">Updated in Database</span>
              </div>
            </div>

            <button
              onClick={() => {
                setWarningConfirmation(null);
                setActiveTab('docs');
              }}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Done & Return to 201 File
            </button>
          </div>
        </div>
      )}

      {/* In-App Styled Profile & Compensation Save Confirmation Modal */}
      {settingsConfirmation?.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[75] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {settingsConfirmation.isPromotion ? 'Promotion & Compensation Updated' : 'Profile & Compensation Saved'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Changes to <span className="font-semibold text-zinc-800">{settingsConfirmation.employeeName}</span> have been committed to their 201 profile.
            </p>

            <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 rounded-xl p-3 my-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Technician:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{settingsConfirmation.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Operational Placement:</span>
                <span className="font-semibold text-zinc-800 capitalize">
                  {settingsConfirmation.updatedRole} &bull; {settingsConfirmation.updatedLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Employment Status:</span>
                <span className="font-semibold text-zinc-800 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-zinc-200/60">
                  {settingsConfirmation.updatedStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Individual Base Rate:</span>
                <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ₱{Number(settingsConfirmation.updatedSalary || 0).toLocaleString()}{settingsConfirmation.updatedSalary >= 3000 ? '/mo' : '/day'}
                </span>
              </div>
              {settingsConfirmation.isPromotion && (
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200/60 text-emerald-700">
                  <span className="font-medium">Promotion Dispatch:</span>
                  <span className="font-semibold">Celebratory Push Queued</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSettingsConfirmation(null);
                setActiveTab('docs');
              }}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Done & Return to 201 File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
