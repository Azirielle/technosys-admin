"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// 1. Fetch all office locations (active or inactive)
export async function getOfficeLocations() {
  try {
    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch office locations:", err.message)
    return []
  }
}

// 2. Fetch active locations only (used by mobile/admin components)
export async function getActiveOfficeLocations() {
  try {
    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .select('*')
      .eq('is_active', true)

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch active office locations:", err.message)
    return []
  }
}

// 3. Add a new office location
import { logActivity } from "./activity"

export async function addOfficeLocation(formData: FormData) {
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
      return { error: "Permission Denied: Only Super Administrators can modify geofence locations." }
    }

    const name = formData.get("name")?.toString().trim()
    if (!name) {
      return { error: "Branch name is required." }
    }
    const latitude = Number(formData.get("latitude"))
    const longitude = Number(formData.get("longitude"))
    const radius_meters = Number(formData.get("radius_meters"))

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius_meters)) {
      return { error: "Latitude, longitude, and radius must be valid numbers." }
    }

    if (latitude < -90 || latitude > 90) {
      return { error: "Latitude must be between -90 and 90." }
    }

    if (longitude < -180 || longitude > 180) {
      return { error: "Longitude must be between -180 and 180." }
    }

    if (radius_meters <= 0 || radius_meters > 10000) {
      return { error: "Radius must be between 1 and 10,000 meters." }
    }

    // Check for duplicate branch name (case-insensitive)
    const { data: existingLocation, error: checkError } = await supabaseAdmin
      .from('office_locations')
      .select('id')
      .ilike('name', name)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking duplicate branch name:", checkError.message)
    }

    if (existingLocation) {
      return { error: `A branch with the name "${name}" already exists.` }
    }

    const { error } = await supabaseAdmin
      .from('office_locations')
      .insert({
        name,
        latitude,
        longitude,
        radius_meters,
        is_active: true
      })

    if (error) throw error

    // Log administrative activity
    await logActivity('add_location', 'settings', `Added branch location "${name}" with geofence radius ${radius_meters}m`)

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to add office location:", err.message)
    return { error: "Database transaction failed: " + err.message }
  }
}

// 4. Toggle location active status
export async function toggleLocationActive(id: string, isActive: boolean) {
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
      return { error: "Permission Denied: Only Super Administrators can modify geofence locations." }
    }

    // Get location name for descriptive logs
    const { data: loc } = await supabaseAdmin.from('office_locations').select('name').eq('id', id).single()
    const locName = loc?.name || id

    const { error } = await supabaseAdmin
      .from('office_locations')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // Log administrative activity
    await logActivity('toggle_location', 'settings', `${isActive ? 'Activated' : 'Deactivated'} branch location "${locName}"`)

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to toggle office location ${id}:`, err.message)
    return { error: "Failed to update location: " + err.message }
  }
}
