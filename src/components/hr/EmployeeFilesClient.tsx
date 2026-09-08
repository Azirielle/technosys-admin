"use client";

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
  
  // Settings State
  const [editForm, setEditForm] = useState({
    role: '',
    technician_level: '',
    employment_status: '',
    base_salary: 0
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
    const { error } = await supabase
      .from('employee_warnings')
      .insert({
        employee_id: selectedEmp.id,
        issued_by: selectedEmp.id, 
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
      alert(`Warning issued to ${selectedEmp.full_name}! ${sendSms ? '(SMS Sent)' : ''}`);
      setWarningSubject('');
      setWarningDetails('');
      fetchEmployees(); // Refresh to update warning count
      setActiveTab('docs');
    }
    setIsSubmittingWarning(false);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    // Logic Enforcer: OJT cannot be Senior
    if (editForm.employment_status === 'ojt' && editForm.technician_level === 'senior') {
      alert("An OJT cannot hold a Senior Technician level. Please correct the fields.");
      return;
    }

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
        alert(`Profile updated. Promotion detected: Celebratory SMS & Push Notification sent to ${selectedEmp.full_name}!`);
      } else {
        alert("Profile updated successfully.");
      }
      
      const updatedEmp = { ...selectedEmp, ...editForm };
      setSelectedEmp(updatedEmp);
      setEmployees(employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
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
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              201 Employee Files & Warnings
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Manage operational documents, salaries, and disciplinary actions.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          
          {/* Controls */}
          <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" /> Filters
              </button>

              {/* Filter Popover */}
              {showFilters && (
                <div className="absolute top-16 left-0 bg-white shadow-xl rounded-xl border border-gray-200 p-4 z-10 flex gap-4 w-[500px]">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="all">All Roles</option>
                      <option value="technician">Technician</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="hr">HR</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="all">All Status</option>
                      <option value="regular">Regular</option>
                      <option value="ojt">OJT</option>
                      <option value="contractual">Contractual</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Warnings</label>
                    <select value={filterWarnings} onChange={e => setFilterWarnings(e.target.value)} className="w-full border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500">
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
          <div className="bg-white border border-gray-200 border-b-0 rounded-b-none overflow-y-scroll flex-1 shadow-sm [scrollbar-gutter:stable]">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-[28%]">Employee</th>
                  <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-[22%]">Role & Level</th>
                  <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-[20%]">Employment Status</th>
                  <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-[16%]">Base Salary</th>
                  <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-[14%]">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">Loading records...</td></tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No employees found.</td></tr>
                ) : paginatedEmployees.map((emp) => {
                  const warnCount = emp.employee_warnings?.length || 0;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-indigo-50/50 transition-colors group cursor-pointer" onClick={() => handleSelectEmp(emp)}>
                      <td className="px-5 py-3">
                        <div className="font-bold text-gray-900">{emp.full_name}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          {emp.lifecycle_status === 'active' ? (
                            <span className="text-emerald-600">Active</span>
                          ) : (
                            <span className="text-red-500 uppercase">{emp.lifecycle_status}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-bold text-gray-700 capitalize">{emp.role}</div>
                        {emp.technician_level && (
                          <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-0.5 border border-indigo-100">
                            {emp.technician_level}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                          ${emp.employment_status === 'regular' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}
                        `}>
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                          ₱{emp.base_salary?.toLocaleString()}/day
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {warnCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> {warnCount} WARNINGS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200">
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
          <div className="bg-gray-50 px-4 py-3 border border-gray-200 rounded-b-xl flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{filteredEmployees.length === 0 ? 0 : Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredEmployees.length)}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)}</span> of <span className="font-semibold">{filteredEmployees.length}</span> results
            </p>
            <nav className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 border-t border-b border-r border-gray-300 text-sm font-medium ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-600 font-bold border-indigo-200 z-10' : 'bg-white text-gray-500 hover:bg-gray-50'} -ml-px transition-colors`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-r-md border border-gray-300 border-l bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 -ml-px text-sm font-medium transition-colors"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[560px] flex flex-col overflow-hidden border border-gray-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-lg font-black shrink-0 border-2 border-indigo-200 shadow-sm">
                  {selectedEmp.full_name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 leading-none">
                    {selectedEmp.full_name}
                    <span className="font-mono text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">₱{selectedEmp.base_salary}/day</span>
                  </h2>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                    {selectedEmp.role} &bull; {selectedEmp.employment_status} &bull; {selectedEmp.technician_level}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white px-6 shrink-0">
              <button 
                onClick={() => setActiveTab('docs')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <FileText className="w-4 h-4" /> 201 Documents
              </button>
              <button 
                onClick={() => setActiveTab('warnings')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'warnings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <AlertTriangle className="w-4 h-4" /> Issue Warning
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Settings className="w-4 h-4" /> Profile Editor & Salary
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-6 bg-white flex flex-col justify-between">
              
              {activeTab === 'docs' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium mb-2">Click "Upload" to attach a digital file. Checkmarks appear automatically upon successful upload.</p>
                  
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
                      <div key={doc.key} className={`flex items-center justify-between py-2 px-3.5 rounded-xl border transition-colors ${isUploaded ? 'bg-emerald-50/40 border-emerald-200' : 'bg-gray-50/60 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          {isUploaded ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 bg-white" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isUploaded ? 'text-gray-900' : 'text-gray-600'}`}>{doc.label}</span>
                              {uploadedInfo && (
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded max-w-[140px] truncate">
                                  {uploadedInfo.fileName}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium">{doc.desc}</div>
                          </div>
                        </div>
                        
                        {!isUploaded ? (
                          <button 
                            onClick={() => handleFileUpload(doc.label, doc.key)}
                            disabled={isUploading}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 shadow-sm disabled:opacity-50 transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
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
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-100 transition-colors"
                            >
                              View File
                            </button>
                            <button 
                              onClick={() => handleFileUpload(doc.label, doc.key)}
                              title="Re-upload or replace file"
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeletingDoc({ docType: doc.label, dbField: doc.key })}
                              title="Remove file from 201 record"
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
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
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-900">Disciplinary Action Notice</h4>
                      <p className="text-[11px] text-red-700 mt-0.5 font-medium leading-tight">This warning will be recorded in the employee's 201 file with optional SMS and App Push Notification.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Warning Subject</label>
                    <input 
                      required type="text" 
                      placeholder="e.g. Tardiness, Safety Violation, No-show"
                      value={warningSubject}
                      onChange={e => setWarningSubject(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-red-500 outline-none font-medium text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Incident Details & Action Plan</label>
                    <textarea 
                      required rows={2}
                      placeholder="Describe what happened and the required corrective action..."
                      value={warningDetails}
                      onChange={e => setWarningDetails(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none font-medium text-gray-900 resize-none"
                    />
                  </div>

                  <div className="pt-1 flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={sendPush}
                        onChange={e => setSendPush(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 group-hover:text-gray-900">
                        <Send className="w-3.5 h-3.5 text-indigo-500" /> Send App Push
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={sendSms}
                        onChange={e => setSendSms(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 group-hover:text-gray-900">
                        <Phone className="w-3.5 h-3.5 text-indigo-500" /> Send SMS Alert
                      </span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isSubmittingWarning}
                      className="w-full py-2.5 bg-red-600 text-white text-xs rounded-xl font-bold hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingWarning ? 'Recording Warning...' : 'Issue Official Warning'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'settings' && (
                <form onSubmit={saveSettings} className="max-w-xl mx-auto space-y-5 py-4">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3">
                    <Settings className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900">Profile & Salary Editor</h4>
                      <p className="text-xs text-indigo-700 mt-1 font-medium">Update the employee's role, operational level, and compensation. Promotions will automatically trigger an SMS/Push notification.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">System Role</label>
                      <select 
                        value={editForm.role}
                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      >
                        <option value="technician">Technician</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="hr">HR</option>
                        <option value="accountant">Accountant</option>
                        <option value="ceo">CEO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Employment Status</label>
                      <select 
                        value={editForm.employment_status}
                        onChange={e => setEditForm({...editForm, employment_status: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      >
                        <option value="ojt">OJT (Trainee)</option>
                        <option value="contractual">Contractual</option>
                        <option value="provisionary">Provisionary</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Technician Level</label>
                      <select 
                        value={editForm.technician_level}
                        onChange={e => setEditForm({...editForm, technician_level: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900"
                      >
                        <option value="helper">Helper</option>
                        <option value="technician">Technician</option>
                        <option value="senior">Senior Technician</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Daily Base Salary (₱)</label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editForm.base_salary}
                        onChange={e => setEditForm({...editForm, base_salary: Number(e.target.value)})}
                        className="w-full font-mono border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-700 bg-emerald-50"
                      />
                    </div>
                  </div>

                  {editForm.employment_status === 'ojt' && editForm.technician_level === 'senior' && (
                    <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded border border-red-200">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Error: An OJT cannot be assigned as a Senior Technician.
                    </div>
                  )}

                  <div className="pt-6">
                    <button 
                      type="submit"
                      disabled={isSavingSettings || (editForm.employment_status === 'ojt' && editForm.technician_level === 'senior')}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSavingSettings ? 'Saving...' : 'Save Profile & Compensation'}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-scale-in">
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-base">{previewingDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewingDoc(null)} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{previewingDoc.fileName}</h4>
                <p className="text-xs text-gray-500 mt-1 font-medium">Digital copy attached to 201 Employee File</p>
              </div>
              <div className="pt-2 flex gap-3">
                {previewingDoc.fileUrl ? (
                  <button 
                    onClick={() => window.open(previewingDoc.fileUrl, '_blank')}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    Open Document
                  </button>
                ) : (
                  <button 
                    onClick={() => alert(`Downloading copy of ${previewingDoc.fileName}...`)}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    Download File
                  </button>
                )}
                <button 
                  onClick={() => setPreviewingDoc(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-scale-in">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Remove Document?</h3>
                <p className="text-xs text-gray-500 mt-1.5 font-medium leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-gray-800">{deletingDoc.docType}</span> from <span className="font-bold text-gray-800">{selectedEmp.full_name}</span>'s 201 file?
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setDeletingDoc(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmRemoveFile(deletingDoc.docType, deletingDoc.dbField);
                    setDeletingDoc(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-sm transition-colors"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
