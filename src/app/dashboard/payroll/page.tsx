import { supabaseAdmin } from "@/lib/supabase/admin"
import PayrollClient from "./PayrollClient"
import { calculatePayrollDeductions } from "@/lib/ph-taxes"

export const revalidate = 0; // Ensure fresh data on load

export default async function PayrollPage() {
  // Fetch real technicians
  const { data: technicians } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', 'technician')
    .order('full_name')

  // Fetch published payslips to determine status
  const { data: payslips } = await supabaseAdmin
    .from('payslips')
    .select('*')
    .eq('status', 'published')

  const safeTechnicians = technicians || []
  
  // Predict today is the current cycle (for demonstration)
  // In a real system, you would select the cycle date from a calendar
  const cycleDate = new Date(); 

  // Fetch active holidays from database
  const { data: holidays } = await supabaseAdmin
    .from('holidays')
    .select('*')
    .eq('is_active', true)

  const holidayMap = new Map<string, number>(
    (holidays || []).map(h => [h.holiday_date, Number(h.multiplier || 1.30)])
  )

  // Pre-calculate payroll dynamically via the new engine
  const firstDayOfMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1).toISOString();

  const payrolls = await Promise.all(safeTechnicians.map(async (emp) => {
    // 1. Fetch total hours and app_time_in to determine holiday overlaps
    const { data: logs } = await supabaseAdmin
      .from('time_logs')
      .select('total_hours, app_time_in')
      .eq('technician_id', emp.id)
      .gte('created_at', firstDayOfMonth);

    let totalHours = 0;
    let weightedHours = 0;

    (logs || []).forEach(log => {
      const hours = Number(log.total_hours || 0);
      totalHours += hours;

      if (log.app_time_in) {
        const dateStr = log.app_time_in.split('T')[0];
        const multiplier = holidayMap.get(dateStr) || 1.0;
        weightedHours += hours * multiplier;
      } else {
        weightedHours += hours;
      }
    });
    
    // 2. Compute gross pay based on standard 160 hours/month rate (using weighted hours for holiday premium)
    const hourlyRate = Number(emp.base_salary || 0) / 160;
    const computedGross = Number((hourlyRate * weightedHours).toFixed(2));

    return {
      technician_id: emp.id,
      totalHours: Number(totalHours.toFixed(2)),
      calculation: await calculatePayrollDeductions(emp.id, computedGross, cycleDate)
    };
  }));

  return <PayrollClient 
    technicians={safeTechnicians} 
    publishedPayslips={payslips || []} 
    payrolls={payrolls} 
  />
}
