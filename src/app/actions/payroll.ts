"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

export async function publishPayslip(data: any) {
  try {
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

    if (error) throw error

    const { data: techProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', data.technician_id).single()
    const techName = techProfile?.full_name || data.technician_id
    await logActivity({
      category: 'payroll',
      action: 'published',
      description: `Published payslip for ${techName} with Net Pay of ₱${Number(data.net_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    })

    revalidatePath("/dashboard/payroll")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to publish payslip:", err.message || err)
    return { error: err.message || "Failed to publish payslip." }
  }
}
