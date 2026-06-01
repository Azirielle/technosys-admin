"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export interface TechnicianInfo {
  id: string
  fullName: string
  email: string
  baseSalary: number
  createdAt: string
}

// 1. Fetch all technicians (combining Auth and Profile tables)
export async function getTechnicians(): Promise<TechnicianInfo[]> {
  try {
    // Fetch profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('created_at', { ascending: false })

    if (profileError) throw profileError

    // Fetch auth users to match emails
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    // Map profiles to match with their emails
    const mapped: TechnicianInfo[] = (profiles || []).map(p => {
      const authUser = users.find(u => u.id === p.id)
      return {
        id: p.id,
        fullName: p.full_name,
        email: authUser?.email || "Unknown Email",
        baseSalary: Number(p.base_salary || 0),
        createdAt: p.created_at
      }
    })

    return mapped
  } catch (err: any) {
    console.error("Failed to fetch technicians list:", err.message || err)
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

