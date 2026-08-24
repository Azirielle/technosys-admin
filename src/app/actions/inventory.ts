"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logActivity } from "./activity"

// 1. Fetch all inventory items (Tools Catalog)
export async function getInventoryItems() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tool_catalog')
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
    const id = formData.get("id")?.toString()
    const name = formData.get("name")?.toString().trim()
    const description = formData.get("description")?.toString().trim() || ""
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
        .from('tool_catalog')
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
                .from('inventory-photos')
                .remove([oldPath])
            }
          } catch (e) {
            console.error("Failed to delete old image:", e)
          }
        }

        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('inventory-photos')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true
          })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('inventory-photos')
          .getPublicUrl(fileName)
        
        finalImageUrl = publicUrl
      }

      // Update item parameters
      const { error } = await supabaseAdmin
        .from('tool_catalog')
        .update({
          name,
          description,
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
          .from('inventory-photos')
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: true
          })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('inventory-photos')
          .getPublicUrl(fileName)
        
        finalImageUrl = publicUrl
      }

      // Insert new tool
      const { error } = await supabaseAdmin
        .from('tool_catalog')
        .insert({
          name,
          description,
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
      description: `${id ? 'Updated' : 'Created'} inventory tool "${name}" (Total: ${total_stock}, Available: ${available_stock})`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create/update inventory item:", err.message)
    return { error: "Database transaction failed: " + err.message }
  }
}

// 3. Delete a tool item
export async function deleteInventoryItem(id: string) {
  try {
    // Check if there are active borrows for this tool
    const { count, error: countErr } = await supabaseAdmin
      .from('tool_handovers')
      .select('*', { count: 'exact', head: true })
      .eq('tool_id', id)
      .eq('status', 'checked_out')

    if (countErr) throw countErr
    if (count && count > 0) {
      return { error: "Cannot delete this tool. Technicians currently have active checkouts of this tool." }
    }

    const { error } = await supabaseAdmin
      .from('tool_catalog')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logActivity({
      category: 'inventory',
      action: 'deleted',
      description: `Deleted tool item ID: ${id}`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to delete inventory item:", err.message)
    return { error: "Delete transaction failed: " + err.message }
  }
}

// 4. Fetch list of active technicians and helpers
export async function getTechnicians() {
  try {
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
    let query = supabaseAdmin
      .from('tool_handovers')
      .select(`
        *,
        tool:tool_catalog!tool_id(name, image_url),
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
export async function assignTool(technicianId: string, toolId: string, quantity: number, notes?: string) {
  try {
    if (isNaN(quantity) || quantity <= 0) {
      return { error: "Quantity must be greater than 0." }
    }

    // Fetch tool to verify available stock level
    const { data: tool, error: toolErr } = await supabaseAdmin
      .from('tool_catalog')
      .select('name, available_stock')
      .eq('id', toolId)
      .single()

    if (toolErr || !tool) {
      return { error: "Tool not found in inventory catalog." }
    }

    if (tool.available_stock < quantity) {
      return { error: `Insufficient stock. Only ${tool.available_stock} available in warehouse.` }
    }

    // Insert borrow checkout assignment
    const { error: insertErr } = await supabaseAdmin
      .from('tool_handovers')
      .insert({
        technician_id: technicianId,
        tool_id: toolId,
        quantity,
        status: 'checked_out',
        notes: notes?.trim() || null
      })

    if (insertErr) throw insertErr

    // Decrement available quantity in catalog
    const { error: updateErr } = await supabaseAdmin
      .from('tool_catalog')
      .update({
        available_stock: tool.available_stock - quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', toolId)

    if (updateErr) throw updateErr

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

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to assign tool:", err.message)
    return { error: "Borrow transaction failed: " + err.message }
  }
}

// 7. Process return / damage / loss of a tool
export async function returnTool(assignmentId: string, status: 'returned' | 'lost' | 'damaged', notes?: string) {
  try {
    // Fetch active assignment record
    const { data: assign, error: assignErr } = await supabaseAdmin
      .from('tool_handovers')
      .select('*, tool:tool_catalog!tool_id(name, total_stock, available_stock)')
      .eq('id', assignmentId)
      .single()

    if (assignErr || !assign) {
      return { error: "Handover assignment record not found." }
    }

    if (assign.status !== 'checked_out') {
      return { error: "This tool assignment has already been processed/returned." }
    }

    // Update assignment status
    const { error: updateAssignErr } = await supabaseAdmin
      .from('tool_handovers')
      .update({
        returned_at: new Date().toISOString(),
        status,
        notes: notes?.trim() || null
      })
      .eq('id', assignmentId)

    if (updateAssignErr) throw updateAssignErr

    const tool = assign.tool
    let nextAvailable = tool.available_stock
    let nextTotal = tool.total_stock

    if (status === 'returned') {
      // Put back in warehouse stock
      nextAvailable = tool.available_stock + assign.quantity
    } else {
      // Lost or damaged beyond repair:
      // It does not return to available stock, and it decreases total inventory assets
      nextTotal = Math.max(0, tool.total_stock - assign.quantity)
    }

    // Update quantities in catalog
    const { error: updateToolErr } = await supabaseAdmin
      .from('tool_catalog')
      .update({
        total_stock: nextTotal,
        available_stock: nextAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', assign.tool_id)

    if (updateToolErr) throw updateToolErr

    // Fetch technician name
    const { data: tech } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', assign.technician_id)
      .single()
    const techName = tech?.full_name || 'Technician'

    await logActivity({
      category: 'inventory',
      action: status === 'returned' ? 'restocked' : status,
      description: `Processed return for ${assign.quantity}x "${tool.name}" from ${techName} with status: ${status.toUpperCase()} (Notes: ${notes || 'None'})`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to process tool return:", err.message)
    return { error: "Return transaction failed: " + err.message }
  }
}
