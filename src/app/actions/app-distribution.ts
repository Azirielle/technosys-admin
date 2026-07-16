"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

export async function registerAppVersion(version_name: string, apk_file_url: string, release_notes: string) {
  try {
    // 1. Verify caller is Admin
    const { authorized, userId } = await verifyRoleAccess('app_management', true)
    if (!authorized || !userId) {
      return { error: "Unauthorized. You do not have permission to manage app versions." }
    }

    // 2. Set all other versions to inactive
    await supabaseAdmin
      .from('app_versions')
      .update({ is_active: false })
      .neq('is_active', false)

    // 3. Insert the new active version
    const { data, error } = await supabaseAdmin
      .from('app_versions')
      .insert({
        version_name,
        apk_file_url,
        release_notes,
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    // 4. Log the activity
    await logActivity(userId, 'app_version_released', `Released new APK version: ${version_name}`)

    revalidatePath('/dashboard/app-management')
    return { success: true, data }
  } catch (err: any) {
    console.error("Failed to register app version:", err.message)
    return { error: err.message }
  }
}

export async function getActiveAppVersion() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_versions')
      .select('id, version_name, release_notes, created_at, is_active')
      .eq('is_active', true)
      .single()
      
    // It's okay if there's no active version yet
    if (error && error.code !== 'PGRST116') throw error
    
    return { data }
  } catch (err: any) {
    console.error("Failed to fetch active app version:", err.message)
    return { error: err.message }
  }
}

export async function getSignedDownloadUrl() {
  try {
    const { data: activeVersion, error: fetchError } = await supabaseAdmin
      .from('app_versions')
      .select('apk_file_url')
      .eq('is_active', true)
      .single()

    if (fetchError || !activeVersion) {
      throw new Error("No active app version found.")
    }

    // Bypass signed URL if it's an external link
    if (activeVersion.apk_file_url.startsWith('http')) {
      return { url: activeVersion.apk_file_url }
    }

    // Generate a 5-minute signed URL for Supabase storage
    const { data: signedData, error: signError } = await supabaseAdmin
      .storage
      .from('app-releases')
      .createSignedUrl(activeVersion.apk_file_url, 300)

    if (signError) throw signError

    return { url: signedData.signedUrl }
  } catch (err: any) {
    console.error("Failed to generate signed URL:", err.message)
    return { error: err.message }
  }
}
