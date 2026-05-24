"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function publishPayslip(data: any) {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabaseAdmin.from('payslips').insert({
    technician_id: data.technician_id,
    period_start: today,
    period_end: today,
    gross_pay: data.gross_pay,
    sss_deduction: data.sss_deduction,
    philhealth_deduction: data.philhealth_deduction,
    pagibig_deduction: data.pagibig_deduction,
    net_pay: data.net_pay,
    status: 'published'
  })

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/payroll")
}
