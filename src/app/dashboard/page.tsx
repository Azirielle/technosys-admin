import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import DashboardCharts from './DashboardCharts'
import { Users, Calendar, DollarSign } from 'lucide-react'

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient()

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (e) {
    console.error("Auth session expired or database wiped");
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch Live Metrics
  let empCount = 0;
  let schedCount = 0;
  let payCount = 0;
  let payslips: any[] = [];
  let recentTechs: any[] = [];
  let allTechs: any[] = [];
  let dbErrorMsg = "";

  try {
    const { count: eCount, error: eErr } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'technician');
    if (eErr) throw eErr;
    empCount = eCount || 0;

    const { count: sCount, error: sErr } = await supabaseAdmin.from('schedules').select('*', { count: 'exact', head: true });
    if (sErr) throw sErr;
    schedCount = sCount || 0;

    const { count: pCount, error: pErr } = await supabaseAdmin.from('payslips').select('*', { count: 'exact', head: true });
    if (pErr) throw pErr;
    payCount = pCount || 0;

    const { data: pData, error: psErr } = await supabaseAdmin.from('payslips').select('*, technician:profiles(full_name)').order('created_at', { ascending: false }).limit(10);
    if (psErr) throw psErr;
    payslips = pData || [];

    const { data: rData, error: rtErr } = await supabaseAdmin.from('profiles').select('*').eq('role', 'technician').order('created_at', { ascending: false }).limit(5);
    if (rtErr) throw rtErr;
    recentTechs = rData || [];

    const { data: allTechsData, error: allTechsErr } = await supabaseAdmin.from('profiles').select('id, full_name, role').in('role', ['technician', 'helper']).order('full_name', { ascending: true });
    if (allTechsErr) throw allTechsErr;
    allTechs = allTechsData || [];
  } catch (err: any) {
    console.error("Dashboard database fetch error:", err.message || err);
    dbErrorMsg = err.message || "Database connection or tables incomplete. Please check your migrations.";
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 transition-spring">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Command Center</h1>
      <p className="mt-1.5 text-sm text-slate-400 font-medium">Welcome back, <span className="text-slate-600 font-semibold">{user.email}</span></p>

      {dbErrorMsg && (
        <div className="mt-6 p-4.5 bg-rose-500/5 border border-rose-500/10 text-rose-800 rounded-2xl text-sm font-semibold flex items-center gap-3">
          <span>⚠️ <strong>Database Alert:</strong> {dbErrorMsg}. Please verify that all database migrations have been successfully executed.</span>
        </div>
      )}
      
      <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Card 1: Employees */}
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100/50 shadow-ambient-soft flex items-center justify-between group hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-100/50 transition-spring">
          <div>
            <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.15em]">Employees</h3>
            <p className="text-4xl font-extrabold text-slate-800 mt-2 font-tabular">{empCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white shadow-sm transition-spring">
            <Users className="w-5.5 h-5.5" />
          </div>
        </div>
        
        {/* Card 2: Active Schedules */}
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100/50 shadow-ambient-soft flex items-center justify-between group hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-100/50 transition-spring">
          <div>
            <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.15em]">Active Schedules</h3>
            <p className="text-4xl font-extrabold text-slate-800 mt-2 font-tabular">{schedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-indigo-500 group-hover:text-white shadow-sm transition-spring">
            <Calendar className="w-5.5 h-5.5" />
          </div>
        </div>
        
        {/* Card 3: Total Payslips */}
        <div className="p-6 bg-white rounded-[2rem] border border-slate-100/50 shadow-ambient-soft flex items-center justify-between group hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-100/50 transition-spring">
          <div>
            <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-[0.15em]">Total Payslips</h3>
            <p className="text-4xl font-extrabold text-slate-800 mt-2 font-tabular">{payCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-white shadow-sm transition-spring">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      <DashboardCharts payslips={payslips} recentTechnicians={recentTechs} allTechnicians={allTechs} />
    </div>
  )
}
