import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardCharts from './DashboardCharts'
import { Users, Calendar, DollarSign } from 'lucide-react'
import { getBranchFilter } from '@/lib/branch-filter'

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
  let recentActivities: any[] = [];
  let officeLocations: any[] = [];
  let dbErrorMsg = "";
  
  let empTrendText = "Team fully onboarded";
  let schedTrendText = "No active shifts today";
  let payTrendText = "Up to date";
  let displayName = user.user_metadata?.full_name || user.email || "User";

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Good afternoon";
  }

  try {
    const filterBranchId = await getBranchFilter()

    // Query user profile name if possible
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile?.full_name) {
        displayName = profile.full_name;
      }
    } catch (e) {
      console.error("Error fetching profile name:", e);
    }

    // 1. Employee query & count
    let empQuery = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: false }).in('role', ['technician', 'helper']);
    if (filterBranchId) {
      empQuery = empQuery.eq('branch_id', filterBranchId);
    }
    const { data: empData, count: eCount, error: eErr } = await empQuery;
    if (eErr) throw eErr;
    empCount = eCount || 0;
    const branchStaffIds = (empData || []).map(s => s.id);

    // 2. Schedules query & count
    let schedQuery = supabaseAdmin.from('schedules').select('*', { count: 'exact', head: false });
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        schedQuery = schedQuery.in('technician_id', branchStaffIds);
      } else {
        schedQuery = schedQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { count: sCount, error: sErr } = await schedQuery;
    if (sErr) throw sErr;
    schedCount = sCount || 0;

    // 3. Payslips query & count
    let payQuery = supabaseAdmin.from('payslips').select('*', { count: 'exact', head: false });
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        payQuery = payQuery.in('technician_id', branchStaffIds);
      } else {
        payQuery = payQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { count: pCount, error: pErr } = await payQuery;
    if (pErr) throw pErr;
    payCount = pCount || 0;

    // 4. Payslips list
    let payslipsListQuery = supabaseAdmin.from('payslips').select('*, technician:profiles(full_name, branch_id)');
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        payslipsListQuery = payslipsListQuery.in('technician_id', branchStaffIds);
      } else {
        payslipsListQuery = payslipsListQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: pData, error: psErr } = await payslipsListQuery.order('created_at', { ascending: false }).limit(10);
    if (psErr) throw psErr;
    payslips = pData || [];

    // 5. Recent techs
    let recentTechsQuery = supabaseAdmin.from('profiles').select('*').eq('role', 'technician');
    if (filterBranchId) {
      recentTechsQuery = recentTechsQuery.eq('branch_id', filterBranchId);
    }
    const { data: rData, error: rtErr } = await recentTechsQuery.order('created_at', { ascending: false }).limit(5);
    if (rtErr) throw rtErr;
    recentTechs = rData || [];

    // 6. All techs
    let allTechsQuery = supabaseAdmin.from('profiles').select('id, full_name, role').in('role', ['technician', 'helper']);
    if (filterBranchId) {
      allTechsQuery = allTechsQuery.eq('branch_id', filterBranchId);
    }
    const { data: allTechsData, error: allTechsErr } = await allTechsQuery.order('full_name', { ascending: true });
    if (allTechsErr) throw allTechsErr;
    allTechs = allTechsData || [];

    // Fetch active office locations for biometric terminal emulation
    const { data: officeData } = await supabaseAdmin
      .from('office_locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    officeLocations = officeData || [];

    // 7. Recent activities
    let recentActQuery = supabaseAdmin.from('activity_logs').select('*, actor:profiles(full_name, branch_id)');
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        recentActQuery = recentActQuery.in('actor_id', branchStaffIds);
      } else {
        recentActQuery = recentActQuery.eq('actor_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { data: actData, error: actErr } = await recentActQuery.order('created_at', { ascending: false }).limit(6);
    if (actErr) throw actErr;
    recentActivities = actData || [];

    // 8. Fetch Trends
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let empTrendQuery = supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['technician', 'helper']).gte('created_at', thirtyDaysAgo);
    if (filterBranchId) {
      empTrendQuery = empTrendQuery.eq('branch_id', filterBranchId);
    }
    const { count: empTrendCount } = await empTrendQuery;
    if (empTrendCount && empTrendCount > 0) {
      empTrendText = `+${empTrendCount} new this month`;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let schedTrendQuery = supabaseAdmin.from('schedules').select('id', { count: 'exact', head: true }).gte('start_time', `${todayStr}T00:00:00`).lte('start_time', `${todayStr}T23:59:59`);
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        schedTrendQuery = schedTrendQuery.in('technician_id', branchStaffIds);
      } else {
        schedTrendQuery = schedTrendQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { count: schedTrendCount } = await schedTrendQuery;
    if (schedTrendCount && schedTrendCount > 0) {
      schedTrendText = `${schedTrendCount} scheduled today`;
    }

    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    let payTrendQuery = supabaseAdmin.from('payslips').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth);
    if (filterBranchId) {
      if (branchStaffIds.length > 0) {
        payTrendQuery = payTrendQuery.in('technician_id', branchStaffIds);
      } else {
        payTrendQuery = payTrendQuery.eq('technician_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const { count: payTrendCount } = await payTrendQuery;
    if (payTrendCount && payTrendCount > 0) {
      payTrendText = `+${payTrendCount} issued this month`;
    }

  } catch (err: any) {
    console.error("Dashboard database fetch error:", err.message || err);
    dbErrorMsg = err.message || "Database connection or tables incomplete. Please check your migrations.";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Command Center</h1>
          <p className="mt-2 text-slate-500 font-medium text-lg flex items-center gap-2">
            <span>✨</span> {greeting}, <span className="text-slate-900 font-semibold">{displayName}</span>
          </p>
        </div>
      </div>

      {dbErrorMsg && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-medium">
          ⚠️ <strong>Database Alert:</strong> {dbErrorMsg}. Please verify that all database migrations have been successfully executed.
        </div>
      )}
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Link href="/dashboard/employees" className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-cyan-200 shadow-sm flex flex-col justify-between group hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Employees</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{empCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 uppercase tracking-wide">Trend</span>
            <span>{empTrendText}</span>
          </div>
        </Link>
        
        <Link href="/dashboard/schedules" className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 shadow-sm flex flex-col justify-between group hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Active Schedules</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{schedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wide">Today</span>
            <span>{schedTrendText}</span>
          </div>
        </Link>
        
        <Link href="/dashboard/payroll" className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-emerald-200 shadow-sm flex flex-col justify-between group hover:shadow-md hover:scale-[1.01] transition-all duration-200">
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Total Payslips</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{payCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wide">Payslips</span>
            <span>{payTrendText}</span>
          </div>
        </Link>
      </div>

      <DashboardCharts 
        payslips={payslips} 
        recentTechnicians={recentTechs} 
        allTechnicians={allTechs} 
        recentActivities={recentActivities} 
        officeLocations={officeLocations}
      />
    </div>
  )
}
