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
  const firstDay = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1);
  const lastDay = new Date(cycleDate.getFullYear(), cycleDate.getMonth() + 1, 0);

  const payrolls = await Promise.all(safeTechnicians.map(async (emp) => {
    // 1. Fetch total hours and app_time_in to determine holiday overlaps
    const { data: logs } = await supabaseAdmin
      .from('time_logs')
      .select('total_hours, app_time_in')
      .eq('technician_id', emp.id)
      .gte('created_at', firstDayOfMonth);

    let workedHours = 0;
    let weightedHours = 0;

    (logs || []).forEach(log => {
      const hours = Number(log.total_hours || 0);
      workedHours += hours;

      if (log.app_time_in) {
        const dateStr = log.app_time_in.split('T')[0];
        const multiplier = holidayMap.get(dateStr) || 1.0;
        weightedHours += hours * multiplier;
      } else {
        weightedHours += hours;
      }
    });

    // 2. Fetch approved leaves for the current month
    const { data: leaves } = await supabaseAdmin
      .from('leaves')
      .select('*')
      .eq('technician_id', emp.id)
      .eq('status', 'approved');

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    leaves?.forEach((leave) => {
      const startParts = leave.start_date.split('-');
      const endParts = leave.end_date.split('-');
      const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
      const end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));

      const curr = new Date(start);
      while (curr <= end) {
        if (curr >= firstDay && curr <= lastDay) {
          if (leave.leave_type === 'unpaid') {
            unpaidLeaveDays++;
          } else {
            paidLeaveDays++;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    });

    const paidLeaveHours = paidLeaveDays * 8;
    const unpaidLeaveHours = unpaidLeaveDays * 8;
    const totalHours = workedHours + paidLeaveHours;
    
    // 3. Compute gross pay based on standard 160 hours/month rate (using weighted hours + paid leave hours)
    const hourlyRate = Number(emp.base_salary || 0) / 160;
    const computedGross = Number((hourlyRate * (weightedHours + paidLeaveHours)).toFixed(2));   return {
      technician_id: emp.id,
      workedHours: Number(workedHours.toFixed(2)),
      paidLeaveDays,
      unpaidLeaveDays,
      paidLeaveHours,
      unpaidLeaveHours,
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
