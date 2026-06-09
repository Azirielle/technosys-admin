"use client"

import { useState, useTransition } from "react"
import { 
  Package, Plus, Settings, RefreshCw, AlertTriangle, ArrowUpRight, 
  ArrowDownLeft, History, FileText, ClipboardList, CheckCircle2, AlertCircle,
  TrendingDown, Check, X, Clipboard, User, Upload, Image, FileSpreadsheet
} from "lucide-react"
import { createOrUpdateInventoryItem, restockItem, createInventoryAudit, bulkRegisterInventory } from "@/app/actions/inventory"
import { createClient } from "@/lib/supabase/client"

interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number
  unit: string
  low_stock_threshold: number
  image_url?: string | null
  created_at: string
}

interface StockTransaction {
  id: string
  item_id: string
  ticket_id: string | null
  technician_id: string | null
  type: string // 'in' | 'out'
  quantity: number
  notes: string | null
  created_at: string
  item: { name: string; sku: string; unit: string } | null
  technician: { full_name: string } | null
  ticket: { title: string } | null
}

interface InventoryAuditItem {
  id: string
  audit_id: string
  item_id: string
  system_quantity: number
  physical_quantity: number
  variance: number
  item: { name: string; sku: string; unit: string } | null
}

interface InventoryAudit {
  id: string
  created_at: string
  auditor_id: string
  notes: string | null
  auditor: { full_name: string } | null
  audit_items: InventoryAuditItem[]
}

interface InventoryWorkspaceProps {
  initialItems: InventoryItem[]
  initialTransactions: StockTransaction[]
  initialAudits: InventoryAudit[]
  userId: string
}

export default function InventoryWorkspace({ 
  initialItems, 
  initialTransactions,
  initialAudits,
  userId
}: InventoryWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"items" | "ledger" | "audits">("items")
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [transactions, setTransactions] = useState<StockTransaction[]>(initialTransactions)
  const [audits, setAudits] = useState<InventoryAudit[]>(initialAudits)
  
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // New item form state
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [qty, setQty] = useState("0")
  const [unit, setUnit] = useState("pcs")
  const [threshold, setThreshold] = useState("5")
  const [imageUrl, setImageUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  // Quick restock modal/state
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null)
  const [restockQty, setRestockQty] = useState("")
  const [restockNotes, setRestockNotes] = useState("")

  // Stocktake Auditing states
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditNotes, setAuditNotes] = useState("")
  const [auditItemsState, setAuditItemsState] = useState<Array<{ itemId: string; name: string; sku: string; unit: string; systemQty: number; physicalQty: number }>>([])
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

  // Bulk Register drawer states
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false)
  const [bulkCsvData, setBulkCsvData] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<{
    successCount: number
    failureCount: number
    results: any[]
  } | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `items/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('inventory')
        .upload(fileName, file, { cacheControl: '3650000', upsert: true })
        
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('inventory')
        .getPublicUrl(fileName)
        
      setImageUrl(publicUrl)
    } catch (err: any) {
      setErrorMsg("Failed to upload image: " + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setBulkLoading(true)
    setBulkResults(null)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const lines = bulkCsvData.split('\n')
      const parsedData = []
      for (const line of lines) {
        const rowText = line.trim()
        if (!rowText) continue
        const [name, sku, quantity, unit, lowStockLimit] = rowText.split(',').map(s => s.trim())
        parsedData.push({
          name,
          sku,
          quantity: quantity ? Number(quantity) : 0,
          unit: unit || "pcs",
          low_stock_threshold: lowStockLimit ? Number(lowStockLimit) : 5
        })
      }

      if (parsedData.length === 0) {
        throw new Error("No data parsed from text area. Please check your CSV format.")
      }

      const res = await bulkRegisterInventory(parsedData)
      if (res.error) {
        throw new Error(res.error)
      } else {
        setBulkResults({
          successCount: res.successCount || 0,
          failureCount: res.failureCount || 0,
          results: res.results || []
        })
        setBulkCsvData("")
        // Give a short delay to see success results before reloading
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process bulk import.")
    } finally {
      setBulkLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData(e.currentTarget)
    if (editingItem) {
      formData.append("id", editingItem.id)
    }
    formData.append("image_url", imageUrl)

    startTransition(async () => {
      const res = await createOrUpdateInventoryItem(formData)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(editingItem ? "Inventory item updated successfully." : "New inventory item registered successfully.")
        
        // Reset form
        setName("")
        setSku("")
        setQty("0")
        setUnit("pcs")
        setThreshold("5")
        setImageUrl("")
        setEditingItem(null)
        
        // Refresh page
        window.location.reload()
      }
    })
  }

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockTarget || !restockQty) return
    setErrorMsg(null)
    setSuccessMsg(null)

    const quantityNum = Number(restockQty)
    startTransition(async () => {
      const res = await restockItem(restockTarget.id, quantityNum, restockNotes)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`Restocked ${quantityNum} ${restockTarget.unit} of "${restockTarget.name}".`)
        setRestockTarget(null)
        setRestockQty("")
        setRestockNotes("")
        
        // Refresh page
        window.location.reload()
      }
    })
  }

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setName(item.name)
    setSku(item.sku)
    setQty(String(item.quantity))
    setUnit(item.unit)
    setThreshold(String(item.low_stock_threshold))
    setImageUrl(item.image_url || "")
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setName("")
    setSku("")
    setQty("0")
    setUnit("pcs")
    setThreshold("5")
    setImageUrl("")
  }

  const startNewAudit = () => {
    setAuditNotes("")
    setAuditItemsState(
      items.map(item => ({
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        systemQty: item.quantity,
        physicalQty: item.quantity
      }))
    )
    setIsAuditing(true)
  }

  const handleAuditQtyChange = (itemId: string, val: string) => {
    const parsed = parseInt(val)
    const qtyVal = isNaN(parsed) ? 0 : parsed
    setAuditItemsState(prev => 
      prev.map(entry => entry.itemId === itemId ? { ...entry, physicalQty: qtyVal } : entry)
    )
  }

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const formattedItems = auditItemsState.map(x => ({
        itemId: x.itemId,
        systemQty: x.systemQty,
        physicalQty: x.physicalQty
      }))

      const res = await createInventoryAudit(auditNotes, userId, formattedItems)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg("Manual stocktake reconciliation logged successfully and stock levels adjusted.")
        setIsAuditing(false)
        setAuditNotes("")
        setAuditItemsState([])
        window.location.reload()
      }
    })
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  return (
    <div className="p-8 pb-20 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-emerald-600 shrink-0" />
            Inventory Control
          </h1>
          <p className="text-zinc-500 mt-1">Manage physical spare parts, log restocks, and reconcile quarterly audits.</p>
        </div>

        {/* Tab Switcher */}
        {!isAuditing && (
          <div className="flex bg-zinc-200/60 p-1 rounded-xl border border-zinc-250">
            <button
              onClick={() => setActiveTab("items")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "items" 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Manage Stock
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "ledger" 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <History className="w-4 h-4" /> Transaction Ledger
            </button>
            <button
              onClick={() => setActiveTab("audits")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "audits" 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Clipboard className="w-4 h-4" /> Stocktake Audits
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-emerald-800">Success</h3>
            <p className="text-sm text-emerald-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {isAuditing ? (
        /* Dynamic Reconciliation stocktake Sheet */
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-emerald-600" />
                Physical Stocktake Reconciliation Audit
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Input physical counts to match warehouse asset records. Adjustments will log automatically.</p>
            </div>
            <button 
              onClick={() => setIsAuditing(false)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold hover:bg-zinc-50 text-zinc-600 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Discard Audit
            </button>
          </div>

          <form onSubmit={handleAuditSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Audit Notes / Scope</label>
              <input
                type="text"
                value={auditNotes}
                onChange={e => setAuditNotes(e.target.value)}
                placeholder="e.g. Q2 Physical Inventory Audit - Main Warehouse Room B"
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto border border-zinc-250 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="p-4">SKU</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4 w-32">System Qty</th>
                    <th className="p-4 w-40">Physical Count</th>
                    <th className="p-4 w-32">Variance</th>
                    <th className="p-4 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {auditItemsState.map(entry => {
                    const variance = entry.physicalQty - entry.systemQty
                    const isHighShrinkage = variance < 0 && (Math.abs(variance) / entry.systemQty) >= 0.1
                    
                    return (
                      <tr key={entry.itemId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-xs text-zinc-500">{entry.sku}</td>
                        <td className="p-4 font-bold text-zinc-800">{entry.name}</td>
                        <td className="p-4 text-zinc-600 font-semibold">{entry.systemQty} {entry.unit}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              required
                              value={entry.physicalQty}
                              onChange={e => handleAuditQtyChange(entry.itemId, e.target.value)}
                              className="w-20 px-2 py-1 border border-zinc-350 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right font-bold"
                            />
                            <span className="text-zinc-400 text-xs">{entry.unit}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`font-black text-sm ${
                            variance < 0 
                              ? "text-rose-600" 
                              : variance > 0 
                                ? "text-emerald-600" 
                                : "text-zinc-400 font-medium"
                          }`}>
                            {variance > 0 ? `+${variance}` : variance} {entry.unit}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center">
                            {isHighShrinkage ? (
                              <span className="text-[9px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Shrinkage
                              </span>
                            ) : variance === 0 ? (
                              <span className="text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                                <Check className="w-3 h-3 shrink-0" /> OK
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3 shrink-0" /> Adjust
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all flex items-center gap-2"
              >
                {isPending ? "Logging Reconciliation..." : "Submit Reconciliation & Update Stock"}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === "items" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add / Edit Form Panel */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                {editingItem ? "Edit Inventory Item" : "Register New Stock Item"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Define part specifications and stock limits.</p>
            </div>

            <form onSubmit={handleCreateOrUpdate} encType="multipart/form-data" className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Cat6 UTP Cable Roll"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Item Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  {editingItem?.image_url && (
                    <img 
                      src={editingItem.image_url} 
                      alt="Current preview" 
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0" 
                    />
                  )}
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">SKU / Code</label>
                  <input
                    type="text"
                    name="sku"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. CAB-CAT6-01"
                    required
                    disabled={!!editingItem}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Unit</label>
                  <input
                    type="text"
                    name="unit"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="e.g. pcs, meters, rolls"
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Initial Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min={0}
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    required
                    disabled={!!editingItem}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Low Stock Limit</label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    min={0}
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 font-bold uppercase tracking-wider">Item Photo</label>
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <div className="relative w-16 h-16 border border-zinc-200 rounded-lg overflow-hidden shrink-0">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setImageUrl("")}
                        className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-zinc-105 border border-dashed border-zinc-300 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                  
                  <label className="flex-1 flex flex-col items-center justify-center border border-zinc-200 border-dashed rounded-lg p-3 hover:bg-zinc-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-650 font-bold">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      {uploadingImage ? "Uploading..." : "Upload Photo"}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingItem && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-2.5 rounded-lg text-sm transition-all border border-zinc-200"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending || uploadingImage}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPending ? "Saving..." : (editingItem ? "Update Item" : "Add Item")}
                </button>
              </div>
            </form>
          </div>

          {/* Stock Registry List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Restock Section */}
            {restockTarget && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                    Restocking: {restockTarget.name} ({restockTarget.sku})
                  </h4>
                  <button 
                    onClick={() => setRestockTarget(null)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleRestockSubmit} className="flex gap-3 items-end flex-wrap">
                  <div className="w-32">
                    <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Add Qty ({restockTarget.unit})</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={restockQty}
                      onChange={e => setRestockQty(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-1.5 border border-emerald-250 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Restock Memo / Notes</label>
                    <input
                      type="text"
                      value={restockNotes}
                      onChange={e => setRestockNotes(e.target.value)}
                      placeholder="Supplier delivery invoice #..."
                      className="w-full px-3 py-1.5 border border-emerald-250 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg text-sm transition-all"
                  >
                    Submit Restock
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Registered Stock Items</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Browse quantities and low-stock alerts.</p>
                </div>
                <button 
                  onClick={() => { setIsBulkDrawerOpen(true); setBulkResults(null); }}
                  className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk CSV Import
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400">
                      <th className="p-4 w-12">Photo</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4">Item Details</th>
                      <th className="p-4">Stock Level</th>
                      <th className="p-4">Safety Limit</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {items.map(item => {
                      const isLowStock = item.quantity <= item.low_stock_threshold
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isLowStock ? "bg-amber-50/20" : ""
                          }`}
                        >
                          <td className="p-4">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name} 
                                className="w-10 h-10 rounded-lg object-cover border border-zinc-200" 
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-xs text-zinc-600">{item.sku}</td>
                          <td className="p-4 flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-zinc-200 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-zinc-800 block">{item.name}</span>
                              <span className="text-[10px] text-zinc-400 font-medium">Registered {formatDate(item.created_at)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-black text-base ${isLowStock ? "text-rose-600 font-extrabold" : "text-zinc-800"}`}>
                                {item.quantity}
                              </span>
                              <span className="text-zinc-400 text-xs">{item.unit}</span>
                              {isLowStock && (
                                <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Low
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-zinc-500">
                            min {item.low_stock_threshold} {item.unit}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                               onClick={() => { setRestockTarget(item); setRestockQty(""); setRestockNotes(""); }}
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer"
                            >
                              Restock
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === "ledger" ? (
        
        /* Transaction Ledger View */
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-zinc-150 bg-zinc-50/50">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Stock Transaction History
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Audit log of all stock adjustments, restocks, and technician checkouts.</p>
          </div>

          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                No stock transactions logged yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400">
                    <th className="p-4">Type</th>
                    <th className="p-4">Item details</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Assigned / Link</th>
                    <th className="p-4">Audit Memo / Notes</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {transactions.map(tx => {
                    const isRestock = tx.type === 'in'
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                            isRestock 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {isRestock ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                            {isRestock ? "Restock" : "checkout"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-zinc-800 block">{tx.item?.name || "Deleted Item"}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{tx.item?.sku}</span>
                        </td>
                        <td className="p-4 font-black text-zinc-800">
                          {isRestock ? "+" : "-"}{tx.quantity} {tx.item?.unit}
                        </td>
                        <td className="p-4">
                          {tx.technician ? (
                            <span className="text-zinc-700 block font-semibold text-xs flex items-center gap-1">
                              👤 {tx.technician.full_name}
                            </span>
                          ) : (
                            <span className="text-zinc-400 block text-xs italic">System / Office</span>
                          )}
                          {tx.ticket && (
                            <span className="text-[10px] text-zinc-400 block line-clamp-1">
                              🎫 Ticket: {tx.ticket.title}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-zinc-500">
                          {tx.notes || "N/A"}
                        </td>
                        <td className="p-4 text-right text-xs text-zinc-400 font-medium">
                          {formatDate(tx.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      ) : (
        /* Stocktake Auditing View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Inventory Stocktake Audits</h3>
              <p className="text-xs text-zinc-500">Log periodic physical inventories and reconcile audits.</p>
            </div>
            <button 
              onClick={startNewAudit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Start New Audit
            </button>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50">
              <h3 className="text-sm font-bold text-zinc-900">Historical Reconciliation Audits</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Logs of manual physical checks, system quantities, and verified adjustments.</p>
            </div>

            <div className="divide-y divide-zinc-150">
              {audits.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  No inventory audits logged yet.
                </div>
              ) : (
                audits.map(audit => {
                  const totalDiscrepancies = audit.audit_items.filter(i => i.variance !== 0).length
                  const isExpanded = expandedAuditId === audit.id

                  return (
                    <div key={audit.id} className="p-5 hover:bg-slate-50/20 transition-all space-y-4">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-zinc-800 text-sm">Audit Record #{audit.id.substring(0, 8)}</h4>
                          <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-zinc-400" /> Auditor: {audit.auditor?.full_name || "Admin"}</span>
                            <span>•</span>
                            <span>Date: {formatDate(audit.created_at)}</span>
                          </div>
                          {audit.notes && <p className="text-xs text-zinc-500 italic mt-1.5 bg-zinc-100/50 py-1.5 px-3 rounded-lg border border-zinc-200 w-fit">Memo: {audit.notes}</p>}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                            totalDiscrepancies > 0 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {totalDiscrepancies > 0 ? `${totalDiscrepancies} Discrepancy(s) Adjusted` : "Fully Reconciled"}
                          </span>
                          <button
                            onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                            className="text-xs text-zinc-500 hover:text-zinc-950 font-bold underline"
                          >
                            {isExpanded ? "Hide Details" : "View Reconciliation Details"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border border-zinc-200 rounded-xl overflow-hidden mt-3 animate-fade-in bg-zinc-50/30">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-zinc-100/50 border-b border-zinc-200 text-[10px] uppercase font-bold text-zinc-400">
                                <th className="p-3">SKU</th>
                                <th className="p-3">Item Details</th>
                                <th className="p-3 w-28">System Qty</th>
                                <th className="p-3 w-28">Physical Qty</th>
                                <th className="p-3 text-right w-28">Variance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-sm">
                              {audit.audit_items.map(detail => (
                                <tr key={detail.id} className="hover:bg-zinc-50/50 transition-colors">
                                  <td className="p-3 font-mono font-bold text-xs text-zinc-500">{detail.item?.sku}</td>
                                  <td className="p-3 font-bold text-zinc-800">{detail.item?.name}</td>
                                  <td className="p-3 text-zinc-500 font-semibold">{detail.system_quantity} {detail.item?.unit}</td>
                                  <td className="p-3 text-zinc-800 font-black">{detail.physical_quantity} {detail.item?.unit}</td>
                                  <td className={`p-3 text-right font-black ${
                                    detail.variance < 0 
                                      ? "text-rose-600" 
                                      : detail.variance > 0 
                                        ? "text-emerald-600" 
                                        : "text-zinc-400 font-medium"
                                  }`}>
                                    {detail.variance > 0 ? `+${detail.variance}` : detail.variance} {detail.item?.unit}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Bulk Import Drawer */}
      {isBulkDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity flex justify-end animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Bulk Import Stock Items</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Register multiple parts at once using CSV paste format.</p>
              </div>
              <button 
                onClick={() => setIsBulkDrawerOpen(false)} 
                className="p-2 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-2 text-zinc-650">
                <p className="font-bold text-zinc-800">CSV Input Specifications:</p>
                <p>Provide comma-separated values (one stock item per line) in this order:</p>
                <p className="font-mono bg-zinc-100 p-1.5 rounded border border-zinc-200">Item Name, SKU, Initial Quantity, Unit, Low Stock Limit</p>
                <p className="font-bold text-zinc-800 mt-2">Example Paste:</p>
                <pre className="font-mono bg-zinc-100 p-2 rounded border border-zinc-200 text-[10px] whitespace-pre-wrap leading-relaxed">
Cat6 UTP Cable Roll, CAB-CAT6-01, 15, rolls, 3
Fiber Patch Cord 3m, FIP-PAT-03, 100, pcs, 10
RJ45 Connectors Box, CON-RJ45-100, 20, boxes, 5</pre>
                <p className="text-[10px] text-zinc-500 italic mt-2">Note: SKU must be unique across all inventory records. Low Stock Limit is optional (defaults to 5 if empty). Unit is optional (defaults to 'pcs' if empty).</p>
              </div>

              {/* Bulk Results Summary */}
              {bulkResults && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-800">Import Job Complete</p>
                      <p className="text-2xs text-zinc-500 mt-0.5">Processed {bulkResults.results.length} rows</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        {bulkResults.successCount} Success
                      </span>
                      {bulkResults.failureCount > 0 && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                          {bulkResults.failureCount} Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-zinc-400 font-bold uppercase tracking-wider">
                          <th className="p-3">Row</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {bulkResults.results.map((res: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-mono text-zinc-400">{res.rowNum}</td>
                            <td className="p-3 font-bold text-zinc-800 truncate max-w-[150px]">{res.sku}</td>
                            <td className="p-3 text-right">
                              {res.success ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Success</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" title={res.error}>Failed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <form onSubmit={handleBulkImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Paste CSV Data</label>
                  <textarea
                    required
                    rows={8}
                    value={bulkCsvData}
                    onChange={(e) => setBulkCsvData(e.target.value)}
                    placeholder="Item Name, SKU, Quantity, Unit, Low Stock Limit&#10;e.g. Cat6 UTP Cable Roll, CAB-CAT6-01, 15, rolls, 3"
                    className="w-full p-3 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-zinc-800 leading-relaxed animate-in fade-in"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bulkLoading || !bulkCsvData.trim()}
                  className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {bulkLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Run Bulk Registration"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
