"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export interface TechnicianInfo {
  id: string
  fullName: string
  email: string
  baseSalary: number
  role: string
  createdAt: string
  managerId?: string | null
  hireDate?: string | null
  employmentStatus?: string
  hasSssId?: boolean
  hasPhilhealthId?: boolean
  hasPagibigId?: boolean
  hasNbiClearance?: boolean
  hasResume?: boolean
  hasMedicalClearance?: boolean
}

// 1. Fetch all technicians (combining Auth and Profile tables)
export async function getTechnicians(): Promise<TechnicianInfo[]> {
  try {
    // Fetch profiles - technicians and helpers
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profileError) throw profileError

    // Filter roles in memory to be resilient if the database migration is not yet run
    const targetRoles = ['technician', 'helper']
    const filteredProfiles = (profiles || []).filter(p => targetRoles.includes(p.role))

    // Fetch auth users to match emails
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    // Map profiles to match with their emails
    const mapped: TechnicianInfo[] = (filteredProfiles).map(p => {
      const authUser = users.find(u => u.id === p.id)
      return {
        id: p.id,
        fullName: p.full_name,
        email: authUser?.email || "Unknown Email",
        baseSalary: Number(p.base_salary || 0),
        role: p.role,
        createdAt: p.created_at,
        managerId: p.manager_id,
        hireDate: p.hire_date,
        employmentStatus: p.employment_status,
        hasSssId: p.has_sss_id,
        hasPhilhealthId: p.has_philhealth_id,
        hasPagibigId: p.has_pagibig_id,
        hasNbiClearance: p.has_nbi_clearance,
        hasResume: p.has_resume,
        hasMedicalClearance: p.has_medical_clearance,
      }
    })

    return mapped
  } catch (err: any) {
    console.error("Failed to fetch employees list:", err.message || err)
    return []
  }
}

// 2. Delete a technician
export async function deleteTechnician(id: string) {
  try {
    // Deleting the auth user automatically deletes the public.profile due to CASCADE delete
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to delete technician ${id}:`, err.message || err)
    return { error: err.message || "Failed to delete technician account." }
  }
}

// 3. Fetch all admins (combining Auth and Profile tables)
export async function getAdmins() {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })

    if (profileError) throw profileError

    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    const mapped = (profiles || []).map(p => {
      const authUser = users.find(u => u.id === p.id)
      return {
        id: p.id,
        fullName: p.full_name,
        email: authUser?.email || "Unknown Email",
        role: p.role,
        createdAt: p.created_at
      }
    })

    return mapped
  } catch (err: any) {
    console.error("Failed to fetch admins list:", err.message || err)
    return []
  }
}

// 4. Create a new standard Admin account
export async function createAdmin(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    if (!email || !password || !fullName) {
      return { error: "All fields are required." }
    }

    // A. Check if user already exists in auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const existingUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let authUser = null
    let createdNewAuth = false

    if (existingUser) {
      authUser = existingUser
      // Update metadata/password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: { full_name: fullName }
      })
      if (updateError) throw updateError
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })
      if (authError) throw authError
      authUser = authData.user
      createdNewAuth = true
    }

    // B. Insert/restore profile with admin role
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUser.id,
      full_name: fullName,
      role: 'admin',
      base_salary: 0
    })

    if (profileError) {
      if (createdNewAuth && authUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      }
      throw profileError
    }

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create admin:", err.message || err)
    return { error: err.message || "Failed to create administrator account." }
  }
}

// 5. Delete an Admin account
import { createClient } from '@/lib/supabase/server'

export async function deleteAdmin(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (currentUser?.id === id) {
      return { error: "Security Restriction: You cannot delete your own Administrator account." }
    }

    // Ensure we are deleting a standard admin and not a super admin
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single()

    if (profileErr) throw profileErr

    if (targetProfile?.role === 'super_admin') {
      return { error: "Security Restriction: Super Administrator accounts cannot be deleted through this interface." }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to delete admin ${id}:`, err.message || err)
    return { error: err.message || "Failed to delete administrator account." }
  }
}

export interface ChecklistData {
  hasSssId: boolean
  hasPhilhealthId: boolean
  hasPagibigId: boolean
  hasNbiClearance: boolean
  hasResume: boolean
  hasMedicalClearance: boolean
  employmentStatus: string
  managerId: string | null
  hireDate: string | null
}

export async function getPotentialManagers() {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'technician')
      .neq('role', 'helper')
      .order('full_name', { ascending: true })
    if (error) throw error
    return profiles || []
  } catch (err: any) {
    console.error("Failed to fetch potential managers:", err)
    return []
  }
}

export async function update201Checklist(employeeId: string, data: ChecklistData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin', 'ceo', 'coo', 'hr'].includes(profile.role)) {
      return { error: "Security Restriction: Only HR, CEO, COO or Admins can update compliance checklists." }
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        has_sss_id: data.hasSssId,
        has_philhealth_id: data.hasPhilhealthId,
        has_pagibig_id: data.hasPagibigId,
        has_nbi_clearance: data.hasNbiClearance,
        has_resume: data.hasResume,
        has_medical_clearance: data.hasMedicalClearance,
        employment_status: data.employmentStatus,
        manager_id: data.managerId || null,
        hire_date: data.hireDate || null
      })
      .eq('id', employeeId)

    if (error) throw error

    revalidatePath('/dashboard/employees')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to update 201 checklist for employee ${employeeId}:`, err.message || err)
    return { error: err.message || "Failed to update compliance checklist." }
  }
}

export async function getEmployeeTimeLogs(employeeId: string) {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('time_logs')
      .select('*')
      .eq('technician_id', employeeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return logs || []
  } catch (err: any) {
    console.error(`Failed to fetch logs for employee ${employeeId}:`, err)
    return []
  }
}

export async function addManualDtrLog(employeeId: string, clockIn: string, clockOut: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin', 'ceo', 'coo', 'svp', 'branch_manager', 'supervisor', 'coordinator'].includes(profile.role)) {
      return { error: "Security Restriction: You do not have permission to insert manual DTR logs." }
    }

    const timeIn = new Date(clockIn)
    const timeOut = new Date(clockOut)
    if (isNaN(timeIn.getTime()) || isNaN(timeOut.getTime())) {
      return { error: "Invalid clock-in or clock-out timestamp format." }
    }
    if (timeOut <= timeIn) {
      return { error: "Clock-out timestamp must be after clock-in timestamp." }
    }

    const diffMs = timeOut.getTime() - timeIn.getTime()
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2))

    const { error } = await supabaseAdmin
      .from('time_logs')
      .insert({
        technician_id: employeeId,
        app_time_in: clockIn,
        app_time_out: clockOut,
        total_hours: totalHours,
        geofence_status: 'manual_override',
        is_manual_entry: true,
        verified_with_machine: true
      })

    if (error) throw error

    revalidatePath('/dashboard/employees')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to add manual DTR log for employee ${employeeId}:`, err.message || err)
    return { error: err.message || "Failed to add manual DTR entry." }
  }
}

// 7. Bulk Register Employees
const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email format").trim(),
  role: z.enum(["technician", "helper"], { message: "Role must be either technician or helper" }),
  baseSalary: z.number().nonnegative("Base salary must be non-negative"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

const bulkImportSchema = z.array(employeeSchema)

export async function bulkRegisterEmployees(employeesData: any[]) {
  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { error: "Unauthorized access." }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    const allowedRoles = ['super_admin', 'admin', 'ceo', 'coo', 'hr']
    if (!profile || !allowedRoles.includes(profile.role)) {
      return { error: "Permission Denied: Only Administrators can bulk import employees." }
    }

    const parseResult = bulkImportSchema.safeParse(employeesData)
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      return { error: `Validation failed: ${issues}` }
    }

    const validatedEmployees = parseResult.data
    const results = []
    const errors = []

    for (const emp of validatedEmployees) {
      let authUser = null
      let createdNewAuth = false

      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: emp.email,
          password: emp.password,
          email_confirm: true,
          user_metadata: { full_name: emp.fullName }
        })

        if (authError) {
          if (authError.message.includes('already exists') || authError.status === 422) {
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError

            const existingUser = listData.users.find(u => u.email?.toLowerCase() === emp.email.toLowerCase())
            if (!existingUser) throw authError

            authUser = existingUser
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: emp.password,
              user_metadata: { full_name: emp.fullName }
            })
            if (updateError) throw updateError
          } else {
            throw authError
          }
        } else {
          authUser = authData.user
          createdNewAuth = true
        }

        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: authUser.id,
          full_name: emp.fullName,
          role: emp.role,
          base_salary: emp.baseSalary
        })

        if (profileError) {
          if (createdNewAuth && authUser?.id) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.id)
          }
          throw profileError
        }

        results.push({ email: emp.email, status: 'success' })
      } catch (err: any) {
        console.error(`Failed to register ${emp.email}:`, err.message || err)
        errors.push({ email: emp.email, error: err.message || "Unknown error" })
      }
    }

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')

    if (errors.length > 0) {
      return { 
        success: false, 
        error: `Import completed with errors. Registered: ${results.length}, Failed: ${errors.length}. First error: ${errors[0].error}`,
        results,
        errors
      }
    }

    return { success: true, count: results.length }
  } catch (err: any) {
    console.error("Bulk import failed:", err.message || err)
    return { error: "Bulk import execution failed: " + err.message }
  }
}

