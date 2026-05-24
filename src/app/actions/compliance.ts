"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { PhilHealthRuleSchema, PagibigRuleSchema } from "@/lib/validations/compliance"

export async function updatePhilHealthRules(formData: FormData) {
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

  if (error) {
    return { error: "Database transaction failed: " + error.message };
  }

  // 3. Purge the Next.js cache so the Payroll Engine instantly uses the new rules
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/payroll');
  
  return { success: true };
}

export async function updatePagibigRules(formData: FormData) {
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

  if (error) return { error: "Database transaction failed: " + error.message };

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/payroll');
  
  return { success: true };
}
