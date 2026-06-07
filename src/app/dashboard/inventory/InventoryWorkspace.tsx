"use client"

import { useState, useTransition } from "react"
import { 
  Package, Plus, Settings, RefreshCw, AlertTriangle, ArrowUpRight, 
  ArrowDownLeft, History, FileText, ClipboardList, CheckCircle2, AlertCircle,
  TrendingDown, Check, X, Clipboard, User
} from "lucide-react"
import { createOrUpdateInventoryItem, restockItem, createInventoryAudit, bulkImportInventoryItems } from "@/app/actions/inventory"

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

  // Bulk Import States
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Array<{ name: string; sku: string; quantity: number; unit: string; low_stock_threshold: number; error?: string }>>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setErrorMsg(null)
    setSuccessMsg(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        let parsed: Array<{ name: string; sku: string; quantity: number; unit?: string; low_stock_threshold?: number }> = []

        if (file.name.endsWith('.json')) {
          const raw = JSON.parse(text)
          if (!Array.isArray(raw)) {
            throw new Error("JSON import must be an array of items.")
          }
          parsed = raw
        } else {
          // CSV parser
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length <= 1) {
            throw new Error("CSV file is empty or only contains headers.")
          }

          for (let i = 1; i < lines.length; i++) {
            // Regex to parse comma-separated values, respecting quotes
            const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
            if (!matches) continue
            
            const values = matches.map(v => v.replace(/^"|"$/g, '').trim())
            
            const item: any = {
              name: values[0] || "",
              sku: values[1] || "",
              quantity: Number(values[2]),
              unit: values[3] || "pcs",
              low_stock_threshold: values[4] ? Number(values[4]) : 5
            }
            parsed.push(item)
          }
        }

        if (parsed.length > 200) {
          throw new Error("Bulk import exceeds maximum limit of 200 rows.")
        }

        // Validate and build preview
        const previewList = parsed.map(item => {
          const name = item.name?.trim() || ""
          const sku = item.sku?.trim().toUpperCase() || ""
          const quantity = Number(item.quantity)
          const unit = item.unit?.trim() || "pcs"
          const low_stock_threshold = Number(item.low_stock_threshold ?? 5)

          let error = undefined
          if (!name) {
            error = "Missing Name"
          } else if (!sku) {
            error = "Missing SKU"
          } else if (isNaN(quantity) || quantity < 0) {
            error = "Invalid Qty"
          } else if (isNaN(low_stock_threshold) || low_stock_threshold < 0) {
            error = "Invalid Limit"
          }

          return {
            name,
            sku,
            quantity: isNaN(quantity) ? 0 : quantity,
            unit,
            low_stock_threshold: isNaN(low_stock_threshold) ? 5 : low_stock_threshold,
            error
          }
        })

        setImportPreview(previewList)
      } catch (err: any) {
        setErrorMsg("File parse error: " + err.message)
        setImportPreview([])
      }
    }

    reader.readAsText(file)
  }

  const handleImportSubmit = async () => {
    if (importPreview.length === 0 || importPreview.some(x => x.error)) return
    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const payload = importPreview.map(x => ({
        name: x.name,
        sku: x.sku,
        quantity: x.quantity,
        unit: x.unit,
        low_stock_threshold: x.low_stock_threshold
      }))

      const res = await bulkImportInventoryItems(payload)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`Successfully imported ${res.count} items.`)
        setIsImporting(false)
        setImportFile(null)
        setImportPreview([])
        window.location.reload()
      }
    })
  }

  const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData(e.currentTarget)
    if (editingItem) {
      formData.append("id", editingItem.id)
    }

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
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setName("")
    setSku("")
    setQty("0")
    setUnit("pcs")
    setThreshold("5")
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
                  disabled={isPending}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1.5"
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
                  onClick={() => {
                    setIsImporting(true)
                    setImportFile(null)
                    setImportPreview([])
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Bulk Import CSV
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
                          <td className="p-4">
                            <span className="font-bold text-zinc-800 block">{item.name}</span>
                            <span className="text-[10px] text-zinc-400">Registered {formatDate(item.created_at)}</span>
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
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded text-xs font-bold transition-all"
                            >
                              Restock
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded text-xs font-bold transition-all"
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

      {/* Bulk Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                  Bulk Import Stock Registry
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Upload a CSV or JSON file to register or update stock items in bulk.</p>
              </div>
              <button 
                onClick={() => setIsImporting(false)}
                className="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-zinc-700">
              {/* Template instructions */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 space-y-2">
                <span className="font-bold text-zinc-700 block">Expected CSV Format (Max 200 rows):</span>
                <p className="font-mono bg-white p-2 rounded border border-zinc-250 block overflow-x-auto text-[11px] text-zinc-800">
                  Name, SKU, Quantity, Unit, Low Stock Limit<br />
                  Cat6 UTP Cable Roll, CAB-CAT6-01, 15, rolls, 3<br />
                  RJ45 Connectors Pack, CON-RJ45-100, 50, pcs, 10
                </p>
                <div className="flex gap-4 pt-1 text-zinc-500">
                  <span>• SKU is used as the unique identifier.</span>
                  <span>• Existing SKUs will update quantity and specifications.</span>
                </div>
              </div>

              {/* File input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">Select Import File</label>
                <input 
                  type="file" 
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border file:border-zinc-300 file:text-xs file:font-bold file:bg-white file:text-zinc-700 hover:file:bg-zinc-50 cursor-pointer"
                />
              </div>

              {/* Preview and Errors */}
              {importPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-700 uppercase tracking-wider">Preview Delta ({importPreview.length} Items Staged)</span>
                    <span className="text-zinc-500 font-semibold">
                      {importPreview.filter(x => x.error).length > 0 
                        ? `${importPreview.filter(x => x.error).length} error(s) found` 
                        : "Ready to import"}
                    </span>
                  </div>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400">
                          <th className="p-3">SKU</th>
                          <th className="p-3">Name</th>
                          <th className="p-3 w-20">Qty</th>
                          <th className="p-3 w-16">Unit</th>
                          <th className="p-3 w-16">Limit</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {importPreview.map((item, idx) => {
                          const existingItem = items.find(x => x.sku === item.sku)
                          return (
                            <tr key={idx} className={`hover:bg-zinc-50/50 ${item.error ? "bg-rose-50/20" : ""}`}>
                              <td className="p-3 font-mono font-bold text-zinc-600">{item.sku || "N/A"}</td>
                              <td className="p-3 font-bold text-zinc-800 line-clamp-1">{item.name || "N/A"}</td>
                              <td className="p-3 font-bold text-zinc-700">{item.quantity}</td>
                              <td className="p-3 text-zinc-500">{item.unit}</td>
                              <td className="p-3 text-zinc-500">{item.low_stock_threshold}</td>
                              <td className="p-3 text-right">
                                {item.error ? (
                                  <span className="text-[10px] text-rose-600 font-bold uppercase">{item.error}</span>
                                ) : existingItem ? (
                                  <span className="text-[10px] text-amber-600 font-bold uppercase flex items-center justify-end gap-0.5">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Sync (~)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 font-bold uppercase flex items-center justify-end gap-0.5">
                                    <Check className="w-3 h-3" /> New (+)
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
              <span className="text-xs text-zinc-500">
                {importPreview.length > 0 && (
                  <>
                    Staging: {importPreview.filter(x => !x.error && items.some(e => e.sku === x.sku)).length} syncs,{' '}
                    {importPreview.filter(x => !x.error && !items.some(e => e.sku === x.sku)).length} additions.
                  </>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsImporting(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold hover:bg-zinc-100 text-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={importPreview.length === 0 || importPreview.some(x => x.error) || isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isPending ? "Importing..." : "Confirm Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
