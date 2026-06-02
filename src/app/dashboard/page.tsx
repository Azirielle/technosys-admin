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
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Command Center</h1>
      <p className="mt-2 text-slate-500 font-medium">Welcome back, {user.email}</p>

      {dbErrorMsg && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-medium">
          ⚠️ <strong>Database Alert:</strong> {dbErrorMsg}. Please verify that all database migrations have been successfully executed.
        </div>
      )}
      
      <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Employees</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{empCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Active Schedules</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{schedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Total Payslips</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{payCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      <DashboardCharts payslips={payslips} recentTechnicians={recentTechs} allTechnicians={allTechs} />
    </div>
  )
}
