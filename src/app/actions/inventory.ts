"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "./activity"
import { sendPushNotification } from "@/lib/push"

async function notifyLowStockAdmins(name: string, sku: string, quantity: number, threshold: number, unit: string) {
  try {
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .in('role', ['admin', 'super_admin'])
      .not('push_token', 'is', null);

    if (admins && admins.length > 0) {
      const tokens = admins.map(a => a.push_token).filter(Boolean);
      if (tokens.length > 0) {
        const messages = tokens.map(token => ({
          to: token,
          sound: 'default',
          title: '⚠️ Low Stock Alert',
          body: `Inventory item "${name}" (SKU: ${sku}) has fallen below its safety threshold. Current stock: ${quantity} ${unit} (Limit: ${threshold} ${unit}).`,
          data: { itemId: sku }
        }));

        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messages)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Expo low-stock batch push failed:", errText);
        } else {
          console.log("Expo low-stock push batch sent successfully for item", sku);
        }
      }
    }
  } catch (err: any) {
    console.error("Failed to notify admins of low stock:", err.message || err);
  }
}

// 1. Fetch all inventory items
export async function getInventoryItems() {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch inventory items:", err.message)
    return []
  }
}

// 2. Fetch inventory items that are low in stock
export async function getLowStockItems() {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).filter(item => item.quantity <= item.low_stock_threshold)
  } catch (err: any) {
    console.error("Failed to fetch low stock items:", err.message)
    return []
  }
}

// 3. Create or update an inventory item
export async function createOrUpdateInventoryItem(formData: FormData) {
  try {
    const id = formData.get("id")?.toString()
    const name = formData.get("name")?.toString().trim()
    const sku = formData.get("sku")?.toString().trim().toUpperCase()
    const quantity = Number(formData.get("quantity"))
    const unit = formData.get("unit")?.toString().trim() || "pcs"
    const low_stock_threshold = Number(formData.get("low_stock_threshold"))
    const image_url = formData.get("image_url")?.toString() || null
    const imageFile = formData.get("image") as File | null

    if (!name || !sku) {
      return { error: "Name and SKU are required." }
    }

    if (isNaN(quantity) || isNaN(low_stock_threshold) || quantity < 0 || low_stock_threshold < 0) {
      return { error: "Quantity and low stock threshold must be non-negative numbers." }
    }

    let dbError
    let finalImageUrl = null
    let existingItem: any = null

    if (id) {
      // Fetch existing item to check for old image and quantity
      const { data } = await supabaseAdmin
        .from('inventory_items')
        .select('image_url, quantity, name, sku, low_stock_threshold, unit')
        .eq('id', id)
        .single()
      
      existingItem = data
      finalImageUrl = existingItem?.image_url || null

      if (imageFile && imageFile.size > 0) {
        // Delete old image if it exists to clean up storage
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

        // Upload new image
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

      // Update
      const { error } = await supabaseAdmin
        .from('inventory_items')
        .update({
          name,
          sku,
          quantity,
          unit,
          low_stock_threshold,
          image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      dbError = error
    } else {
      if (imageFile && imageFile.size > 0) {
        // Upload image
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

      // Insert
      const { error } = await supabaseAdmin
        .from('inventory_items')
        .insert({
          name,
          sku,
          quantity,
          unit,
          low_stock_threshold,
          image_url
        })
      dbError = error
    }

    if (dbError) throw dbError

    if (id && existingItem) {
      const wasAbove = existingItem.quantity > existingItem.low_stock_threshold;
      const isBelowNow = quantity <= low_stock_threshold;
      if (wasAbove && isBelowNow) {
        await notifyLowStockAdmins(name, sku, quantity, low_stock_threshold, unit);
      }
    }

    await logActivity({
      category: 'inventory',
      action: id ? 'updated' : 'created',
      description: `${id ? 'Updated' : 'Created'} inventory item "${name}" (SKU: ${sku}, Quantity: ${quantity})`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create/update inventory item:", err.message)
    return { error: "Database transaction failed: " + err.message }
  }
}

// 4. Log a restock transaction
export async function restockItem(itemId: string, quantity: number, notes?: string) {
  try {
    if (isNaN(quantity) || quantity <= 0) {
      return { error: "Restock quantity must be greater than zero." }
    }

    // Fetch current quantity and name
    const { data: item, error: fetchErr } = await supabaseAdmin
      .from('inventory_items')
      .select('name, quantity')
      .eq('id', itemId)
      .single()

    if (fetchErr || !item) {
      throw new Error("Inventory item not found.")
    }

    const nextQty = item.quantity + quantity

    // 1. Update quantity
    const { error: updateErr } = await supabaseAdmin
      .from('inventory_items')
      .update({ quantity: nextQty, updated_at: new Date().toISOString() })
      .eq('id', itemId)

    if (updateErr) throw updateErr

    // 2. Insert stock transaction
    const { error: txErr } = await supabaseAdmin
      .from('stock_transactions')
      .insert({
        item_id: itemId,
        type: 'in',
        quantity,
        notes: notes?.trim() || 'Restocked via admin panel'
      })

    if (txErr) throw txErr

    await logActivity({
      category: 'inventory',
      action: 'restocked',
      description: `Restocked ${quantity} units of "${item.name}" (Notes: ${notes?.trim() || 'Restocked via admin panel'})`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to restock item ${itemId}:`, err.message)
    return { error: "Transaction failed: " + err.message }
  }
}

// 5. Fetch transaction ledger (joined with inventory item and profiles)
export async function getInventoryTransactions() {
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_transactions')
      .select(`
        *,
        item:inventory_items!item_id(name, sku, unit),
        technician:profiles!technician_id(full_name),
        ticket:tickets!ticket_id(title)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch inventory transactions:", err.message)
    return []
  }
}

// 6. Fetch all inventory audits
export async function getInventoryAudits() {
  try {
    const { data, error } = await supabaseAdmin
      .from('inventory_audits')
      .select(`
        *,
        auditor:profiles!auditor_id(full_name),
        audit_items:inventory_audit_items(
          *,
          item:inventory_items!item_id(name, sku, unit)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch inventory audits:", err.message)
    return []
  }
}

// 7. Create a new inventory audit and auto-adjust stock variances
export async function createInventoryAudit(
  notes: string, 
  auditorId: string, 
  auditItems: Array<{ itemId: string; systemQty: number; physicalQty: number }>
) {
  try {
    if (!auditorId) {
      return { error: "Auditor session ID is required." }
    }

    if (!auditItems || auditItems.length === 0) {
      return { error: "At least one item must be audited." }
    }

    // 1. Insert into inventory_audits
    const { data: audit, error: auditErr } = await supabaseAdmin
      .from('inventory_audits')
      .insert({
        auditor_id: auditorId,
        notes: notes?.trim() || 'Manual stocktake reconciliation'
      })
      .select()
      .single()

    if (auditErr || !audit) {
      throw auditErr || new Error("Failed to initialize audit record header.")
    }

    // 2. Process details
    for (const entry of auditItems) {
      const variance = entry.physicalQty - entry.systemQty

      // A. Insert detail log
      const { error: detailErr } = await supabaseAdmin
        .from('inventory_audit_items')
        .insert({
          audit_id: audit.id,
          item_id: entry.itemId,
          system_quantity: entry.systemQty,
          physical_quantity: entry.physicalQty,
          variance
        })

      if (detailErr) throw detailErr

      // B. If a variance was logged, post adjusting stock transaction
      if (variance !== 0) {
        // Fetch item details for transition checking
        const { data: item } = await supabaseAdmin
          .from('inventory_items')
          .select('name, sku, low_stock_threshold, unit')
          .eq('id', entry.itemId)
          .single();

        if (item) {
          const wasAbove = entry.systemQty > item.low_stock_threshold;
          const isBelowNow = entry.physicalQty <= item.low_stock_threshold;
          if (wasAbove && isBelowNow) {
            await notifyLowStockAdmins(item.name, item.sku, entry.physicalQty, item.low_stock_threshold, item.unit);
          }
        }

        // Adjust the inventory stock level directly
        const { error: adjustErr } = await supabaseAdmin
          .from('inventory_items')
          .update({
            quantity: entry.physicalQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.itemId)

        if (adjustErr) throw adjustErr

        // Post stock ledger transaction
        const { error: txErr } = await supabaseAdmin
          .from('stock_transactions')
          .insert({
            item_id: entry.itemId,
            type: variance > 0 ? 'in' : 'out',
            quantity: Math.abs(variance),
            notes: `Audit Adjustment: Variance offset logged during Audit #${audit.id.substring(0, 8)}`
          })

        if (txErr) throw txErr
      }
    }

    // Fetch auditor full name
    const { data: auditor } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', auditorId)
      .single()
    const auditorName = auditor?.full_name || 'Admin'

    await logActivity({
      category: 'inventory',
      action: 'audited',
      description: `Completed physical stocktake reconciliation audit by ${auditorName} (${auditItems.length} items audited)`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true, auditId: audit.id }
  } catch (err: any) {
    console.error("Reconciliation audit transaction failed:", err.message)
    return { error: "Transaction aborted: " + err.message }
  }
}

const inventoryImportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required").transform(val => val.toUpperCase().trim()),
  quantity: z.preprocess((val) => Number(val), z.number().min(0, "Quantity must be at least 0")),
  unit: z.string().optional().default("pcs"),
  low_stock_threshold: z.preprocess((val) => val === undefined || val === "" || isNaN(Number(val)) ? 5 : Number(val), z.number().min(0, "Low stock threshold must be at least 0"))
})

export async function bulkRegisterInventory(itemsRaw: any[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['super_admin', 'admin', 'ceo', 'coo', 'hr', 'coordinator', 'accountant', 'branch_manager', 'supervisor'].includes(profile.role)) {
      return { error: "Security Restriction: You do not have permission to register inventory items." }
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Fetch existing inventory items to check for duplicate SKUs
    const { data: existingItems } = await supabaseAdmin.from('inventory_items').select('sku')
    const existingSkus = new Set((existingItems || []).map(i => i.sku.toUpperCase().trim()))

    for (let index = 0; index < itemsRaw.length; index++) {
      const row = itemsRaw[index]
      const rowNum = index + 1

      // Zod validation
      const parseResult = inventoryImportSchema.safeParse(row)
      if (!parseResult.success) {
        const errors = parseResult.error.issues.map((e: any) => e.message).join(', ')
        results.push({ rowNum, sku: row.sku || 'Unknown', success: false, error: `Validation error: ${errors}` })
        failureCount++
        continue
      }

      const item = parseResult.data

      if (existingSkus.has(item.sku)) {
        results.push({ rowNum, sku: item.sku, success: false, error: `Duplicate SKU: "${item.sku}" already exists in inventory.` })
        failureCount++
        continue
      }

      try {
        const { error: insertError } = await supabaseAdmin.from('inventory_items').insert({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          low_stock_threshold: item.low_stock_threshold
        })

        if (insertError) throw insertError

        // Add to existingSkus to prevent duplicates within the same batch upload
        existingSkus.add(item.sku)

        results.push({ rowNum, sku: item.sku, success: true })
        successCount++
      } catch (err: any) {
        results.push({ rowNum, sku: item.sku, success: false, error: err.message || "Failed to insert item." })
        failureCount++
      }
    }

    revalidatePath('/dashboard/inventory')
    return { success: true, successCount, failureCount, results }
  } catch (err: any) {
    console.error("Bulk inventory registration failed:", err.message)
    return { error: "Bulk registration failed: " + err.message }
  }
}

