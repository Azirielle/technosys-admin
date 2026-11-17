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
    const available_stock = Number(formData.get("available_stock"))
    const image_url = formData.get("image_url")?.toString() || null
    const imageFile = formData.get("image") as File | null

    if (!name) {
      return { error: "Tool Name is required." }
    }

    if (isNaN(total_stock) || isNaN(available_stock) || total_stock < 0 || available_stock < 0) {
      return { error: "Quantities must be non-negative numbers." }
    }

    if (available_stock > total_stock) {
      return { error: "Available quantity cannot exceed total quantity in inventory." }
    }

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
    revalidatePath('/hr/inventory')
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
    revalidatePath('/hr/inventory')
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

// 6. Assign/Borrow a tool to a technician
export async function assignTool(technicianId: string, toolId: string, quantity: number = 1, notes?: string) {
  try {
    if (!(await canUseInventory(true))) return { error: NOT_ALLOWED }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: "Lend a whole number of 1 or more." }
    }
    if (!technicianId) return { error: "Choose who is borrowing it." }

    // Fetch tool to verify available stock level
    const { data: tool, error: toolErr } = await supabaseAdmin
      .from('tools')
      .select('name, available_stock')
      .eq('id', toolId)
      .single()

    if (toolErr || !tool) {
      return { error: "Tool not found in inventory catalog." }
    }

    const inStock = tool.available_stock ?? 0
    if (inStock < quantity) {
      return { error: inStock === 0 ? 'None left in the warehouse.' : `Only ${inStock} in the warehouse.` }
    }

    // Take the stock first, and only if nobody else changed it since we read it (two people lending at the
    // same moment can't both take the last ones). Then record the borrowing; if that fails, put the stock back.
    const { data: taken, error: updateErr } = await supabaseAdmin
      .from('tools')
      .update({
        available_stock: inStock - quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', toolId)
      .eq('available_stock', inStock)
      .select('id')

    if (updateErr) throw updateErr
    if (!taken || taken.length === 0) {
      return { error: "The stock just changed (someone else lent or returned this tool). Close this window and try again." }
    }

    const { error: insertErr } = await supabaseAdmin
      .from('tool_borrowings')
      .insert({
        technician_id: technicianId,
        tool_id: toolId,
        quantity,
        status: 'checked_out',
        notes: notes?.trim() || null
      })

    if (insertErr) {
      await supabaseAdmin.from('tools').update({ available_stock: inStock }).eq('id', toolId)
      throw insertErr
    }

    // Fetch technician name
    const { data: tech } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', technicianId)
      .single()
    const techName = tech?.full_name || 'Technician'

    await logActivity({
      category: 'inventory',
      action: 'checkout',
      description: `Assigned ${quantity}x "${tool.name}" to ${techName} (Notes: ${notes || 'None'})`
    })

    revalidatePath('/coordinator/inventory')
    revalidatePath('/hr/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to assign tool:", err.message)
    return { error: "Borrow transaction failed: " + err.message }
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
    // Fetch active assignment record
    const { data: assign, error: assignErr } = await supabaseAdmin
      .from('tool_borrowings')
      .select('*, tool:tools!tool_id(name, total_stock, available_stock)')
      .eq('id', assignmentId)
      .single()

    if (assignErr || !assign) {
      return { error: "Handover assignment record not found." }
    }

    if (assign.status !== 'checked_out') {
      return { error: "This tool assignment has already been processed/returned." }
    }

    const handoverQty = assign.quantity || 1

    // Update assignment status and condition audit details
    const { error: updateAssignErr } = await supabaseAdmin
      .from('tool_borrowings')
      .update({
        returned_at: new Date().toISOString(),
        status,
        condition_on_return: conditionOnReturn,
        condition_notes: conditionNotes?.trim() || null,
        received_by: receivedBy || null,
        notes: conditionNotes?.trim() || assign.notes
      })
      .eq('id', assignmentId)

    if (updateAssignErr) throw updateAssignErr

    const tool = assign.tool
    if (!tool) throw new Error('Tool not found in inventory catalog.')
    let nextAvailable = tool.available_stock ?? 0
    let nextTotal = tool.total_stock ?? 0

    if (status === 'returned') {
      // Returned in usable condition -> put back in warehouse stock
      nextAvailable = nextAvailable + handoverQty
    } else {
      // Lost or damaged beyond repair:
      // It does not return to available stock, and it permanently decreases total inventory assets
      nextTotal = Math.max(0, nextTotal - handoverQty)
    }

    // Update quantities in catalog
    const { error: updateToolErr } = await supabaseAdmin
      .from('tools')
      .update({
        total_stock: nextTotal,
        available_stock: nextAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', assign.tool_id as string)

    if (updateToolErr) throw updateToolErr

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
    revalidatePath('/hr/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to process tool return:", err.message)
    return { error: "Failed to process return. Please verify the quantities and try again." }
  }
}
