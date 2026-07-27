"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

// Fetch list of documents (accessible by any authenticated user)
export async function getDocuments() {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*, branch:office_locations(name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch documents:", err.message || err)
    return []
  }
}

// Create/Upload a new document (restricted to admin & super_admin)
export async function createDocument(data: {
  name: string
  category: string
  fileUrl: string
  fileSize: number
  branchId?: string | null
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Validate admin access
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { error: "Security Restriction: Only administrators can upload forms or documents." }
    }

    const { name, category, fileUrl, fileSize, branchId } = data
    if (!name || !category || !fileUrl || !fileSize) {
      return { error: "All document fields are required." }
    }

    // Insert metadata
    const { error } = await supabaseAdmin
      .from('documents')
      .insert({
        name,
        category,
        file_url: fileUrl,
        file_size: fileSize,
        uploaded_by: user.id,
        branch_id: branchId || null
      })

    if (error) throw error

    // Log admin activity
    await logActivity('upload_document', 'settings', `Uploaded document "${name}" (Category: ${category})`)

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create document record:", err.message || err)
    return { error: err.message || "Failed to save document metadata." }
  }
}

// Delete/Archive a document (restricted to admin & super_admin)
export async function deleteDocument(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    // Validate admin access
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { error: "Security Restriction: Only administrators can remove forms or documents." }
    }

    // Get details to log activity
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('name')
      .eq('id', id)
      .single()

    const docName = doc?.name || 'Document'

    // Delete record from DB
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log admin activity
    await logActivity('delete_document', 'settings', `Deleted document "${docName}"`)

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete document:", err.message || err)
    return { error: err.message || "Failed to delete document." }
  }
}
