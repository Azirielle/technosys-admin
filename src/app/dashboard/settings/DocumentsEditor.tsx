"use client"

import { useState, useTransition } from "react"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { 
  FileText, Upload, Trash2, Calendar, File, CheckCircle2, 
  AlertCircle, Loader2, Search, Link as LinkIcon 
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createDocument, deleteDocument } from "@/app/actions/documents"

interface DocumentItem {
  id: string
  name: string
  category: string
  file_url: string
  file_size: number
  branch_id?: string | null
  created_at: string
  branch?: {
    name: string
  } | null
}

interface DocumentsEditorProps {
  initialDocuments: DocumentItem[]
  officeLocations: any[]
  userRole: string
}

export default function DocumentsEditor({ 
  initialDocuments, 
  officeLocations, 
  userRole 
}: DocumentsEditorProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const { alert, confirm } = useAlertConfirm()
  
  // Form states
  const [docName, setDocName] = useState("")
  const [category, setCategory] = useState("Leave Form")
  const [branchId, setBranchId] = useState("")
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Status messages
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const supabase = createClient()
  const isReadOnly = !['admin', 'super_admin'].includes(userRole)

  // Format bytes to KB/MB
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle uploader change
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("")
    setSuccessMsg("")

    if (!docName.trim()) {
      setErrorMsg("Please enter a Document Name first before selecting a file.")
      e.target.value = ""
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    // 10MB limit check
    const maxLimit = 10 * 1024 * 1024
    if (file.size > maxLimit) {
      setErrorMsg("Upload blocked: File size exceeds the 10MB limit.")
      e.target.value = ""
      return
    }

    setUploading(true)

    try {
      // 1. Upload to Supabase storage bucket 'documents'
      const fileExt = file.name.split('.').pop()
      const fileName = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3650000', upsert: true })

      if (storageErr) throw storageErr

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // 3. Create database row using Server Action
      const res = await createDocument({
        name: docName.trim(),
        category,
        fileUrl: publicUrl,
        fileSize: file.size,
        branchId: branchId !== "" ? branchId : null
      })

      if (res.error) {
        // Cleanup storage file on db insert error
        await supabase.storage.from('documents').remove([fileName])
        throw new Error(res.error)
      }

      setSuccessMsg(`Successfully uploaded "${docName}"!`)
      setDocName("")
      setCategory("Leave Form")
      setBranchId("")
      
      // Refresh local state list
      const { data: refreshedDocs } = await supabase
        .from('documents')
        .select('*, branch:office_locations(name)')
        .order('created_at', { ascending: false })
      if (refreshedDocs) setDocuments(refreshedDocs)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to upload document.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  // Handle Delete
  const handleDelete = async (doc: DocumentItem) => {
    if (isReadOnly) return
    const confirmed = await confirm(
      `Are you sure you want to delete "${doc.name}"?`,
      "Delete Document",
      "destructive"
    )
    if (!confirmed) return

    setErrorMsg("")
    setSuccessMsg("")

    startTransition(async () => {
      try {
        // 1. Delete actual file from Supabase storage first
        const filePath = doc.file_url.split('/').pop()
        if (filePath) {
          await supabase.storage.from('documents').remove([filePath])
        }

        // 2. Delete database metadata record
        const res = await deleteDocument(doc.id)
        if (res.error) throw new Error(res.error)

        setSuccessMsg(`Successfully deleted "${doc.name}"`)
        
        // Remove locally from state list
        setDocuments(prev => prev.filter(item => item.id !== doc.id))
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || "Failed to delete document.")
        await alert(err.message || "Failed to delete document.", "Delete Failed", "destructive")
      }
    })
  }

  // Filter list
  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      doc.name.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query) ||
      (doc.branch?.name && doc.branch.name.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Upload Console Section */}
      {!isReadOnly && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-emerald-600" /> Add New Document
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 uppercase mb-1">Document Display Name</label>
              <input 
                type="text" 
                placeholder="e.g., Leave Request Form v2"
                value={docName}
                onChange={e => setDocName(e.target.value)}
                disabled={uploading || isPending}
                className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 uppercase mb-1">Category Type</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={uploading || isPending}
                className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-zinc-800"
              >
                <option value="Leave Form">Leave Form</option>
                <option value="Resignation Form">Resignation Form</option>
                <option value="Company Policy">Company Policy</option>
                <option value="Handbook">Handbook</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 uppercase mb-1">Branch Bound Restriction</label>
              <select 
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                disabled={uploading || isPending}
                className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-zinc-800"
              >
                <option value="">No Branch / Global (All Staff)</option>
                {officeLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all ${(!docName.trim() || uploading || isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {uploading ? "Uploading File..." : "Select File to Upload"}
              <input 
                type="file" 
                className="hidden" 
                onChange={handleUpload}
                disabled={!docName.trim() || uploading || isPending}
              />
            </label>
            <span className="text-xs text-zinc-500 font-medium">Max file size: 10MB (PDF, DOCX, XLSX, etc.)</span>
          </div>
        </div>
      )}

      {/* Search Filter bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text" 
          placeholder="Search documents by name, category, or branch..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-sm pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-zinc-800 font-medium"
        />
      </div>

      {/* Documents List Table */}
      <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold text-xs uppercase tracking-wider">
              <th className="py-4 px-6">Document Details</th>
              <th className="py-4 px-6">Category</th>
              <th className="py-4 px-6">Branch Scope</th>
              <th className="py-4 px-6">Size / Date</th>
              {!isReadOnly && <th className="py-4 px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150 text-zinc-700">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 4 : 5} className="py-12 text-center text-zinc-450 font-semibold">
                  <File className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  No documents found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-zinc-800">
                    <a 
                      href={doc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 text-zinc-900 hover:text-emerald-600 transition-colors hover:underline"
                    >
                      <FileText className="w-4.5 h-4.5 text-emerald-600" />
                      {doc.name}
                      <LinkIcon className="w-3 h-3 text-zinc-400" />
                    </a>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {doc.branch ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {doc.branch.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-50 text-zinc-600 border border-zinc-200">
                        Global / All Staff
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-xs font-semibold text-zinc-500">
                    <div>{formatBytes(doc.file_size)}</div>
                    <div className="flex items-center gap-1 mt-1 font-normal text-[10px]">
                      <Calendar className="w-3 h-3" /> {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  {!isReadOnly && (
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={isPending}
                        className="p-2 hover:bg-rose-50 hover:text-rose-600 text-zinc-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Document"
                      >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
