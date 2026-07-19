"use client"
import { useState, useTransition, useEffect } from "react"
import { 
  Package, Plus, Settings, RefreshCw, AlertTriangle, 
  History, FileText, ClipboardList, CheckCircle2, AlertCircle,
  Check, X, Clipboard, User, Upload, Image, Search, Trash2, Edit, CornerDownLeft
} from "lucide-react"
import { 
  createOrUpdateInventoryItem,
  deleteInventoryItem,
  assignTool,
  returnTool
} from "@/app/actions/inventory"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import InventoryEditModal from "./InventoryEditModal"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"

interface ToolItem {
  id: string
  name: string
  description?: string | null
  total_qty: number
  available_qty: number
  image_url?: string | null
  created_at: string
  updated_at: string
}

interface ToolAssignment {
  id: string
  technician_id: string
  tool_id: string
  quantity: number
  borrowed_at: string
  returned_at?: string | null
  status: 'borrowed' | 'returned' | 'lost' | 'damaged'
  notes?: string | null
  tool?: {
    name: string
    image_url?: string | null
  } | null
  technician?: {
    full_name: string
    role: string
  } | null
}

interface TechnicianProfile {
  id: string
  full_name: string
  role: string
  avatar_url?: string | null
}

interface InventoryWorkspaceProps {
  initialTechnicians: TechnicianProfile[]
  initialAssignments: ToolAssignment[]
  initialItems: ToolItem[]
  userId: string
  initialTab: "handover" | "catalog"
}

export default function InventoryWorkspace({
  initialTechnicians,
  initialAssignments,
  initialItems,
  userId,
  initialTab
}: InventoryWorkspaceProps) {
  const router = useRouter()
  const { alert, confirm } = useAlertConfirm()
  const [activeTab, setActiveTab] = useState<"handover" | "catalog">(initialTab)
  const [isPending, startTransition] = useTransition()

  // Database lists
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>(initialTechnicians)
  const [assignments, setAssignments] = useState<ToolAssignment[]>(initialAssignments)
  const [tools, setTools] = useState<ToolItem[]>(initialItems)

  // Current states
  const [selectedTechId, setSelectedTechId] = useState<string | null>(
    initialTechnicians.length > 0 ? initialTechnicians[0].id : null
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("")
  const [userRole, setUserRole] = useState<string>("technician")

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isToolModalOpen, setIsToolModalOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<any>(null)

  // Form states for assignment
  const [assignToolId, setAssignToolId] = useState("")
  const [assignQty, setAssignQty] = useState(1)
  const [assignNotes, setAssignNotes] = useState("")

  // Form states for processing return
  const [processingAssignId, setProcessingAssignId] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Load user role on mount
  useEffect(() => {
    const supabase = createClient()
    const fetchRole = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (data) {
        setUserRole(data.role)
      }
    }
    fetchRole()
  }, [userId])

  const isAuthorized = ["coordinator", "super_admin", "ceo"].includes(userRole)

  // Filter technicians
  const filteredTechnicians = technicians.filter(tech => 
    tech.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter tools catalog
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(catalogSearchTerm.toLowerCase()))
  )

  const selectedTech = technicians.find(t => t.id === selectedTechId)
  const techAssignments = assignments.filter(a => a.technician_id === selectedTechId)
  const activeTechAssignments = techAssignments.filter(a => a.status === 'borrowed')
  const historicalTechAssignments = techAssignments.filter(a => a.status !== 'borrowed')

  // Utility to calculate duration
  const formatDuration = (borrowedAtStr: string, returnedAtStr?: string | null) => {
    const start = new Date(borrowedAtStr)
    const end = returnedAtStr ? new Date(returnedAtStr) : new Date()
    const diffMs = end.getTime() - start.getTime()
    if (diffMs < 0) return "0 mins"
    
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24
      return `${diffDays}d ${remainingHours}h`
    }
    if (diffHours > 0) {
      const remainingMins = diffMins % 60
      return `${diffHours}h ${remainingMins}m`
    }
    return `${diffMins} mins`
  }

  // Refetch helper
  const refetchData = async () => {
    const supabase = createClient()
    
    const { data: techData } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('role', ['technician', 'helper'])
      .order('full_name', { ascending: true })

    const { data: assignData } = await supabase
      .from('tool_assignments')
      .select(`
        *,
        tool:inventory_items!tool_id(name, image_url),
        technician:profiles!technician_id(full_name, role)
      `)
      .order('borrowed_at', { ascending: false })

    const { data: itemData } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })

    if (techData) setTechnicians(techData)
    if (assignData) setAssignments(assignData as any)
    if (itemData) setTools(itemData)
  }

  // Handle borrowing submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTechId || !assignToolId || assignQty <= 0) return

    setActionError(null)
    setActionSuccess(null)

    startTransition(async () => {
      const res = await assignTool(selectedTechId, assignToolId, assignQty, assignNotes)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess("Tool successfully assigned to technician!")
        setIsAssignModalOpen(false)
        setAssignToolId("")
        setAssignQty(1)
        setAssignNotes("")
        await refetchData()
      }
    })
  }

  // Handle return submit
  const handleReturnSubmit = async (assignmentId: string, status: 'returned' | 'lost' | 'damaged') => {
    setActionError(null)
    setActionSuccess(null)

    startTransition(async () => {
      const res = await returnTool(assignmentId, status, returnNotes)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess(`Successfully processed tool return as ${status.toUpperCase()}!`)
        setProcessingAssignId(null)
        setReturnNotes("")
        await refetchData()
      }
    })
  }

  // Handle tool create/update
  const handleToolSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActionError(null)
    setActionSuccess(null)

    const formData = new FormData(e.currentTarget)
    if (editingTool) {
      formData.append("id", editingTool.id)
    }

    startTransition(async () => {
      const res = await createOrUpdateInventoryItem(formData)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess(editingTool ? "Tool catalog updated!" : "New tool registered successfully!")
        setIsToolModalOpen(false)
        setEditingTool(null)
        await refetchData()
      }
    })
  }

  // Handle tool delete
  const handleDeleteTool = async (id: string) => {
    const ok = await confirm("Are you sure you want to delete this tool from the catalog?", "Confirm Deletion", "destructive")
    if (!ok) return
    setActionError(null)
    setActionSuccess(null)

    startTransition(async () => {
      const res = await deleteInventoryItem(id)
      if (res.error) {
        setActionError(res.error)
      } else {
        setActionSuccess("Tool successfully deleted.")
        await refetchData()
      }
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            TechnoSys Tool Inventory Manager
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Library checkout log for technician handovers, lost/damaged reporting, and tools catalog registry.
          </p>
        </div>

        {/* Tab Selection Segmented Controller */}
        <div className="bg-zinc-100 p-1 rounded-xl flex gap-1 w-fit shadow-inner">
          <button
            onClick={() => setActiveTab("handover")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "handover" 
                ? "bg-white shadow-sm text-emerald-700" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Handover Tracker
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "catalog" 
                ? "bg-white shadow-sm text-emerald-700" 
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            Tools Catalog
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {actionError && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-800">Transaction Failed</h4>
            <p className="text-xs text-rose-700 mt-1">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-emerald-800">Success</h4>
            <p className="text-xs text-emerald-700 mt-1">{actionSuccess}</p>
          </div>
          <button onClick={() => setActionSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Handover Tracker split pane */}
      {activeTab === "handover" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Technicians List */}
          <div className="col-span-12 lg:col-span-4 bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col h-[650px] shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search technician or helper..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-1">
              {filteredTechnicians.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-sm">
                  No workers found matching search.
                </div>
              ) : (
                filteredTechnicians.map(tech => {
                  const activeBorrows = assignments.filter(a => a.technician_id === tech.id && a.status === 'borrowed')
                  const isSelected = selectedTechId === tech.id
                  return (
                    <div
                      key={tech.id}
                      onClick={() => {
                        setSelectedTechId(tech.id)
                        setProcessingAssignId(null)
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-50/40 shadow-sm" 
                          : "border-zinc-100 hover:border-zinc-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                          {tech.avatar_url ? (
                            <img src={tech.avatar_url} alt={tech.full_name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            tech.full_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className={`text-sm font-semibold ${isSelected ? "text-emerald-950" : "text-zinc-800"}`}>
                            {tech.full_name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                            {tech.role}
                          </span>
                        </div>
                      </div>

                      {/* Active count badge */}
                      {activeBorrows.length > 0 ? (
                        <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {activeBorrows.length} active
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 px-2 py-0.5 bg-zinc-50 rounded border border-zinc-100">
                          Clear
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Handover Card Details */}
          <div className="col-span-12 lg:col-span-8 bg-white border border-zinc-200/80 rounded-2xl p-6 flex flex-col h-[650px] shadow-sm overflow-hidden">
            {!selectedTech ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Clipboard className="w-16 h-16 text-zinc-300 stroke-1 mb-4" />
                <h3 className="text-lg font-bold text-zinc-800">Select a Technician</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-sm">
                  Click a technician from the sidebar to view checkout history, process new borrows, or update returns.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Tech Profile Summary */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold border border-emerald-200 text-lg">
                      {selectedTech.avatar_url ? (
                        <img src={selectedTech.avatar_url} alt={selectedTech.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedTech.full_name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-950">{selectedTech.full_name}</h2>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Role: {selectedTech.role}</p>
                    </div>
                  </div>

                  {isAuthorized && (
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <Plus className="w-4 h-4" />
                      Handover Tool
                    </button>
                  )}
                </div>

                {/* Metrics Summary Row */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Active Checked Out</span>
                    <span className="text-xl font-extrabold text-amber-600 block mt-1">
                      {activeTechAssignments.length}
                    </span>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Returned Clear</span>
                    <span className="text-xl font-extrabold text-emerald-600 block mt-1">
                      {historicalTechAssignments.filter(a => a.status === 'returned').length}
                    </span>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Lost / Damaged</span>
                    <span className="text-xl font-extrabold text-rose-600 block mt-1">
                      {historicalTechAssignments.filter(a => a.status === 'lost' || a.status === 'damaged').length}
                    </span>
                  </div>
                </div>

                {/* Table Title */}
                <h3 className="text-sm font-bold text-zinc-800 mb-2 flex items-center gap-1">
                  <History className="w-4 h-4 text-zinc-500" />
                  Tool Assignment Ledger
                </h3>

                {/* Assignments List View */}
                <div className="flex-1 overflow-y-auto border border-zinc-100 rounded-2xl bg-zinc-50/50">
                  {techAssignments.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400 text-sm">
                      No tool handover history registered for this technician.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                          <th className="p-3 pl-4">Tool Name</th>
                          <th className="p-3">Borrowed At</th>
                          <th className="p-3">Duration Held</th>
                          <th className="p-3">Status</th>
                          {isAuthorized && <th className="p-3 text-right pr-4">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/60 bg-white">
                        {techAssignments.map(assign => {
                          const isCurrentlyHeld = assign.status === 'borrowed'
                          return (
                            <tr key={assign.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-3 pl-4 font-semibold text-zinc-800">
                                <div className="flex items-center gap-2">
                                  {assign.tool?.image_url ? (
                                    <img src={assign.tool.image_url} alt="" className="w-7 h-7 rounded border object-cover" />
                                  ) : (
                                    <Package className="w-5 h-5 text-zinc-400" />
                                  )}
                                  <span>
                                    {assign.tool?.name || "Unknown Tool"}
                                    {assign.quantity > 1 && (
                                      <span className="ml-1.5 text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-bold">
                                        x{assign.quantity}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-zinc-500">
                                {new Date(assign.borrowed_at).toLocaleDateString()} at{" "}
                                {new Date(assign.borrowed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3 text-zinc-600 font-medium">
                                {formatDuration(assign.borrowed_at, assign.returned_at)}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  assign.status === 'borrowed' ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                  assign.status === 'returned' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                  assign.status === 'lost' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                  "bg-red-100 text-red-800 border border-red-200"
                                }`}>
                                  {assign.status.toUpperCase()}
                                </span>
                                {assign.notes && (
                                  <p className="text-[10px] text-zinc-400 italic mt-0.5 max-w-[200px] truncate">
                                    "{assign.notes}"
                                  </p>
                                )}
                              </td>
                              {isAuthorized && (
                                <td className="p-3 text-right pr-4">
                                  {isCurrentlyHeld ? (
                                    processingAssignId === assign.id ? (
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="text"
                                          placeholder="Remarks/Damage notes..."
                                          value={returnNotes}
                                          onChange={e => setReturnNotes(e.target.value)}
                                          className="text-[10.5px] border rounded px-1.5 py-0.5 max-w-[120px] focus:outline-none"
                                        />
                                        <button 
                                          onClick={() => handleReturnSubmit(assign.id, 'returned')} 
                                          title="Return Clear"
                                          className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-emerald-600"
                                        >
                                          Return
                                        </button>
                                        <button 
                                          onClick={() => handleReturnSubmit(assign.id, 'lost')} 
                                          title="Mark Lost"
                                          className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-rose-600"
                                        >
                                          Lost
                                        </button>
                                        <button 
                                          onClick={() => handleReturnSubmit(assign.id, 'damaged')} 
                                          title="Mark Damaged"
                                          className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-red-600"
                                        >
                                          Damage
                                        </button>
                                        <button 
                                          onClick={() => setProcessingAssignId(null)} 
                                          className="text-zinc-400 hover:text-zinc-600 px-1"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                        <button
                                          onClick={() => {
                                            setProcessingAssignId(assign.id)
                                            setReturnNotes("")
                                          }}
                                          className="text-emerald-600 hover:text-emerald-800 text-[11px] font-bold hover:underline flex items-center gap-0.5 ml-auto mb-1"
                                        >
                                          <CornerDownLeft className="w-3 h-3" />
                                          Process Handover
                                        </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-zinc-400 italic block mb-1">Completed</span>
                                  )}
                                  <button
                                    onClick={() => setEditingAssignment(assign)}
                                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-flex ml-auto"
                                    title="Edit Record"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Tools catalog Encoder */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search tools name or description..."
                value={catalogSearchTerm}
                onChange={e => setCatalogSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {isAuthorized && (
              <button
                onClick={() => {
                  setEditingTool(null)
                  setIsToolModalOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add New Tool
              </button>
            )}
          </div>

          {filteredTools.length === 0 ? (
            <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl text-zinc-400 text-sm shadow-sm">
              No tools registered in catalog registry matching filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map(tool => {
                const availabilityPercent = tool.total_qty > 0 
                  ? Math.round((tool.available_qty / tool.total_qty) * 100) 
                  : 0

                return (
                  <div key={tool.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="space-y-3">
                      {/* Image header */}
                      <div className="w-full h-32 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center overflow-hidden">
                        {tool.image_url ? (
                          <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-12 h-12 text-zinc-300 stroke-1" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-zinc-950">{tool.name}</h3>
                        <p className="text-xs text-zinc-400 mt-1 h-8 overflow-hidden text-ellipsis line-clamp-2">
                          {tool.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    {/* Stock level indicators */}
                    <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-500">Warehouse Stock</span>
                        <span className={`${tool.available_qty === 0 ? "text-rose-600" : "text-emerald-700"}`}>
                          {tool.available_qty} / {tool.total_qty} Available
                        </span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            availabilityPercent <= 20 ? "bg-rose-500" :
                            availabilityPercent <= 50 ? "bg-amber-500" :
                            "bg-emerald-500"
                          }`}
                          style={{ width: `${availabilityPercent}%` }}
                        />
                      </div>

                      {/* Control buttons for managers */}
                      {isAuthorized && (
                        <div className="flex items-center justify-end gap-2 pt-3">
                          <button
                            onClick={() => {
                              setEditingTool(tool)
                              setIsToolModalOpen(true)
                            }}
                            className="text-zinc-600 hover:text-emerald-700 hover:bg-zinc-50 p-1.5 rounded border border-zinc-100 transition-all"
                            title="Edit Tool"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTool(tool.id)}
                            className="text-zinc-400 hover:text-rose-600 hover:bg-zinc-50 p-1.5 rounded border border-zinc-100 transition-all"
                            title="Delete Tool"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Assign/Borrow Tool Modal */}
      {isAssignModalOpen && selectedTech && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Handover Tool to Technician</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Technician indicator */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Technician</label>
                <div className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 text-xs">
                    {selectedTech.full_name.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-zinc-800">{selectedTech.full_name}</span>
                </div>
              </div>

              {/* Tool dropdown */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Select Tool</label>
                <select
                  required
                  value={assignToolId}
                  onChange={e => {
                    setAssignToolId(e.target.value)
                    setAssignQty(1)
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">-- Choose an Available Tool --</option>
                  {tools.filter(t => t.available_qty > 0).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.available_qty} available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              {assignToolId && (() => {
                const selectedItem = tools.find(t => t.id === assignToolId)
                const maxAvailable = selectedItem ? selectedItem.available_qty : 1
                return (
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={maxAvailable}
                      value={assignQty}
                      onChange={e => setAssignQty(Math.min(maxAvailable, Math.max(1, Number(e.target.value))))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                )
              })()}

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Notes / Remarks</label>
                <textarea
                  placeholder="E.g., Assigned for client job Pacita branch..."
                  rows={3}
                  value={assignNotes}
                  onChange={e => setAssignNotes(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {isPending ? "Assigning..." : "Assign Tool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add/Edit Tool Encoder Modal */}
      {isToolModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-950">
                {editingTool ? "Modify Tool Catalog Details" : "Register New Tool"}
              </h3>
              <button onClick={() => setIsToolModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleToolSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tool Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="E.g., Milwaukee Cordless Impact Wrench"
                  defaultValue={editingTool?.name || ""}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  name="description"
                  placeholder="Specifications, accessories, or condition remarks..."
                  rows={3}
                  defaultValue={editingTool?.description || ""}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                />
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total Owned</label>
                  <input
                    type="number"
                    name="total_qty"
                    required
                    min={0}
                    defaultValue={editingTool ? editingTool.total_qty : 1}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Available Warehouse</label>
                  <input
                    type="number"
                    name="available_qty"
                    required
                    min={0}
                    defaultValue={editingTool ? editingTool.available_qty : 1}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Image URL / Upload */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  name="image_url"
                  placeholder="https://..."
                  defaultValue={editingTool?.image_url || ""}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Upload Photo (Optional)</label>
                <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-zinc-200 border-dashed rounded-xl hover:border-zinc-300 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-zinc-400 stroke-1" />
                    <div className="flex text-xs text-zinc-500 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-semibold text-emerald-600 hover:text-emerald-700">
                        <span>Select file</span>
                        <input type="file" name="image" accept="image/*" className="sr-only" />
                      </label>
                    </div>
                    <p className="text-[10px] text-zinc-400">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {isPending ? "Saving..." : "Save Catalog Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Edit Modal */}
      {editingAssignment && (
        <InventoryEditModal 
          assignment={editingAssignment} 
          onClose={() => setEditingAssignment(null)} 
        />
      )}
    </div>
  )
}
