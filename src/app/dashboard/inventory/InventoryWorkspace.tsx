"use client"
import { useState, useTransition, useEffect } from "react"
import { 
  Package, Plus, Settings, RefreshCw, AlertTriangle, ArrowUpRight, 
  ArrowDownLeft, History, FileText, ClipboardList, CheckCircle2, AlertCircle,
  TrendingDown, Check, X, Clipboard, User, Upload, Image, FileSpreadsheet,
  Truck, ShoppingCart, Calendar, Search
} from "lucide-react"
import { 
  createOrUpdateInventoryItem, 
  createInventoryAudit, 
  bulkRegisterInventory,
  createProcurementOrder,
  deliverProcurementOrder,
  logLedgerTransaction
} from "@/app/actions/inventory"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Pagination from "@/components/ui/Pagination"

interface LedgerSummary {
  qty: number
  date: string
  balance: number
}

interface InventoryItemWithLedger {
  id: string
  name: string
  sku: string
  quantity: number
  unit: string
  low_stock_threshold: number
  image_url?: string | null
  created_at: string
  last_in: LedgerSummary | null
  last_out: LedgerSummary | null
}

interface ProcurementOrder {
  id: string
  item_id: string
  po_number: string
  po_date: string
  qty: number
  status: 'pending' | 'delivered'
  delivered_date: string | null
  created_at: string
  item: { name: string; sku: string; unit: string } | null
}

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
  initialLedger: InventoryItemWithLedger[]
  initialProcurement: ProcurementOrder[]
  initialItems: InventoryItem[]
  initialAudits: InventoryAudit[]
  userId: string
  initialTab?: "ledger" | "procurement" | "audits"
}

export default function InventoryWorkspace({ 
  initialLedger, 
  initialProcurement,
  initialItems,
  initialAudits,
  userId,
  initialTab = "ledger"
}: InventoryWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"ledger" | "procurement" | "audits">(initialTab)

  const handleTabChange = (tab: "ledger" | "procurement" | "audits") => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      params.set("tab", tab)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, "", newUrl)
    }
  }
  const router = useRouter()
  const [ledger, setLedger] = useState<InventoryItemWithLedger[]>(initialLedger)
  const [procurement, setProcurement] = useState<ProcurementOrder[]>(initialProcurement)
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [audits, setAudits] = useState<InventoryAudit[]>(initialAudits)

  useEffect(() => {
    setLedger(initialLedger)
  }, [initialLedger])

  useEffect(() => {
    setProcurement(initialProcurement)
  }, [initialProcurement])

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  useEffect(() => {
    setAudits(initialAudits)
  }, [initialAudits])
  
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Search and Filter states
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "low_stock">("all")
  const [auditSearch, setAuditSearch] = useState("")

  // Pagination states
  const [ledgerPage, setLedgerPage] = useState(1)
  const ledgerPerPage = 5
  const [procurementPage, setProcurementPage] = useState(1)
  const procurementPerPage = 5
  const [auditsPage, setAuditsPage] = useState(1)
  const auditsPerPage = 5

  // Reset pagination on tab changes
  useEffect(() => {
    setLedgerPage(1)
    setProcurementPage(1)
    setAuditsPage(1)
  }, [activeTab])

  // Reset ledger pagination on search/filter changes
  useEffect(() => {
    setLedgerPage(1)
  }, [ledgerFilter, ledgerSearch])

  // Filtered Ledger items
  const filteredLedger = ledger.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(ledgerSearch.toLowerCase())
    const matchesFilter = ledgerFilter === "all" ? true : item.quantity <= item.low_stock_threshold
    return matchesSearch && matchesFilter
  })

  const totalLedgerItems = filteredLedger.length
  const totalLedgerPages = Math.ceil(totalLedgerItems / ledgerPerPage)
  const paginatedLedger = filteredLedger.slice(
    (ledgerPage - 1) * ledgerPerPage,
    ledgerPage * ledgerPerPage
  )

  const totalProcurementItems = procurement.length
  const totalProcurementPages = Math.ceil(totalProcurementItems / procurementPerPage)
  const paginatedProcurement = procurement.slice(
    (procurementPage - 1) * procurementPerPage,
    procurementPage * procurementPerPage
  )

  const totalAuditsItems = audits.length
  const totalAuditsPages = Math.ceil(totalAuditsItems / auditsPerPage)
  const paginatedAudits = audits.slice(
    (auditsPage - 1) * auditsPerPage,
    auditsPage * auditsPerPage
  )

  // Modals / forms state
  const [isNewItemOpen, setIsNewItemOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isPoOpen, setIsPoOpen] = useState(false)
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false)

  // Listen for Escape key to close bulk import inventory modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBulkDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when bulk import modal is open
  useEffect(() => {
    if (isBulkDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isBulkDrawerOpen])
  
  // Register/Edit item states
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [qty, setQty] = useState("0")
  const [unit, setUnit] = useState("pcs")
  const [threshold, setThreshold] = useState("5")
  const [imageUrl, setImageUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [skuSuffix, setSkuSuffix] = useState("")
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false)

  // Adjustment form states
  const [adjItemId, setAdjItemId] = useState("")
  const [adjQty, setAdjQty] = useState("")
  const [adjType, setAdjType] = useState<"in" | "out">("in")
  const [adjNotes, setAdjNotes] = useState("")

  // PO form states
  const [poItemId, setPoItemId] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0])
  const [poQty, setPoQty] = useState("")

  // Stocktake Auditing states
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditNotes, setAuditNotes] = useState("")
  const [auditItemsState, setAuditItemsState] = useState<Array<{ itemId: string; name: string; sku: string; unit: string; systemQty: number; physicalQty: number }>>([])
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

  // Bulk Register states
  const [bulkCsvData, setBulkCsvData] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState<{
    successCount: number
    failureCount: number
    results: any[]
  } | null>(null)

  const generateRandomSkuSuffix = () => {
    const part1 = Math.floor(100 + Math.random() * 900)
    const part2 = Math.floor(100 + Math.random() * 900)
    return `${part1}-${part2}`
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (!editingItem && !isSkuManuallyEdited) {
      const cleanName = val.replace(/[^a-zA-Z0-9\s]/g, "").trim().toUpperCase();
      const words = cleanName.split(/\s+/).filter(Boolean);
      let prefix = "";
      if (words.length >= 2) {
        prefix = words.slice(0, 3).map(w => w[0]).join("");
      } else if (words.length === 1) {
        prefix = words[0].substring(0, 3);
      }
      if (!prefix) {
        prefix = "SKU";
      }
      prefix = (prefix.padEnd(3, 'X')).substring(0, 3);
      
      const suffix = skuSuffix || generateRandomSkuSuffix();
      if (!skuSuffix) {
        setSkuSuffix(suffix);
      }
      setSku(`${prefix}-${suffix}`);
    }
  }

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
        setIsNewItemOpen(false)
        
        // Refresh page
        router.refresh()
      }
    })
  }

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjItemId || !adjQty) return
    setErrorMsg(null)
    setSuccessMsg(null)

    const quantityNum = Number(adjQty)
    startTransition(async () => {
      const res = await logLedgerTransaction(adjItemId, quantityNum, adjType, adjNotes)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`Logged ${adjType.toUpperCase()} adjustment of ${quantityNum} units successfully.`)
        setAdjItemId("")
        setAdjQty("")
        setAdjNotes("")
        setIsAdjustmentOpen(false)
        
        // Refresh page
        router.refresh()
      }
    })
  }

  const handlePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poItemId || !poNumber || !poQty) return
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData()
    formData.append("item_id", poItemId)
    formData.append("po_number", poNumber)
    formData.append("po_date", poDate)
    formData.append("qty", poQty)

    startTransition(async () => {
      const res = await createProcurementOrder(formData)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`Procurement Purchase Order PO# ${poNumber} created successfully.`)
        setPoItemId("")
        setPoNumber("")
        setPoQty("")
        setIsPoOpen(false)
        
        // Refresh page
        router.refresh()
      }
    })
  }

  const handleDeliverPo = async (poId: string) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    // Optimistically update status to 'delivered' locally
    setProcurement(prev => prev.map(po => po.id === poId ? { ...po, status: 'delivered', delivered_date: new Date().toISOString() } : po))

    startTransition(async () => {
      const res = await deliverProcurementOrder(poId)
      if (res.error) {
        // Revert local status
        setProcurement(prev => prev.map(po => po.id === poId ? { ...po, status: 'pending', delivered_date: null } : po))
        setErrorMsg(res.error)
      } else {
        setSuccessMsg("Procurement order marked as DELIVERED. Inventory stock levels updated.")
        router.refresh()
      }
    })
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
        setTimeout(() => {
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process bulk import.")
    } finally {
      setBulkLoading(false)
    }
  }

  const startEdit = (item: InventoryItemWithLedger) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      image_url: item.image_url,
      created_at: item.created_at
    })
    setName(item.name)
    setSku(item.sku)
    setQty(String(item.quantity))
    setUnit(item.unit)
    setThreshold(String(item.low_stock_threshold))
    setImageUrl(item.image_url || "")
    setIsNewItemOpen(true)
    setIsSkuManuallyEdited(true)
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setName("")
    setSku("")
    setQty("0")
    setUnit("pcs")
    setThreshold("5")
    setImageUrl("")
    const newSuffix = generateRandomSkuSuffix()
    setSkuSuffix(newSuffix)
    setIsSkuManuallyEdited(false)
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
        router.refresh()
      }
    })
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-"
    const d = new Date(isoString)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  const lowStockCount = ledger.filter(item => item.quantity <= item.low_stock_threshold).length
  const pendingDeliveriesCount = procurement.filter(po => po.status === 'pending').length
  const lastAudit = audits.length > 0 ? audits[0] : null

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-emerald-600 shrink-0" />
            Inventory Control
          </h1>
          <p className="text-zinc-500 mt-1">Manage physical spare parts, log transactions ledger, and track procurement.</p>
        </div>

        {/* Tab Switcher */}
        {!isAuditing && (
          <div className="flex bg-zinc-200/60 p-1 rounded-xl border border-zinc-250">
            <button
              onClick={() => handleTabChange("ledger")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "ledger" 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Inventory Ledger
            </button>
            <button
              onClick={() => handleTabChange("procurement")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "procurement" 
                  ? "bg-white text-zinc-950 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> Procurement Tracker
            </button>
            <button
              onClick={() => handleTabChange("audits")}
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

      {/* KPI Summary Grid */}
      {!isAuditing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Catalog Items (Interactive) */}
          <button
            onClick={() => {
              setActiveTab("ledger");
              setLedgerFilter("all");
            }}
            className={`group text-left w-full rounded-[2rem] p-1.5 border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer focus:outline-none ${
              activeTab === "ledger" && ledgerFilter !== "low_stock"
                ? "bg-zinc-200 border-zinc-300 shadow-md ring-2 ring-zinc-500/10"
                : "bg-zinc-100/80 border-zinc-200 shadow-xs hover:shadow-md"
            }`}
          >
            <div className={`rounded-[calc(2rem-0.375rem)] p-6 flex flex-col justify-between h-32 w-full transition-all duration-500 ${
              activeTab === "ledger" && ledgerFilter !== "low_stock" ? "bg-zinc-50/50" : "bg-white"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total SKUs</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "ledger" && ledgerFilter !== "low_stock" ? "bg-zinc-200 text-zinc-800" : "bg-zinc-50 text-zinc-650"
                }`}>
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-zinc-900">{ledger.length}</span>
                  <span className="text-[10px] text-zinc-400 font-medium ml-2">Registered Items</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {activeTab === "ledger" && ledgerFilter !== "low_stock" ? "Active" : "View Catalog"}
                </span>
              </div>
            </div>
          </button>

          {/* Card 2: Low Stock Alerts (Interactive) */}
          <button
            onClick={() => {
              setActiveTab("ledger");
              setLedgerFilter(prev => prev === "low_stock" ? "all" : "low_stock");
            }}
            className={`group text-left w-full rounded-[2rem] p-1.5 border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer focus:outline-none ${
              activeTab === "ledger" && ledgerFilter === "low_stock"
                ? "bg-amber-100 border-amber-300 shadow-md ring-2 ring-amber-500/20"
                : "bg-zinc-100/80 border-zinc-200 shadow-xs hover:shadow-md"
            }`}
          >
            <div className={`rounded-[calc(2rem-0.375rem)] p-6 flex flex-col justify-between h-32 w-full transition-all duration-500 ${
              activeTab === "ledger" && ledgerFilter === "low_stock" ? "bg-amber-50/50" : "bg-white"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Low Stock Alerts</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "ledger" && ledgerFilter === "low_stock" ? "bg-amber-200 text-amber-700" : "bg-amber-50 text-amber-500"
                }`}>
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-amber-700">{lowStockCount}</span>
                  <span className="text-[10px] text-amber-500 font-medium ml-2">SKUs Below Limit</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  {activeTab === "ledger" && ledgerFilter === "low_stock" ? "Filter Active" : "Click to Filter"}
                </span>
              </div>
            </div>
          </button>

          {/* Card 3: Pending Deliveries (Interactive) */}
          <button
            onClick={() => setActiveTab("procurement")}
            className={`group text-left w-full rounded-[2rem] p-1.5 border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer focus:outline-none ${
              activeTab === "procurement"
                ? "bg-indigo-100 border-indigo-300 shadow-md ring-2 ring-indigo-500/20"
                : "bg-zinc-100/80 border-zinc-200 shadow-xs hover:shadow-md"
            }`}
          >
            <div className={`rounded-[calc(2rem-0.375rem)] p-6 flex flex-col justify-between h-32 w-full transition-all duration-500 ${
              activeTab === "procurement" ? "bg-indigo-50/50" : "bg-white"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-indigo-650 uppercase tracking-wider">Pending Orders</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "procurement" ? "bg-indigo-200 text-indigo-700" : "bg-indigo-50 text-indigo-500"
                }`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-indigo-700">{pendingDeliveriesCount}</span>
                  <span className="text-[10px] text-indigo-500 font-medium ml-2">Active Procurements</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                  {activeTab === "procurement" ? "Active" : "View Orders"}
                </span>
              </div>
            </div>
          </button>

          {/* Card 4: Last Stocktake (Interactive) */}
          <button
            onClick={() => setActiveTab("audits")}
            className={`group text-left w-full rounded-[2rem] p-1.5 border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer focus:outline-none ${
              activeTab === "audits"
                ? "bg-emerald-50/80 border-emerald-200 shadow-md ring-2 ring-emerald-500/10"
                : "bg-zinc-100/80 border-zinc-200 shadow-xs hover:shadow-md"
            }`}
          >
            <div className={`rounded-[calc(2rem-0.375rem)] p-6 flex flex-col justify-between h-32 w-full transition-all duration-500 ${
              activeTab === "audits" ? "bg-emerald-50/30" : "bg-white"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Last Stocktake</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "audits" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-50 text-zinc-500"
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-end justify-between w-full">
                <div className="truncate flex-1">
                  <span className="text-sm font-bold text-zinc-800 block truncate">
                    {lastAudit ? lastAudit.auditor?.full_name || "Admin" : "Never"}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">
                    {lastAudit ? formatDateTime(lastAudit.created_at) : "No audits logged yet"}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                  {activeTab === "audits" ? "Active" : "View Audits"}
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-rose-800">Error</h3>
            <p className="text-sm text-rose-700 mt-1">{errorMsg}</p>
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

            {/* Search filter for auditing checklist */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter audit items by name or SKU..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-zinc-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-zinc-400 font-medium"
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
                  {auditItemsState
                    .filter(entry => 
                      entry.name.toLowerCase().includes(auditSearch.toLowerCase()) ||
                      entry.sku.toLowerCase().includes(auditSearch.toLowerCase())
                    )
                    .map(entry => {
                      const variance = entry.physicalQty - entry.systemQty
                      const isHighShrinkage = variance < 0 && (Math.abs(variance) / entry.systemQty) >= 0.1
                      
                      return (
                        <tr key={entry.itemId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-xs text-zinc-500">{entry.sku}</td>
                          <td className="p-4 font-bold text-zinc-800">{entry.name}</td>
                          <td className="p-4 text-zinc-650 font-semibold">{entry.systemQty} {entry.unit}</td>
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
                            {variance > 0 ? (
                              <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                +{variance} {entry.unit}
                              </span>
                            ) : variance < 0 ? (
                              <span className="inline-flex items-center text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                                {variance} {entry.unit}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-150 text-zinc-650">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
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
                className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isPending ? "Logging Reconciliation..." : "Submit Reconciliation & Update Stock"}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === "ledger" ? (
        
        /* Tab 1: Inventory Ledger View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Inventory Ledger Summary</h3>
              <p className="text-xs text-zinc-500">Running balances, last incoming, and last outgoing details for warehouse items.</p>
            </div>
          </div>

          {/* Search and Category Filter Button Track */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-50/50 p-4 border border-zinc-200 rounded-xl">
            <div className="flex-1 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search ledger by name or SKU..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-zinc-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-zinc-400 font-medium"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex bg-zinc-150 p-0.5 rounded-lg border border-zinc-200/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLedgerFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    ledgerFilter === "all"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerFilter("low_stock")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    ledgerFilter === "low_stock"
                      ? "bg-amber-100 text-amber-700 shadow-xs"
                      : "text-zinc-500 hover:text-amber-600"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low Stock
                </button>
              </div>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <button 
                onClick={() => { setIsNewItemOpen(true); cancelEdit(); }}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Register Item
              </button>
              <button 
                onClick={() => setIsAdjustmentOpen(true)}
                className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Log Adjustment
              </button>
              <button 
                onClick={() => { setIsBulkDrawerOpen(true); setBulkResults(null); }}
                className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk Import
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[11px] font-bold text-zinc-500">
                    <th className="p-3 font-extrabold text-zinc-700 border-r border-zinc-150">Item Info</th>
                    <th className="p-3 font-extrabold text-zinc-700 border-r border-zinc-150 text-center">Stock Qty</th>
                    <th className="p-3 font-bold text-emerald-700 text-center bg-emerald-50/30">Last IN</th>
                    <th className="p-3 font-bold text-emerald-700 bg-emerald-50/30">In Date</th>
                    <th className="p-3 font-bold text-emerald-700 border-r border-zinc-150 bg-emerald-50/30 text-center">Balance</th>
                    <th className="p-3 font-bold text-rose-700 text-center bg-rose-50/30">Last OUT</th>
                    <th className="p-3 font-bold text-rose-700 bg-rose-50/30">Out Date</th>
                    <th className="p-3 font-bold text-rose-700 bg-rose-50/30 text-center">Balance</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-zinc-400 text-sm font-medium">
                        No inventory items match the current search / filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedLedger.map(item => {
                      const isLowStock = item.quantity <= item.low_stock_threshold
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3 border-r border-zinc-100">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-9 h-9 object-cover rounded-lg border border-zinc-150 shadow-2xs shrink-0" />
                              ) : (
                                <div className="w-9 h-9 bg-zinc-50 border border-zinc-150 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
                                  <Package className="w-4.5 h-4.5" />
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-zinc-850 text-xs tracking-tight line-clamp-1">{item.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] bg-zinc-100 text-zinc-650 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">{item.sku}</span>
                                  <span className="text-[9px] text-zinc-400 font-medium">/ {item.unit}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 border-r border-zinc-100 text-center font-bold text-zinc-850 bg-zinc-50/10">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-black ${isLowStock ? "text-amber-600" : "text-zinc-900"}`}>{item.quantity}</span>
                                {isLowStock && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                              </div>
                              {/* Stock Status Bar */}
                              <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.quantity === 0
                                      ? "bg-rose-500 w-0"
                                      : isLowStock
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                  }`}
                                  style={{ 
                                    width: `${Math.min(100, Math.max(8, item.low_stock_threshold > 0 ? (item.quantity / (item.low_stock_threshold * 2.5)) * 100 : 100))}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          
                          {/* IN details */}
                          <td className="p-3 text-center font-bold text-emerald-650 bg-emerald-50/10">
                            {item.last_in ? `+${item.last_in.qty}` : "-"}
                          </td>
                          <td className="p-3 text-xs text-zinc-600 bg-emerald-50/10">
                            {item.last_in ? formatDate(item.last_in.date) : "-"}
                          </td>
                          <td className="p-3 text-center font-semibold text-emerald-800 border-r border-zinc-100 bg-emerald-50/10">
                            {item.last_in ? item.last_in.balance : "-"}
                          </td>

                          {/* OUT details */}
                          <td className="p-3 text-center font-bold text-rose-650 bg-rose-50/10">
                            {item.last_out ? `-${item.last_out.qty}` : "-"}
                          </td>
                          <td className="p-3 text-xs text-zinc-650 bg-rose-50/10">
                            {item.last_out ? formatDate(item.last_out.date) : "-"}
                          </td>
                          <td className="p-3 text-center font-semibold text-rose-800 bg-rose-50/10">
                            {item.last_out ? item.last_out.balance : "-"}
                          </td>

                          <td className="p-3 text-center">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => startEdit(item)}
                                className="px-2.5 py-1 bg-zinc-550 hover:bg-zinc-200 text-zinc-650 border border-zinc-200 rounded-md text-xs font-bold transition-all cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setAdjItemId(item.id)
                                  setIsAdjustmentOpen(true)
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-zinc-200 hover:border-emerald-250 rounded-md text-xs font-bold transition-all cursor-pointer"
                              >
                                Adjust
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={ledgerPage}
              totalPages={totalLedgerPages}
              totalItems={totalLedgerItems}
              itemsPerPage={ledgerPerPage}
              onPageChange={setLedgerPage}
              itemNamePlural="ledger items"
            />
          </div>
        </div>

      ) : activeTab === "procurement" ? (
        
        /* Tab 2: Procurement Tracker View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Procurement & Orders Tracker</h3>
              <p className="text-xs text-zinc-500">Create new purchase orders and track deliveries matching customer ledgers.</p>
            </div>
            <button 
              onClick={() => setIsPoOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Purchase Order
            </button>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-150 text-[11px] font-bold text-zinc-500">
                    <th className="p-3">Item Details</th>
                    <th className="p-3">PO #</th>
                    <th className="p-3 text-center">QTY</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Deliver Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {procurement.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400 text-sm font-medium">
                        No purchase orders placed. Click "Create Purchase Order" to begin.
                      </td>
                    </tr>
                  ) : (
                    paginatedProcurement.map(po => {
                      const isDelivered = po.status === 'delivered'
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-zinc-850 text-xs line-clamp-1">{po.item?.name || "Deleted Item"}</span>
                              <span className="text-[9px] bg-zinc-100 text-zinc-650 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider w-fit">{po.item?.sku || "N/A"}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-xs text-zinc-600">{po.po_number}</td>
                          <td className="p-3 text-center font-black text-zinc-850">{po.qty} <span className="text-[9px] text-zinc-405 lowercase font-medium">{po.item?.unit || 'pcs'}</span></td>
                          <td className="p-3 text-center">
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3 shrink-0" /> Delivered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-250 px-2 py-0.5 rounded-full animate-pulse">
                                <Truck className="w-3 h-3 shrink-0" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-xs text-zinc-650">
                            {isDelivered ? (
                              <span className="font-semibold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded border border-emerald-150 text-[10px]">
                                {formatDate(po.delivered_date)}
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-medium italic">Pending delivery</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isDelivered ? (
                              <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1 mr-2 justify-end">
                                <Check className="w-3.5 h-3.5" /> Received
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeliverPo(po.id)}
                                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Mark Received
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={procurementPage}
              totalPages={totalProcurementPages}
              totalItems={totalProcurementItems}
              itemsPerPage={procurementPerPage}
              onPageChange={setProcurementPage}
              itemNamePlural="purchase orders"
            />
          </div>
        </div>

      ) : (
        /* Tab 3: Stocktake Auditing View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Inventory Stocktake Audits</h3>
              <p className="text-xs text-zinc-500">Log periodic physical inventories and reconcile audits.</p>
            </div>
            <button 
              onClick={startNewAudit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
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
                paginatedAudits.map(audit => {
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
                            <span>Date: {formatDateTime(audit.created_at)}</span>
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
            <Pagination
              currentPage={auditsPage}
              totalPages={totalAuditsPages}
              totalItems={totalAuditsItems}
              itemsPerPage={auditsPerPage}
              onPageChange={setAuditsPage}
              itemNamePlural="audits"
            />
          </div>
        </div>
      )}

      {/* Dialog Modal: Register / Edit Item */}
      {isNewItemOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4 animate-smooth-fade">
          <div className="bg-white rounded-xl border border-zinc-250 shadow-2xl overflow-hidden w-full max-w-md animate-smooth-pop">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                {editingItem ? "Edit Inventory Item" : "Register New Stock Item"}
              </h3>
              <button onClick={() => setIsNewItemOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} encType="multipart/form-data" className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Cat6 UTP Cable Roll"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">SKU / Code</label>
                  <input
                    type="text"
                    name="sku"
                    value={sku}
                    onChange={e => { setSku(e.target.value); setIsSkuManuallyEdited(true); }}
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
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Item Photo</label>
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
                    <div className="w-16 h-16 bg-zinc-100 border border-dashed border-zinc-300 rounded-lg flex items-center justify-center text-zinc-400 shrink-0">
                      <Image className="w-6 h-6" />
                    </div>
                  )}
                  
                  <label className="flex-1 flex flex-col items-center justify-center border border-zinc-200 border-dashed rounded-lg p-3 hover:bg-zinc-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-bold">
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-2.5 rounded-lg text-sm transition-all border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || uploadingImage}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPending ? "Saving..." : (editingItem ? "Update Item" : "Register Item")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Modal: Log Adjustment */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4 animate-smooth-fade">
          <div className="bg-white rounded-xl border border-zinc-250 shadow-2xl overflow-hidden w-full max-w-md animate-smooth-pop">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                Log IN/OUT Ledger Adjustment
              </h3>
              <button onClick={() => setIsAdjustmentOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Select Item</label>
                <select
                  value={adjItemId}
                  onChange={e => setAdjItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Stock Item --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) [Current: {item.quantity}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Adjustment Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjType("in")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        adjType === "in"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      }`}
                    >
                      IN (Restock)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType("out")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        adjType === "out"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                      }`}
                    >
                      OUT (Deduct)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adjQty}
                    onChange={e => setAdjQty(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Adjustment Memo / Notes</label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  placeholder="e.g. Spare checkout for repair job #4032"
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-2.5 rounded-lg text-sm transition-all border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPending ? "Logging..." : "Submit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Modal: Create Procurement PO */}
      {isPoOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4 animate-smooth-fade">
          <div className="bg-white rounded-xl border border-zinc-250 shadow-2xl overflow-hidden w-full max-w-md animate-smooth-pop">
            <div className="p-5 border-b border-zinc-150 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Create Procurement Purchase Order
              </h3>
              <button onClick={() => setIsPoOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePoSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Select Procurement Item</label>
                <select
                  value={poItemId}
                  onChange={e => setPoItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Stock Item --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Purchase Order Number (PO #)</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-0084"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">PO Date</label>
                  <input
                    type="date"
                    required
                    value={poDate}
                    onChange={e => setPoDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">PO Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={poQty}
                    onChange={e => setPoQty(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPoOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-2.5 rounded-lg text-sm transition-all border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPending ? "Submitting..." : "Generate PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Bulk Import Drawer */}
      {isBulkDrawerOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkDrawerOpen(false)
          }}
          className="fixed inset-0 bg-zinc-950/60 z-50 transition-opacity flex items-center justify-center p-4 sm:p-6 animate-smooth-fade"
        >
          <div className="w-full max-w-2xl bg-white max-h-[90vh] shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-smooth-pop">
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
                    className="w-full p-3 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-zinc-800 leading-relaxed"
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
