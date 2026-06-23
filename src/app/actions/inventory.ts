"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "./activity"

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

// 3. Fetch inventory ledger summary matching the client's grid format:
// Item name | QTY | IN | In Date | Balance | Out | Out Date | Balance |
export async function getInventoryLedger() {
  try {
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })

    if (itemsError) throw itemsError

    const { data: ledger, error: ledgerError } = await supabaseAdmin
      .from('inventory_ledger')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (ledgerError) throw ledgerError

    return (items || []).map(item => {
      const itemTransactions = (ledger || []).filter(tx => tx.item_id === item.id)
      const lastInTx = itemTransactions.find(tx => tx.type === 'in')
      const lastOutTx = itemTransactions.find(tx => tx.type === 'out')

      return {
        ...item,
        last_in: lastInTx ? {
          qty: lastInTx.qty_change,
          date: lastInTx.transaction_date,
          balance: lastInTx.balance
        } : null,
        last_out: lastOutTx ? {
          qty: Math.abs(lastOutTx.qty_change),
          date: lastOutTx.transaction_date,
          balance: lastOutTx.balance
        } : null
      }
    })
  } catch (err: any) {
    console.error("Failed to fetch inventory ledger:", err.message)
    return []
  }
}

// 4. Fetch all procurement orders
export async function getProcurementOrders() {
  try {
    const { data, error } = await supabaseAdmin
      .from('procurement_orders')
      .select(`
        *,
        item:inventory_items!item_id(name, sku, unit)
      `)
      .order('po_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch procurement orders:", err.message)
    return []
  }
}

// 5. Create a procurement order
export async function createProcurementOrder(formData: FormData) {
  try {
    const itemId = formData.get("item_id")?.toString()
    const poNumber = formData.get("po_number")?.toString().trim()
    const poDate = formData.get("po_date")?.toString() || new Date().toISOString().split('T')[0]
    const qty = Number(formData.get("qty"))

    if (!itemId || !poNumber || isNaN(qty) || qty <= 0) {
      return { error: "Item, PO Number, and a valid quantity greater than 0 are required." }
    }

    const { error } = await supabaseAdmin
      .from('procurement_orders')
      .insert({
        item_id: itemId,
        po_number: poNumber,
        po_date: poDate,
        qty,
        status: 'pending'
      })

    if (error) {
      if (error.code === '23505') {
        return { error: `PO # "${poNumber}" already exists.` }
      }
      throw error
    }

    await logActivity({
      category: 'inventory',
      action: 'created_po',
      description: `Created Procurement Purchase Order PO# ${poNumber} for ${qty} units`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to create procurement order:", err.message)
    return { error: "Database transaction failed: " + err.message }
  }
}

// 6. Mark a procurement order as delivered, update inventory stock, and log in the ledger
export async function deliverProcurementOrder(poId: string, deliveredDateStr?: string) {
  try {
    const deliveredDate = deliveredDateStr || new Date().toISOString().split('T')[0]

    // Fetch PO details
    const { data: po, error: poErr } = await supabaseAdmin
      .from('procurement_orders')
      .select('*, item:inventory_items!item_id(name, quantity)')
      .eq('id', poId)
      .single()

    if (poErr || !po) {
      throw new Error("Procurement order not found.")
    }

    if (po.status === 'delivered') {
      return { error: "This procurement order has already been delivered." }
    }

    // Update PO status
    const { error: poUpdateErr } = await supabaseAdmin
      .from('procurement_orders')
      .update({
        status: 'delivered',
        delivered_date: deliveredDate
      })
      .eq('id', poId)

    if (poUpdateErr) throw poUpdateErr

    // Update inventory item quantity
    const currentQty = po.item?.quantity || 0
    const nextQty = currentQty + po.qty

    const { error: itemUpdateErr } = await supabaseAdmin
      .from('inventory_items')
      .update({
        quantity: nextQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', po.item_id)

    if (itemUpdateErr) throw itemUpdateErr

    // Log in the ledger
    const { error: ledgerErr } = await supabaseAdmin
      .from('inventory_ledger')
      .insert({
        item_id: po.item_id,
        qty_change: po.qty,
        type: 'in',
        transaction_date: new Date().toISOString(),
        balance: nextQty,
        notes: `Delivered PO# ${po.po_number}`
      })

    if (ledgerErr) throw ledgerErr

    await logActivity({
      category: 'inventory',
      action: 'delivered_po',
      description: `Delivered Procurement Order PO# ${po.po_number} (${po.qty} units added to stock)`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to deliver procurement order ${poId}:`, err.message)
    return { error: "Transaction failed: " + err.message }
  }
}

// 7. General ledger transaction logger (for manual IN/OUT adjustments)
export async function logLedgerTransaction(itemId: string, qtyChange: number, type: 'in' | 'out', notes?: string) {
  try {
    if (isNaN(qtyChange) || qtyChange <= 0) {
      return { error: "Quantity must be greater than zero." }
    }

    // Fetch item
    const { data: item, error: fetchErr } = await supabaseAdmin
      .from('inventory_items')
      .select('name, quantity')
      .eq('id', itemId)
      .single()

    if (fetchErr || !item) {
      throw new Error("Inventory item not found.")
    }

    const currentQty = item.quantity
    let nextQty = currentQty
    let signedChange = qtyChange

    if (type === 'in') {
      nextQty = currentQty + qtyChange
      signedChange = qtyChange
    } else {
      if (currentQty < qtyChange) {
        return { error: `Insufficient stock. Current stock is ${currentQty}, but attempting to deduct ${qtyChange}.` }
      }
      nextQty = currentQty - qtyChange
      signedChange = -qtyChange
    }

    // Update item quantity
    const { error: updateErr } = await supabaseAdmin
      .from('inventory_items')
      .update({
        quantity: nextQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (updateErr) throw updateErr

    // Log ledger entry
    const { error: ledgerErr } = await supabaseAdmin
      .from('inventory_ledger')
      .insert({
        item_id: itemId,
        qty_change: signedChange,
        type,
        transaction_date: new Date().toISOString(),
        balance: nextQty,
        notes: notes?.trim() || `Manual ${type.toUpperCase()} transaction`
      })

    if (ledgerErr) throw ledgerErr

    await logActivity({
      category: 'inventory',
      action: type === 'in' ? 'restocked' : 'checkout',
      description: `${type === 'in' ? 'Restocked' : 'Checked out'} ${qtyChange} units of "${item.name}" (Notes: ${notes?.trim() || 'N/A'})`
    })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (err: any) {
    console.error("Failed to log ledger transaction:", err.message)
    return { error: "Transaction failed: " + err.message }
  }
}

// 8. Create or update an inventory item
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
    let finalImageUrl = image_url
    let existingItem: any = null

    if (id) {
      // Fetch existing item
      const { data } = await supabaseAdmin
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single()
      
      existingItem = data
      finalImageUrl = existingItem?.image_url || image_url

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

      // If quantity is adjusted directly via edit form, write a ledger entry
      const difference = quantity - (existingItem?.quantity || 0)
      if (difference !== 0) {
        const { error: ledgerErr } = await supabaseAdmin
          .from('inventory_ledger')
          .insert({
            item_id: id,
            qty_change: difference,
            type: difference > 0 ? 'in' : 'out',
            transaction_date: new Date().toISOString(),
            balance: quantity,
            notes: "Manual adjustment via edit form"
          })
        if (ledgerErr) throw ledgerErr
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
          image_url: finalImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      dbError = error
    } else {
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

      // Insert
      const { data: inserted, error } = await supabaseAdmin
        .from('inventory_items')
        .insert({
          name,
          sku,
          quantity,
          unit,
          low_stock_threshold,
          image_url: finalImageUrl
        })
        .select()
        .single()
      
      dbError = error

      // Log initial quantity in ledger
      if (!error && inserted && quantity > 0) {
        const { error: ledgerErr } = await supabaseAdmin
          .from('inventory_ledger')
          .insert({
            item_id: inserted.id,
            qty_change: quantity,
            type: 'in',
            transaction_date: new Date().toISOString(),
            balance: quantity,
            notes: "Initial stock registration"
          })
        if (ledgerErr) throw ledgerErr
      }
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

// 9. Log a restock transaction (deprecated in favor of logLedgerTransaction, but kept for compatibility)
export async function restockItem(itemId: string, quantity: number, notes?: string) {
  return logLedgerTransaction(itemId, quantity, 'in', notes || 'Restocked via admin panel')
}

// 10. Fetch all inventory audits (adapted to look at inventory_ledger balance changes if needed, but keeping details mostly consistent)
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

// 11. Create a new inventory audit and auto-adjust stock variances in the ledger
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

    for (const entry of auditItems) {
      const variance = entry.physicalQty - entry.systemQty

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

      if (variance !== 0) {
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

        // Adjust inventory items stock level
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
          .from('inventory_ledger')
          .insert({
            item_id: entry.itemId,
            qty_change: variance,
            type: variance > 0 ? 'in' : 'out',
            transaction_date: new Date().toISOString(),
            balance: entry.physicalQty,
            notes: `Audit Adjustment: Variance offset logged during Audit #${audit.id.substring(0, 8)}`
          })

        if (txErr) throw txErr
      }
    }

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

// 12. Bulk register inventory items
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

    const { data: existingItems } = await supabaseAdmin.from('inventory_items').select('sku')
    const existingSkus = new Set((existingItems || []).map(i => i.sku.toUpperCase().trim()))

    for (let index = 0; index < itemsRaw.length; index++) {
      const row = itemsRaw[index]
      const rowNum = index + 1

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
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('inventory_items')
          .insert({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit,
            low_stock_threshold: item.low_stock_threshold
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Log initial stock in ledger
        if (inserted && item.quantity > 0) {
          const { error: ledgerErr } = await supabaseAdmin
            .from('inventory_ledger')
            .insert({
              item_id: inserted.id,
              qty_change: item.quantity,
              type: 'in',
              transaction_date: new Date().toISOString(),
              balance: item.quantity,
              notes: "Initial stock registration via bulk import"
            })
          if (ledgerErr) throw ledgerErr
        }

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
