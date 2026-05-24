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
  const { count: empCount } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
  const { count: schedCount } = await supabaseAdmin.from('schedules').select('*', { count: 'exact', head: true });
  const { count: payCount } = await supabaseAdmin.from('payslips').select('*', { count: 'exact', head: true });

  const { data: payslips } = await supabaseAdmin.from('payslips').select('*, technician:profiles(full_name)').order('created_at', { ascending: false }).limit(10);
  const { data: recentTechs } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Command Center</h1>
      <p className="mt-2 text-slate-500 font-medium">Welcome back, {user.email}</p>
      
      <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Employees</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{empCount || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Active Schedules</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{schedCount || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-slate-500 text-sm uppercase tracking-wider">Total Payslips</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{payCount || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      <DashboardCharts payslips={payslips || []} recentTechnicians={recentTechs || []} />
    </div>
  )
}
