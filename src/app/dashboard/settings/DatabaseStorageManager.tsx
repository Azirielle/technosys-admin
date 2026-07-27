"use client"

import React, { useState, useEffect } from 'react';
import { fetchStorageMetrics, purgeTableData } from '@/app/actions/storage';
import { createClient } from '@/lib/supabase/client';
import { Database, AlertTriangle, Download, Trash2, ShieldAlert } from 'lucide-react';

const SOFT_LIMIT_ROWS = 100000;

export default function DatabaseStorageManager() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  // Export & Purge States
  const [daysOld, setDaysOld] = useState<number>(90);
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState<number | null>(null);

  const supabase = createClient();

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchStorageMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExport = async () => {
    if (!selectedTable) return;
    setIsExporting(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffIso = cutoffDate.toISOString();

      // Client-side fetching to avoid Vercel timeouts
      // In a real production scenario with >100k rows, we would loop with pagination,
      // but for this demo, we use a single query which handles up to 10k easily.
      const { data, error } = await supabase
        .from(selectedTable)
        .select('*')
        .lt('created_at', cutoffIso);
        
      if (error) throw error;
      if (!data || data.length === 0) {
         alert("No data found older than " + daysOld + " days.");
         setIsExporting(false);
         return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).map(val => JSON.stringify(val ?? '')).join(','));
      const csv = [headers, ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${selectedTable}_${cutoffIso.split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setHasExported(true);
    } catch (e: any) {
      alert("Export failed: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurge = async () => {
    if (!selectedTable) return;
    if (confirmText !== 'CONFIRM PURGE') return;
    
    setIsPurging(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffIso = cutoffDate.toISOString();
      
      const deletedCount = await purgeTableData(selectedTable, cutoffIso);
      setPurgeSuccess(deletedCount);
      loadMetrics();
    } catch (e: any) {
      alert("Purge failed: " + e.message);
    } finally {
      setIsPurging(false);
      setConfirmText('');
    }
  };

  const closeModal = () => {
    setSelectedTable(null);
    setHasExported(false);
    setConfirmText('');
    setPurgeSuccess(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Database Storage Health</h2>
            <p className="text-sm text-slate-500">Monitor table bloat and archive old data</p>
          </div>
        </div>
        <button onClick={loadMetrics} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Refresh Metrics
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-6">
            {metrics.map((m, idx) => {
              const rowCount = parseInt(m.row_estimate) || 0;
              const fillPct = Math.min(100, Math.max(0, (rowCount / SOFT_LIMIT_ROWS) * 100));
              const isWarning = fillPct > 70;
              const isDanger = fillPct > 90;
              
              return (
                <div key={idx} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{m.table_name}</span>
                      {isDanger && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <button 
                      onClick={() => setSelectedTable(m.table_name)}
                      className="px-3 py-1 text-sm bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-slate-700 font-medium"
                    >
                      Manage
                    </button>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{rowCount.toLocaleString()} rows</span>
                    <span>{formatBytes(parseInt(m.table_bytes))}</span>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-right text-slate-400">Soft limit: {SOFT_LIMIT_ROWS.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TWO-STEP PURGE MODAL */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Archive {selectedTable}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            
            <div className="p-6 space-y-6">
              {purgeSuccess !== null ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Purge Complete</h4>
                  <p className="text-slate-600 mt-2">Successfully deleted {purgeSuccess.toLocaleString()} old records.</p>
                  <button onClick={closeModal} className="mt-6 w-full py-2 bg-slate-800 text-white rounded-lg font-medium">Done</button>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <p><strong>Two-Step Safety Lock:</strong> To prevent data loss, you MUST generate and download a local CSV backup before the system will allow you to delete records from the cloud.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Target Data Older Than:</label>
                    <select 
                      value={daysOld} 
                      onChange={(e) => setDaysOld(parseInt(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                      disabled={hasExported}
                    >
                      <option value={30}>30 Days</option>
                      <option value={60}>60 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={180}>6 Months</option>
                      <option value={365}>1 Year</option>
                    </select>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">1</span>
                      Generate Backup
                    </h4>
                    <button 
                      onClick={handleExport}
                      disabled={isExporting || hasExported}
                      className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 ${hasExported ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      <Download className="w-4 h-4" />
                      {isExporting ? 'Generating CSV...' : hasExported ? 'Backup Downloaded ✓' : 'Download Local CSV'}
                    </button>
                  </div>

                  <div className={`border ${hasExported ? 'border-red-200' : 'border-slate-200 opacity-50'} rounded-xl p-4`}>
                    <h4 className={`font-bold flex items-center gap-2 mb-3 ${hasExported ? 'text-red-600' : 'text-slate-500'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasExported ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>2</span>
                      Purge Cloud Data
                    </h4>
                    
                    <input 
                      type="text"
                      placeholder="Type CONFIRM PURGE"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={!hasExported || isPurging}
                      className="w-full p-2.5 border border-slate-300 rounded-lg mb-3"
                    />
                    
                    <button 
                      onClick={handlePurge}
                      disabled={!hasExported || confirmText !== 'CONFIRM PURGE' || isPurging}
                      className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 ${!hasExported || confirmText !== 'CONFIRM PURGE' ? 'bg-slate-200 text-slate-400' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {isPurging ? 'Deleting Records...' : 'Permanently Delete Data'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
