"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"
import { verifyRoleAccess } from "@/lib/permissions"

/** Office staff only. write = lending, returns and tool edits. */
async function canUseInventory(write = false) {
  return (await verifyRoleAccess('inventory', write)).authorized
}
const NOT_ALLOWED = "Only office staff can manage tools."

// 1. Fetch all inventory items (Tools Catalog)
export async function getInventoryItems() {
  try {
    if (!(await canUseInventory())) return []
    const { data, error } = await supabaseAdmin
      .from('tools')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch inventory items:", err.message)
    return []
  }
}

// 2. Create or update a tool item (Coordinator Encoder)
export async function createOrUpdateInventoryItem(formData: FormData) {
  try {
    if (!(await canUseInventory(true))) return { error: NOT_ALLOWED }
    const id = formData.get("id")?.toString()
    const name = formData.get("name")?.toString().trim()
    const description = formData.get("description")?.toString().trim() || ""
    const category = formData.get("category")?.toString().trim() || "General Tools"
    const serial_number = formData.get("serial_number")?.toString().trim() || null
    const is_serialized = formData.get("is_serialized") === "true"
    const item_status = formData.get("status")?.toString() || "active"
    const total_stock = Number(formData.get("total_stock"))
    const image_url = formData.get("image_url")?.toString() || null
    const imageFile = formData.get("image") as File | null

    if (!name) {
      return { error: "Tool Name is required." }
    }

    if (!Number.isInteger(total_stock) || total_stock < 0) {
      return { error: "Total owned must be a whole number, 0 or more." }
    }

    // In the warehouse = total owned minus what's lent out now (never typed in, so it can't drift)
    let lentOut = 0
    if (id) {
      const { data: out, error: outErr } = await supabaseAdmin
        .from('tool_borrowings').select('quantity').eq('tool_id', id).eq('status', 'checked_out')
      if (outErr) throw outErr
      lentOut = (out ?? []).reduce((sum, b) => sum + (b.quantity ?? 1), 0)
      if (total_stock < lentOut) return { error: `Lent out right now: ${lentOut}. The total can't be less than that.` }
    }
    const available_stock = total_stock - lentOut

    let dbError
    let finalImageUrl = image_url
    let existingItem: any = null

    if (id) {
      // Fetch existing tool
      const { data } = await supabaseAdmin
        .from('tools')
        .select('*')
        .eq('id', id)
        .single()
      
      existingItem = data
      finalImageUrl = existingItem?.image_url || image_url

      // Handle Image Upload if a file is supplied
      if (imageFile && imageFile.size > 0) {
        if (existingItem?.image_url) {
          try {
            const oldPath = existingItem.image_url.split('/').pop()
            if (oldPath) {
              await supabaseAdmin.storage
                .from('inventory')
                .remove([oldPath])
            }
          } catch (e) {
            console.error("Failed to delete old image:", e)
          }
        }

        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('inventory')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true
          })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('inventory')
          .getPublicUrl(fileName)
        
        finalImageUrl = publicUrl
      }

      // Update item parameters
      const { error } = await supabaseAdmin
        .from('tools')
        .update({
          name,
          description,
          category,
          serial_number,
          is_serialized,
          status: item_status,
          total_stock,
          available_stock,
          image_url: finalImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      dbError = error
    } else {
      // Create new tool
      if (imageFile && imageFile.size > 0) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('inventory')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true
          })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('inventory')
          .getPublicUrl(fileName)
        
        finalImageUrl = publicUrl
      }

      // Insert new tool
      const { error } = await supabaseAdmin
        .from('tools')
        .insert({
          name,
          description,
          category,
          serial_number,
          is_serialized,
          status: item_status,
          total_stock,
          available_stock,
          image_url: finalImageUrl
        })
      
      dbError = error
    }

    if (dbError) throw dbError

    await logActivity({
      category: 'inventory',
      action: id ? 'updated' : 'created',
      description: `${id ? 'Updated' : 'Created'} inventory tool "${name}" [${category}] (Total: ${total_stock}, Available: ${available_stock})`
    })

    revalidatePath('/coordinator/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create/update inventory item:", err.message)
    return { error: "Failed to save inventory item. Please verify the details and try again." }
  }
}

// 3. Delete a tool item
export async function deleteInventoryItem(id: string) {
  try {
    if (!(await canUseInventory(true))) return { error: NOT_ALLOWED }
    // Check if there are active borrows for this tool
    const { count, error: countErr } = await supabaseAdmin
      .from('tool_borrowings')
      .select('*', { count: 'exact', head: true })
      .eq('tool_id', id)
      .eq('status', 'checked_out')

    if (countErr) throw countErr
    if (count && count > 0) {
      return { error: "Cannot delete this tool. Technicians currently have active checkouts of this tool." }
    }

    const { error } = await supabaseAdmin
      .from('tools')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logActivity({
      category: 'inventory',
      action: 'deleted',
      description: `Deleted tool item ID: ${id}`
    })

    revalidatePath('/coordinator/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete inventory item:", err.message)
    return { error: "Delete transaction failed: " + err.message }
  }
}

// 4. Fetch list of active technicians and helpers
export async function getTechnicians() {
  try {
    if (!(await canUseInventory())) return []
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('role', ['technician', 'helper'])
      .order('full_name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch technicians:", err.message)
    return []
  }
}

// 5. Fetch tool assignments (optionally filtered by technician)
export async function getToolAssignments(technicianId?: string) {
  try {
    if (!(await canUseInventory())) return []
    let query = supabaseAdmin
      .from('tool_borrowings')
      .select(`
        *,
        tool:tools!tool_id(name, image_url, category, serial_number),
        technician:profiles!technician_id(full_name, role)
      `)
      .order('handed_over_at', { ascending: false })

    if (technicianId) {
      query = query.eq('technician_id', technicianId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch tool assignments:", err.message)
    return []
  }
}

// 7. Process return / condition audit / damage / loss of a tool
export async function returnTool(
  assignmentId: string,
  status: 'returned' | 'lost' | 'damaged',
  conditionOnReturn: 'good' | 'minor_wear' | 'damaged' | 'lost' = 'good',
  conditionNotes?: string,
  receivedBy?: string
) {
  try {
    if (!(await canUseInventory(true))) return { error: NOT_ALLOWED }
    // One step in the database: locks the borrowing, refuses a second check-in, saves it and the stock together
    const { data, error } = await supabaseAdmin.rpc('check_in_tool', {
      p_borrowing_id: assignmentId, p_status: status, p_condition: conditionOnReturn,
      p_notes: conditionNotes, p_received_by: receivedBy,
    })
    if (error) throw error
    const res = data as { status: string; tool_name?: string; technician_id?: string; quantity?: number }
    if (res.status === 'not_found') return { error: "Handover assignment record not found." }
    if (res.status === 'already_checked_in') return { error: "This tool assignment has already been processed/returned." }
    const tool = { name: res.tool_name }
    const handoverQty = res.quantity ?? 1
    const assign = { technician_id: res.technician_id }

    // Fetch technician name
    const { data: tech } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', assign.technician_id as string)
      .single()
    const techName = tech?.full_name || 'Technician'

    await logActivity({
      category: 'inventory',
      action: status === 'returned' ? 'restocked' : status,
      description: `Processed return for ${handoverQty}x "${tool.name}" from ${techName} with condition [${conditionOnReturn.toUpperCase()}] and status ${status.toUpperCase()}${conditionNotes ? ` (Notes: ${conditionNotes})` : ''}`
    })

    revalidatePath('/coordinator/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to process tool return:", err.message)
    return { error: "Failed to process return. Please verify the quantities and try again." }
  }
}
