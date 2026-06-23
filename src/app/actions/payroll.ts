"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { verifyRoleAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

export async function publishPayslip(data: any) {
  try {
    const { authorized } = await verifyRoleAccess('payroll', true)
    if (!authorized) {
      return { error: "Unauthorized. You do not have permissions to publish payslips." }
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabaseAdmin.from('payslips').insert({
      technician_id: data.technician_id,
      period_start: today,
      period_end: today,
      gross_pay: data.gross_pay,
      sss_deduction: data.sss_deduction,
      philhealth_deduction: data.philhealth_deduction,
      pagibig_deduction: data.pagibig_deduction,
      allowances: data.allowances || 0,
      net_pay: data.net_pay,
      status: 'published'
    })

    if (error) {
      if (error.message?.includes('allowances') || error.message?.includes('column')) {
        console.warn("Staging DB missing 'allowances' column. Retrying insert without it...");
        const { error: retryError } = await supabaseAdmin.from('payslips').insert({
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
        if (retryError) throw retryError
      } else {
        throw error
      }
    }

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
