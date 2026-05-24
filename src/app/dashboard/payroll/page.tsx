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

  // Pre-calculate payroll dynamically via the new engine
  const payrolls = await Promise.all(safeTechnicians.map(async (emp) => {
    return {
      technician_id: emp.id,
      calculation: await calculatePayrollDeductions(emp.id, Number(emp.base_salary), cycleDate)
    };
  }));

  return <PayrollClient 
    technicians={safeTechnicians} 
    publishedPayslips={payslips || []} 
    payrolls={payrolls} 
  />
}
