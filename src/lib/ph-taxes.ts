import { supabaseAdmin } from "@/lib/supabase/admin"

export interface PayrollResult {
  grossPay: number;
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  totalDeductions: number;
  netPay: number;
}

/**
 * Dynamically checks if a given date is the true last day of the month.
 * Automatically handles 28th, 29th, 30th, and 31st.
 */
function isKatapusan(date: Date): boolean {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return nextDay.getDate() === 1; 
}

export async function calculatePayrollDeductions(
  technicianId: string, 
  currentCycleGross: number, 
  cycleDate: Date
): Promise<PayrollResult> {
  const is15th = cycleDate.getDate() === 15;
  const isEnd = isKatapusan(cycleDate);
  const currentCycleType = is15th ? '15th' : isEnd ? 'end_of_month' : 'custom';

  // 1. Aggregate total earnings and past deductions for the month
  const firstDayOfMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1).toISOString();
  const { data: previousPayslips } = await supabaseAdmin
    .from('payslips')
    .select('gross_pay, sss_deduction, philhealth_deduction, pagibig_deduction')
    .eq('technician_id', technicianId)
    .gte('created_at', firstDayOfMonth);

  const previousGross = previousPayslips?.reduce((sum, p) => sum + Number(p.gross_pay), 0) || 0;
  const prevSSS = previousPayslips?.reduce((sum, p) => sum + Number(p.sss_deduction), 0) || 0;
  const prevPH = previousPayslips?.reduce((sum, p) => sum + Number(p.philhealth_deduction), 0) || 0;
  const prevHDMF = previousPayslips?.reduce((sum, p) => sum + Number(p.pagibig_deduction), 0) || 0;
  
  const totalMonthlyGross = previousGross + currentCycleGross;

  // 2. Fetch Statutory Rules
  const { data: sssRule } = await supabaseAdmin.from('sss_brackets')
    .select('*').lte('min_compensation', totalMonthlyGross).gte('max_compensation', totalMonthlyGross).single();
    
  const { data: hdmfRule } = await supabaseAdmin.from('pagibig_brackets')
    .select('*').lte('min_compensation', totalMonthlyGross).gte('max_compensation', totalMonthlyGross).single();
    
  const { data: phRule } = await supabaseAdmin.from('philhealth_rules')
    .select('*').order('created_at', { ascending: false }).limit(1).single();

  // 3. Calculate Final Required Monthly Totals
  const requiredMonthlySSS = Number(sssRule?.employee_share || 0);
  const requiredMonthlyHDMF = Number(hdmfRule?.employee_share || 0);
  
  let requiredMonthlyPH = 0;
  if (phRule) {
    let phBase = totalMonthlyGross;
    if (phBase < Number(phRule.wage_floor)) phBase = Number(phRule.wage_floor);
    if (phBase > Number(phRule.wage_ceiling)) phBase = Number(phRule.wage_ceiling);
    requiredMonthlyPH = phBase * (Number(phRule.employee_share_percentage) / 100);
  }

  // 4. Apply to Cycles with Global True-Up
  let sss_deduction = 0;
  let philhealth_deduction = 0;
  let pagibig_deduction = 0;

  if (currentCycleType === '15th') {
    // Deduct standard predicted monthly requirement on the 15th
    if (phRule?.target_pay_cycle === '15th' || phRule?.target_pay_cycle === 'both') {
      philhealth_deduction = requiredMonthlyPH;
    }
    if (hdmfRule?.target_pay_cycle === '15th' || hdmfRule?.target_pay_cycle === 'both') {
      pagibig_deduction = requiredMonthlyHDMF;
    }
    if (sssRule?.target_pay_cycle === '15th' || sssRule?.target_pay_cycle === 'both') {
      sss_deduction = requiredMonthlySSS;
    }
  } else if (currentCycleType === 'end_of_month' || currentCycleType === 'custom') {
    // GLOBAL TRUE-UP: Recalculate true requirement based on FINAL total monthly gross
    // custom applies same as end_of_month for testing purposes
    if (sssRule?.target_pay_cycle === 'end_of_month' || sssRule?.target_pay_cycle === 'both' || requiredMonthlySSS > prevSSS) {
       sss_deduction = Math.max(0, requiredMonthlySSS - prevSSS);
    }
    if (phRule?.target_pay_cycle === 'end_of_month' || phRule?.target_pay_cycle === 'both' || requiredMonthlyPH > prevPH) {
       philhealth_deduction = Math.max(0, requiredMonthlyPH - prevPH);
    }
    if (hdmfRule?.target_pay_cycle === 'end_of_month' || hdmfRule?.target_pay_cycle === 'both' || requiredMonthlyHDMF > prevHDMF) {
       pagibig_deduction = Math.max(0, requiredMonthlyHDMF - prevHDMF);
    }
  }

  const totalDeductions = sss_deduction + philhealth_deduction + pagibig_deduction;
  const netPay = currentCycleGross - totalDeductions;

  return {
    grossPay: currentCycleGross,
    sssDeduction: sss_deduction,
    philhealthDeduction: philhealth_deduction,
    pagibigDeduction: pagibig_deduction,
    totalDeductions,
    netPay
  };
}
