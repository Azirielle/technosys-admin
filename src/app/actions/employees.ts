"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
<<<<<<< HEAD
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { logActivity } from "./activity"
import { sendPushNotification } from "@/lib/push"
=======
import { z } from "zod"
>>>>>>> glorycode24/kan-36-bulk-import-employees

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
  branchId?: string | null
  lifecycleStatus?: string
}

// 1. Fetch all technicians (combining Auth and Profile tables)
export async function getTechnicians(): Promise<TechnicianInfo[]> {
  try {
    // Determine the logged-in user's role and branch
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let userBranchId: string | null = null
    let isSupervisor = false

    if (user) {
      const { data: logProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single()
      
      if (logProfile) {
        isSupervisor = ['supervisor', 'branch_manager'].includes(logProfile.role)
        userBranchId = logProfile.branch_id
      }
    }

    // Fetch profiles - technicians and helpers
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      
    if (isSupervisor && userBranchId) {
      query = query.eq('branch_id', userBranchId)
    }

    const { data: profiles, error: profileError } = await query.order('created_at', { ascending: false })

    if (profileError) throw profileError

    // Filter roles in memory to be resilient if the database migration is not yet run
    const targetRoles = ['technician', 'helper']
    const filteredProfiles = (profiles || []).filter(p => targetRoles.includes(p.role))

    // Fetch auth users to match emails
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    // Fetch active time logs (clocked-in)
    const { data: activeLogs, error: logsError } = await supabaseAdmin
      .from('time_logs')
      .select('technician_id')
      .is('app_time_out', null)

    if (logsError) throw logsError

    // Fetch approved leaves overlapping with today
    const todayStr = new Date().toISOString().substring(0, 10) // YYYY-MM-DD
    const { data: activeLeaves, error: leavesError } = await supabaseAdmin
      .from('leaves')
      .select('technician_id')
      .eq('status', 'approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)

    if (leavesError) throw leavesError

    const activeTechIds = new Set((activeLogs || []).map(l => l.technician_id))
    const onLeaveTechIds = new Set((activeLeaves || []).map(l => l.technician_id))

    // Map profiles to match with their emails
    const mapped: TechnicianInfo[] = (filteredProfiles).map(p => {
      const authUser = users.find(u => u.id === p.id)
      
      let currentStatus: 'active' | 'on_leave' | 'off_duty' = 'off_duty'
      if (activeTechIds.has(p.id)) {
        currentStatus = 'active'
      } else if (onLeaveTechIds.has(p.id)) {
        currentStatus = 'on_leave'
      }

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
        branchId: p.branch_id,
        lifecycleStatus: p.lifecycle_status || 'active'
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
    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', id).single()
    const name = profile?.full_name || id

    // Deleting the auth user automatically deletes the public.profile due to CASCADE delete
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error

    await logActivity({
      category: 'employees',
      action: 'deleted',
      description: `Deleted employee ${name}`
    })

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
      .neq('role', 'technician')
      .neq('role', 'helper')
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
    const role = (formData.get("role") as string) || "admin"

    if (!email || !password || !fullName) {
      return { error: "All fields are required." }
    }

    const allowedRoles = ['admin', 'super_admin', 'hr', 'coordinator', 'accountant', 'branch_manager', 'supervisor']
    if (!allowedRoles.includes(role)) {
      return { error: "Invalid administrator role selected." }
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

    // B. Insert/restore profile with selected role
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUser.id,
      full_name: fullName,
      role: role,
      base_salary: 0
    })

    if (profileError) {
      if (createdNewAuth && authUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      }
      throw profileError
    }

    await logActivity({
      category: 'employees',
      action: 'created',
      description: `Registered new administrator ${fullName} (${email}) as ${role}`
    })

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create admin:", err.message || err)
    return { error: err.message || "Failed to create administrator account." }
  }
}

// 5. Delete an Admin account
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
      .select('role, full_name')
      .eq('id', id)
      .single()

    if (profileErr) throw profileErr

    if (targetProfile?.role === 'super_admin') {
      return { error: "Security Restriction: Super Administrator accounts cannot be deleted through this interface." }
    }

    const name = targetProfile?.full_name || id

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error

    await logActivity({
      category: 'employees',
      action: 'deleted',
      description: `Deleted administrator ${name}`
    })

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
  branchId?: string | null
  lifecycleStatus?: string
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

    const { data: empProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', employeeId)
      .single()

    const empName = empProfile?.full_name || employeeId

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
        hire_date: data.hireDate || null,
        branch_id: data.branchId || null,
        lifecycle_status: data.lifecycleStatus || 'active'
      })
      .eq('id', employeeId)

    if (error) throw error

    await logActivity({
      category: 'compliance',
      action: 'updated',
      description: `Updated 201 compliance checklist for ${empName}`
    })

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

export async function addManualDtrLog(employeeId: string, clockIn: string, clockOut: string, justification: string) {
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

    // A. Insert time log
    const { data: newLog, error: insertError } = await supabaseAdmin
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
      .select()
      .single()

    if (insertError) throw insertError

    // B. Write override history
    const { error: historyErr } = await supabaseAdmin
      .from('dtr_override_logs')
      .insert({
        modifier_id: user.id,
        target_id: employeeId,
        log_id: newLog.id,
        original_time_in: null,
        original_time_out: null,
        new_time_in: clockIn,
        new_time_out: clockOut,
        justification: justification
      })

    if (historyErr) throw historyErr

    // Look up target profile and send push notification
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .eq('id', employeeId)
      .single();
    if (targetProfile?.push_token) {
      await sendPushNotification(
        targetProfile.push_token,
        "DTR Log Adjusted",
        "Your supervisor has manually adjusted your daily attendance record."
      );
    }

    // C. Log activity
    await logActivity('insert_manual_dtr', 'employee', `Inserted manual DTR log for target "${employeeId}" (In: ${clockIn}, Out: ${clockOut})`)

    await logActivity({
      category: 'employees',
      action: 'updated',
      description: `Inserted manual DTR override log for employee ${empName} (${clockIn} to ${clockOut})`
    })

    revalidatePath('/dashboard/employees')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to add manual DTR log for employee ${employeeId}:`, err.message || err)
    return { error: err.message || "Failed to add manual DTR entry." }
  }
}

<<<<<<< HEAD
export async function overrideDtrLog(
  employeeId: string,
  logId: string,
  newClockIn: string,
  newClockOut: string,
  justification: string
) {
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
      return { error: "Security Restriction: You do not have permission to override DTR logs." }
    }

    const timeIn = new Date(newClockIn)
    const timeOut = new Date(newClockOut)
    if (isNaN(timeIn.getTime()) || isNaN(timeOut.getTime())) {
      return { error: "Invalid clock-in or clock-out timestamp format." }
    }
    if (timeOut <= timeIn) {
      return { error: "Clock-out timestamp must be after clock-in timestamp." }
    }

    // A. Get original times
    const { data: origLog, error: origError } = await supabaseAdmin
      .from('time_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (origError || !origLog) {
      return { error: "Original DTR log not found." }
    }

    const diffMs = timeOut.getTime() - timeIn.getTime()
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2))

    // B. Update time_log
    const { error: updateErr } = await supabaseAdmin
      .from('time_logs')
      .update({
        app_time_in: newClockIn,
        app_time_out: newClockOut,
        total_hours: totalHours,
        is_manual_entry: true
      })
      .eq('id', logId)

    if (updateErr) throw updateErr

    // C. Write override history
    const { error: historyErr } = await supabaseAdmin
      .from('dtr_override_logs')
      .insert({
        modifier_id: user.id,
        target_id: employeeId,
        log_id: logId,
        original_time_in: origLog.app_time_in,
        original_time_out: origLog.app_time_out,
        new_time_in: newClockIn,
        new_time_out: newClockOut,
        justification: justification
      })

    if (historyErr) throw historyErr

    // Look up target profile and send push notification
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .eq('id', employeeId)
      .single();
    if (targetProfile?.push_token) {
      await sendPushNotification(
        targetProfile.push_token,
        "DTR Log Adjusted",
        "Your supervisor has manually adjusted your daily attendance record."
      );
    }

    // D. Log activity
    await logActivity('override_dtr', 'employee', `Overrode DTR log for target "${employeeId}" from (In: ${origLog.app_time_in}, Out: ${origLog.app_time_out}) to (In: ${newClockIn}, Out: ${newClockOut})`)

    revalidatePath('/dashboard/employees')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to override DTR log:`, err.message || err)
    return { error: err.message || "Failed to override DTR record." }
  }
}

export async function getDtrOverrideHistories(employeeId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('dtr_override_logs')
      .select('*, modifier:profiles!modifier_id(full_name)')
      .eq('target_id', employeeId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch DTR override histories:", err)
    return []
  }
}


// 6. Simulate a physical office biometric fingerprint scan
export async function simulateBiometricScan(employeeId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('physical_biometric_scans')
      .insert({ employee_id: employeeId })
      .select()
      .single()

    if (error) throw error
    
    // Trigger revalidations
    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')
    
    return { success: true, data }
  } catch (err: any) {
    console.error("Failed to simulate biometric scan:", err.message || err)
    return { error: err.message || "Failed to trigger simulated scan" }
  }
}

// Zod validation schema for bulk import
const employeeImportSchema = z.object({
  fullName: z.string().min(2, "Full Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['technician', 'helper']),
  baseSalary: z.number().min(0, "Base Salary must be at least 0"),
  branchName: z.string().optional().nullable()
})

// Bulk Register Employees Server Action
export async function bulkRegisterEmployees(employeesRaw: any[]) {
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
      return { error: "Security Restriction: You do not have permission to register employees." }
    }

    // Load office locations for mapping branch names to branch IDs
    const { data: locations } = await supabaseAdmin.from('office_locations').select('id, name')
    const locationMap = new Map((locations || []).map(loc => [loc.name.toLowerCase().trim(), loc.id]))

    const results = []
    let successCount = 0
    let failureCount = 0

    // Fetch list of all users once to optimize existing user check speed
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError
    const allAuthUsers = listData?.users || []

    for (let index = 0; index < employeesRaw.length; index++) {
      const row = employeesRaw[index]
      const rowNum = index + 1

      // Zod validation
      const parseResult = employeeImportSchema.safeParse(row)
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map((e: any) => e.message).join(', ')
        results.push({ rowNum, name: row.fullName || 'Unknown', success: false, error: `Validation error: ${errors}` })
        failureCount++
        continue
      }

      const emp = parseResult.data
      const branchId = emp.branchName ? locationMap.get(emp.branchName.toLowerCase().trim()) : null

      try {
        let authUser = null
        let createdNewAuth = false

        // Check if user already exists in auth list locally
        const existingUser = allAuthUsers.find(u => u.email?.toLowerCase() === emp.email.toLowerCase())

        if (existingUser) {
          authUser = existingUser
          // Update password/metadata
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: 'Password123!',
            user_metadata: { full_name: emp.fullName }
          })
          if (updateError) throw updateError
        } else {
          // Create new user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emp.email,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { full_name: emp.fullName }
          })
          if (authError) throw authError
          authUser = authData.user
          createdNewAuth = true
        }

        // Upsert profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
          id: authUser.id,
          full_name: emp.fullName,
          role: emp.role,
          base_salary: emp.baseSalary,
          branch_id: branchId || null,
          lifecycle_status: 'active'
        })

        if (profileError) {
          if (createdNewAuth && authUser?.id) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.id)
          }
          throw profileError
        }

        // Log individual activity
        await logActivity('register_employee', 'employee', `Registered employee "${emp.fullName}" (${emp.role}) via bulk import`)

        results.push({ rowNum, name: emp.fullName, success: true })
        successCount++
      } catch (e: any) {
        results.push({ rowNum, name: emp.fullName, success: false, error: e.message || 'Database error' })
        failureCount++
      }
    }

    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard')

    return { success: true, results, successCount, failureCount }
  } catch (err: any) {
    console.error("Bulk registration error:", err)
    return { error: err.message || "Failed to process bulk registration request." }
  }
}

