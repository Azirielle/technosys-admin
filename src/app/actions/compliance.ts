"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { PhilHealthRuleSchema, PagibigRuleSchema } from "@/lib/validations/compliance"
import { createClient } from "@/lib/supabase/server"

export async function updatePhilHealthRules(formData: FormData) {
  try {
    // Verify role on the server
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: "Unauthorized access." }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return { error: "Permission Denied: Only Super Administrators can modify compliance settings." }
    }

    // Extract and convert form strings to numbers
    const rawData = {
      wageFloor: Number(formData.get("wageFloor")),
      wageCeiling: Number(formData.get("wageCeiling")),
      totalRatePercentage: Number(formData.get("totalRatePercentage")),
      employeeSharePercentage: Number(formData.get("employeeSharePercentage")),
    };

    // 1. Zod Validation (The Sanity Guardrail)
    const validatedData = PhilHealthRuleSchema.safeParse(rawData);
    
    if (!validatedData.success) {
      // Return the first Zod error message
      return { error: validatedData.error.issues[0].message };
    }

    // 2. Insert the sanitized, validated rule into Supabase
    const { error } = await supabaseAdmin.from('philhealth_rules').insert({
      wage_floor: validatedData.data.wageFloor,
      wage_ceiling: validatedData.data.wageCeiling,
      total_rate_percentage: validatedData.data.totalRatePercentage,
      employee_share_percentage: validatedData.data.employeeSharePercentage,
      target_pay_cycle: 'both' // PhilHealth deducts across both cycles dynamically
    });

    if (error) throw error

    // 3. Purge the Next.js cache so the Payroll Engine instantly uses the new rules
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/payroll');
    
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update PhilHealth rules:", err.message || err)
    return { error: "Database transaction failed: " + (err.message || err) }
  }
}

export async function updatePagibigRules(formData: FormData) {
  try {
    // Verify role on the server
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: "Unauthorized access." }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return { error: "Permission Denied: Only Super Administrators can modify compliance settings." }
    }

    const rawData = {
      maxCompensation: Number(formData.get("maxCompensation")),
      employeeShare: Number(formData.get("employeeShare")),
    };

    const validatedData = PagibigRuleSchema.safeParse(rawData);
    
    if (!validatedData.success) {
      return { error: validatedData.error.issues[0].message };
    }

    const { error } = await supabaseAdmin.from('pagibig_brackets').insert({
      min_compensation: 0,
      max_compensation: validatedData.data.maxCompensation,
      employee_share: validatedData.data.employeeShare,
      target_pay_cycle: '15th'
    });

    if (error) throw error

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/payroll');
    
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update Pag-IBIG rules:", err.message || err)
    return { error: "Database transaction failed: " + (err.message || err) }
  }
}
