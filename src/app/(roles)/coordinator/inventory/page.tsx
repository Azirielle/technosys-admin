'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Box,
  Plus,
  Wrench,
  Package,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Edit2,
  Trash2,
  Tag,
  ShieldAlert,
  Calendar,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  createOrUpdateInventoryItem,
  deleteInventoryItem,
  assignTool,
  returnTool,
  getTechnicians,
} from '@/app/actions/inventory'

type ToolCatalogItem = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category: string
  serial_number: string | null
  unit_cost: number
  is_serialized: boolean
  status: 'active' | 'maintenance' | 'retired'
  total_stock: number
  available_stock: number
  created_at: string
}

type ToolAssignment = {
  id: string
  tool_id: string
  technician_id: string
  quantity: number
  handed_over_at: string
  returned_at: string | null
  status: 'checked_out' | 'returned' | 'damaged' | 'lost'
  condition_on_return: 'good' | 'minor_wear' | 'damaged' | 'lost' | null
  condition_notes: string | null
  damage_fee: number
  notes: string | null
  profiles?: { full_name: string; role: string; avatar_url: string | null }
  tool_catalog?: { name: string; category: string; image_url: string | null; serial_number: string | null; unit_cost: number }
}

type TechnicianProfile = {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
}

const CATEGORIES = [
  'All Categories',
  'HVAC / Refrigeration',
  'Diagnostics & Testing',
  'Power Tools',
  'Hand Tools',
  'Safety Gear',
  'General Tools',
]

export default function InventoryLedgerPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'ledger'>('catalog')
  const [catalog, setCatalog] = useState<ToolCatalogItem[]>([])
  const [assignments, setAssignments] = useState<ToolAssignment[]>([])
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [statusFilter, setStatusFilter] = useState('checked_out')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modals
  const [selectedAssignment, setSelectedAssignment] = useState<ToolAssignment | null>(null)
  const [isToolModalOpen, setIsToolModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<ToolCatalogItem | null>(null)
  const [formSerial, setFormSerial] = useState('')
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutTool, setCheckoutTool] = useState<ToolCatalogItem | null>(null)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returningAssignment, setReturningAssignment] = useState<ToolAssignment | null>(null)

  const generateAssetTag = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `TC-EQP-${randomNum}`
  }

  const handleOpenAddTool = () => {
    setEditingTool(null)
    setFormSerial(generateAssetTag())
    setFormError(null)
    setIsToolModalOpen(true)
  }

  const handleOpenEditTool = (tool: ToolCatalogItem) => {
    setEditingTool(tool)
    setFormSerial(tool.serial_number || '')
    setFormError(null)
    setIsToolModalOpen(true)
  }

  // Forms
  const [checkoutTechId, setCheckoutTechId] = useState('')
  const [checkoutQty, setCheckoutQty] = useState(1)
  const [checkoutNotes, setCheckoutNotes] = useState('')

  const [returnCondition, setReturnCondition] = useState<'good' | 'minor_wear' | 'damaged' | 'lost'>('good')
  const [returnNotes, setReturnNotes] = useState('')
  const [damageFee, setDamageFee] = useState<number>(0)
  const [formError, setFormError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [catRes, assignRes, techs] = await Promise.all([
        supabase.from('tool_catalog').select('*').order('name', { ascending: true }),
        supabase
          .from('tool_handovers')
          .select('*, profiles!technician_id(full_name, role, avatar_url), tool_catalog!tool_id(name, category, image_url, serial_number, unit_cost)')
          .order('handed_over_at', { ascending: false }),
        getTechnicians(),
      ])

      if (catRes.data) setCatalog(catRes.data as ToolCatalogItem[])
      if (assignRes.data) setAssignments(assignRes.data as any)
      if (techs) setTechnicians(techs as TechnicianProfile[])
    } catch (err) {
      console.error('Failed to load inventory data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Summary Metrics
  const totalAssets = catalog.reduce((acc, t) => acc + (t.total_stock || 0), 0)
  const availableUnits = catalog.reduce((acc, t) => acc + (t.available_stock || 0), 0)
  const activeLoans = assignments.filter(a => a.status === 'checked_out').reduce((acc, a) => acc + (a.quantity || 1), 0)
  const damagedUnits = assignments.filter(a => a.status === 'damaged').reduce((acc, a) => acc + (a.quantity || 1), 0)

  // Filtered Catalog
  const filteredCatalog = catalog.filter((tool) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      tool.name.toLowerCase().includes(q) ||
      (tool.description?.toLowerCase() || '').includes(q) ||
      (tool.serial_number?.toLowerCase() || '').includes(q) ||
      tool.category.toLowerCase().includes(q)
    const matchesCategory = selectedCategory === 'All Categories' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Filtered Assignments
  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (a.tool_catalog?.name?.toLowerCase() || '').includes(q) ||
      (a.profiles?.full_name?.toLowerCase() || '').includes(q) ||
      (a.tool_catalog?.serial_number?.toLowerCase() || '').includes(q) ||
      a.id.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getDaysBorrowed = (borrowedAt: string, returnedAt: string | null) => {
    const end = returnedAt ? new Date(returnedAt) : new Date()
    const start = new Date(borrowedAt)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // Handle Checkout Tool
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutTool || !checkoutTechId) {
      setFormError('Please select a technician/helper.')
      return
    }

    setFormError(null)
    startTransition(async () => {
      const res = await assignTool(checkoutTechId, checkoutTool.id, checkoutQty, checkoutNotes)
      if (res?.error) {
        setFormError(res.error)
      } else {
        setIsCheckoutModalOpen(false)
        setCheckoutTool(null)
        setCheckoutTechId('')
        setCheckoutQty(1)
        setCheckoutNotes('')
        fetchInitialData()
      }
    })
  }

  // Handle Return Audit Submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returningAssignment) return

    setFormError(null)
    const finalStatus: 'returned' | 'damaged' | 'lost' =
      returnCondition === 'good' || returnCondition === 'minor_wear' ? 'returned' : returnCondition

    startTransition(async () => {
      const res = await returnTool(
        returningAssignment.id,
        finalStatus,
        returnCondition,
        returnNotes,
        Number(damageFee) || 0
      )

      if (res?.error) {
        setFormError(res.error)
      } else {
        setIsReturnModalOpen(false)
        setReturningAssignment(null)
        setReturnCondition('good')
        setReturnNotes('')
        setDamageFee(0)
        fetchInitialData()
      }
    })
  }

  // Handle Delete Tool
  const handleDeleteTool = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from inventory?`)) return

    startTransition(async () => {
      const res = await deleteInventoryItem(id)
      if (res?.error) {
        alert(res.error)
      } else {
        fetchInitialData()
      }
    })
  }

  // Handle Add/Edit Tool Form Submit
  const handleToolFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await createOrUpdateInventoryItem(formData)
      if (res?.error) {
        setFormError(res.error)
      } else {
        setIsToolModalOpen(false)
        setEditingTool(null)
        fetchInitialData()
      }
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'returned':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'lost':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'damaged':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200'
    }
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">Tool Inventory & Custody Vault</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Active Lifecycle
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Track equipment availability, issue tools to crews, and audit returns with condition verification.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddTool}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Equipment</span>
          </button>
          <button
            onClick={fetchInitialData}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Total Tool Assets</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalAssets} <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">units</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">In Warehouse (Available)</p>
            <p className="text-lg font-bold text-blue-600">{availableUnits} <span className="text-xs font-normal text-zinc-400">ready</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">In Field / Deployed</p>
            <p className="text-lg font-bold text-amber-600">{activeLoans} <span className="text-xs font-normal text-zinc-400">deployed</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Damaged / In Repair</p>
            <p className="text-lg font-bold text-purple-600">{damagedUnits} <span className="text-xs font-normal text-zinc-400">units</span></p>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col flex-1">
        {/* Top View Mode Tabs */}
        <div className="px-5 pt-4 pb-0 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('catalog')
                setCurrentPage(1)
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'catalog'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Equipment Vault ({catalog.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ledger')
                setCurrentPage(1)
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'ledger'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Issued Tools & Deployments ({assignments.filter(a => a.status === 'checked_out').length} Active)</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Search Controls */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute inset-y-0 left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'catalog' ? 'Search tools, serials, categories...' : 'Search technician, tool, ID...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200/80 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
            />
          </div>

          {activeTab === 'catalog' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-2.5 pr-8 py-1 text-xs border border-zinc-200/80 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="checked_out">Currently Issued / Deployed</option>
                <option value="returned">Returned (Historical)</option>
                <option value="damaged">Damaged / Repair</option>
                <option value="lost">Lost / Missing</option>
                <option value="all">All Records</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: EQUIPMENT VAULT (CATALOG) */}
        {activeTab === 'catalog' && (
          <div className="overflow-x-auto flex-1 p-3">
            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 border-r border-zinc-200">Equipment / Spec</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Category</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Stock Level</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        Loading equipment catalog...
                      </td>
                    </tr>
                  ) : filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No equipment matches your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((tool) => {
                      const isAvailable = tool.available_stock > 0
                      const isLowStock = isAvailable && tool.available_stock <= 2

                      return (
                        <tr key={tool.id} className="hover:bg-zinc-50/75 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-3.5 py-2 border-r border-zinc-200">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200/80 overflow-hidden flex items-center justify-center shrink-0">
                                {tool.image_url ? (
                                  <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">{tool.name}</p>
                                  {tool.serial_number && (
                                    <span className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                                      {tool.serial_number}
                                    </span>
                                  )}
                                </div>
                                {tool.description && (
                                  <p className="text-[10px] text-zinc-400 truncate max-w-xs leading-tight mt-0.5">{tool.description}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {tool.category}
                            </span>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  !isAvailable
                                    ? 'bg-rose-500'
                                    : isLowStock
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">{tool.available_stock}</span>
                              <span className="text-zinc-400 text-[11px]">/ {tool.total_stock} Available</span>
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                tool.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : tool.status === 'maintenance'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              {tool.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="px-3.5 py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                disabled={tool.available_stock <= 0}
                                onClick={() => {
                                  setCheckoutTool(tool)
                                  setIsCheckoutModalOpen(true)
                                }}
                                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                              >
                                Issue Tool
                              </button>
                              <button
                                onClick={() => handleOpenEditTool(tool)}
                                className="p-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Edit Tool"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTool(tool.id, tool.name)}
                                className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors"
                                title="Delete Tool"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        )}

        {/* TAB 2: ISSUED TOOLS & DEPLOYMENTS */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto flex-1 p-3">
            <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 border-r border-zinc-200">Asset / Tool</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Assigned Crew</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Duration / Aging</th>
                    <th className="px-3 py-2.5 border-r border-zinc-200">Status / Condition</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        Loading issued tools ledger...
                      </td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No issued tool records match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((a) => {
                      const days = getDaysBorrowed(a.handed_over_at, a.returned_at)
                      const isOverdue = a.status === 'checked_out' && days > 3

                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAssignment(a)}
                          className="hover:bg-zinc-50/75 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <td className="px-3.5 py-2 border-r border-zinc-200">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                                {a.tool_catalog?.image_url ? (
                                  <img src={a.tool_catalog.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                                  {a.tool_catalog?.name || 'Unknown Tool'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[9px] text-zinc-400">
                                    #{a.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  {a.tool_catalog?.serial_number && (
                                    <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-1 py-0.2 rounded border border-zinc-200">
                                      {a.tool_catalog.serial_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px]">
                                {a.profiles?.full_name?.charAt(0) || 'T'}
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900 leading-tight text-xs">{a.profiles?.full_name || 'Technician'}</p>
                                <p className="text-[9px] text-zinc-400 uppercase leading-tight">{a.profiles?.role || 'Field Crew'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-zinc-700 font-medium text-xs">
                                {new Date(a.handed_over_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border w-fit ${
                                  isOverdue
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                }`}
                              >
                                {days} DAYS {a.status === 'checked_out' ? 'OUT' : 'TOTAL'}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap border-r border-zinc-200">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit ${getStatusBadge(
                                  a.status
                                )}`}
                              >
                                {a.status === 'checked_out' ? 'IN FIELD' : a.status.toUpperCase()} ({a.quantity || 1}x)
                              </span>
                              {a.condition_on_return && (
                                <span className="text-[9px] text-zinc-500 font-medium">
                                  Audit: {a.condition_on_return.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3.5 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {a.status === 'checked_out' ? (
                              <button
                                onClick={() => {
                                  setReturningAssignment(a)
                                  setIsReturnModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-2xs transition-colors"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>Process Return</span>
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-xs font-medium">Closed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT TOOL */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {editingTool ? 'Edit Equipment Specs' : 'Register New Equipment'}
                </h3>
                <p className="text-xs text-zinc-500">Record tools, capital assets, and consumables into the vault.</p>
              </div>
              <button
                onClick={() => setIsToolModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleToolFormSubmit} className="p-6 space-y-4">
              {editingTool && <input type="hidden" name="id" value={editingTool.id} />}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingTool?.name || ''}
                    placeholder="e.g. Digital Manifold Gauge"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingTool?.category || 'General Tools'}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">Serial / Asset Tag</label>
                    <button
                      type="button"
                      onClick={() => setFormSerial(generateAssetTag())}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Generate random serial number"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    name="serial_number"
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    placeholder="e.g. TC-EQP-8492"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Total Stock *</label>
                  <input
                    type="number"
                    name="total_stock"
                    min="0"
                    required
                    defaultValue={editingTool?.total_stock ?? 1}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Available in Warehouse *</label>
                  <input
                    type="number"
                    name="available_stock"
                    min="0"
                    required
                    defaultValue={editingTool?.available_stock ?? 1}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Unit Cost (₱)</label>
                  <input
                    type="number"
                    name="unit_cost"
                    min="0"
                    step="0.01"
                    defaultValue={editingTool?.unit_cost || 0}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Lifecycle Status</label>
                  <select
                    name="status"
                    defaultValue={editingTool?.status || 'active'}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="active">Active Service</option>
                    <option value="maintenance">In Maintenance</option>
                    <option value="retired">Retired / Obsolete</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description / Spec Notes</label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={editingTool?.description || ''}
                    placeholder="Provide technical notes, calibration dates, or accessories included..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Photo Upload</label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingTool ? 'Update Equipment' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKOUT / HANDOVER */}
      {isCheckoutModalOpen && checkoutTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-zinc-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Issue Equipment to Crew</h3>
                <p className="text-xs text-zinc-500">Assign equipment custody to field personnel.</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                  {checkoutTool.image_url ? (
                    <img src={checkoutTool.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Wrench className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 leading-snug">{checkoutTool.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    Available: <span className="font-semibold text-emerald-600">{checkoutTool.available_stock}</span>{' '}
                    units
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Assign to Field Crew *</label>
                <select
                  required
                  value={checkoutTechId}
                  onChange={(e) => setCheckoutTechId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Technician or Helper...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={checkoutTool.available_stock}
                  required
                  value={checkoutQty}
                  onChange={(e) => setCheckoutQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Deployment / Site Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched for SM Mall HVAC retrofit"
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Confirming...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RETURN & CONDITION AUDIT */}
      {isReturnModalOpen && returningAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-zinc-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Equipment Return & Condition Audit</h3>
                <p className="text-xs text-zinc-500">Inspect tool state before returning to warehouse stock.</p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-zinc-900">{returningAssignment.tool_catalog?.name}</p>
                <p className="text-zinc-500">
                  Technician:{' '}
                  <span className="font-semibold text-zinc-800">{returningAssignment.profiles?.full_name}</span> •{' '}
                  {returningAssignment.quantity || 1} unit(s)
                </p>
                <p className="text-zinc-500">
                  Days in Custody:{' '}
                  <span className="font-semibold text-zinc-800">
                    {getDaysBorrowed(returningAssignment.handed_over_at, null)} days
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Physical Condition Audit *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-colors ${
                      returnCondition === 'good'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value="good"
                      checked={returnCondition === 'good'}
                      onChange={() => setReturnCondition('good')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Good Condition</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Restocks directly to warehouse</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-colors ${
                      returnCondition === 'minor_wear'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value="minor_wear"
                      checked={returnCondition === 'minor_wear'}
                      onChange={() => setReturnCondition('minor_wear')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Minor Wear</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Usable; log condition note</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-colors ${
                      returnCondition === 'damaged'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-900'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value="damaged"
                      checked={returnCondition === 'damaged'}
                      onChange={() => setReturnCondition('damaged')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-purple-700">Damaged / Repair</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Deducts asset from available</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-colors ${
                      returnCondition === 'lost'
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value="lost"
                      checked={returnCondition === 'lost'}
                      onChange={() => setReturnCondition('lost')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold text-rose-700">Lost / Missing</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Permanent write-off liability</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Condition & Inspection Notes</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Minor scratches on casing, calibration verified intact..."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {(returnCondition === 'damaged' || returnCondition === 'lost') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Assessed Repair / Replacement Fee (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={damageFee}
                    onChange={(e) => setDamageFee(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Recorded in activity audit log and flaggable for coordinator review.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Complete Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGNMENT DETAILS */}
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Custody Record Details</h3>
                <p className="text-xs text-zinc-400 font-mono">#{selectedAssignment.id}</p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Tool / Asset</p>
                <p className="font-bold text-zinc-900 text-sm">{selectedAssignment.tool_catalog?.name}</p>
                <p className="text-zinc-500 font-mono text-[10px]">
                  {selectedAssignment.tool_catalog?.serial_number ? `SN: ${selectedAssignment.tool_catalog.serial_number}` : ''}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Technician</p>
                <p className="font-bold text-zinc-900 text-sm">{selectedAssignment.profiles?.full_name}</p>
                <p className="text-zinc-500 uppercase text-[10px]">{selectedAssignment.profiles?.role}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Quantity</p>
                <p className="font-bold text-zinc-900">{selectedAssignment.quantity || 1} unit(s)</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Status</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                    selectedAssignment.status
                  )}`}
                >
                  {selectedAssignment.status.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Handed Over At</p>
                <p className="font-medium text-zinc-700">{new Date(selectedAssignment.handed_over_at).toLocaleString()}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Returned At</p>
                <p className="font-medium text-zinc-700">
                  {selectedAssignment.returned_at ? new Date(selectedAssignment.returned_at).toLocaleString() : 'Active in Field'}
                </p>
              </div>

              {selectedAssignment.condition_on_return && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
                    Return Condition
                  </p>
                  <p className="font-bold text-zinc-900 uppercase">{selectedAssignment.condition_on_return}</p>
                </div>
              )}

              {selectedAssignment.damage_fee > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Damage Fee</p>
                  <p className="font-bold text-rose-600 font-mono">₱{selectedAssignment.damage_fee.toLocaleString()}</p>
                </div>
              )}

              {selectedAssignment.notes && (
                <div className="col-span-2 pt-2 border-t border-zinc-100">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">Notes</p>
                  <p className="text-zinc-700">{selectedAssignment.notes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
