"use client"

import { useState, useEffect, useTransition } from "react"
import { Megaphone, Users, Search, Plus, Trash2, Edit2, Loader2, RefreshCw, X } from "lucide-react"
import { getContacts, createContact, updateContact, deleteContact } from "@/app/actions/broadcaster"

export default function BroadcasterClient({ initialHistory }: { initialHistory: any[] }) {
  const [activeTab, setActiveTab] = useState<'history' | 'directory'>('history')
  const [contacts, setContacts] = useState<any[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form State
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    if (activeTab === 'directory') {
      fetchContacts()
    }
  }, [activeTab])

  const fetchContacts = async () => {
    setLoadingContacts(true)
    const res = await getContacts()
    if (res.data) setContacts(res.data)
    setLoadingContacts(false)
  }

  const handleOpenContactModal = (contact: any = null) => {
    setErrorMsg("")
    if (contact) {
      setEditingId(contact.id)
      setFullName(contact.full_name)
      setRole(contact.role || "")
      setPhoneNumber(contact.phone_number)
    } else {
      setEditingId(null)
      setFullName("")
      setRole("")
      setPhoneNumber("")
    }
    setShowContactModal(true)
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    
    const formData = new FormData()
    formData.append("fullName", fullName)
    formData.append("role", role)
    formData.append("phoneNumber", phoneNumber)
    
    if (editingId) formData.append("id", editingId)

    startTransition(async () => {
      const res = editingId ? await updateContact(formData) : await createContact(formData)
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg(editingId ? "Contact updated!" : "Contact created!")
        setShowContactModal(false)
        fetchContacts()
        setTimeout(() => setSuccessMsg(""), 3000)
      }
    })
  }

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return
    startTransition(async () => {
      const res = await deleteContact(id)
      if (res.error) setErrorMsg(res.error)
      else {
        fetchContacts()
      }
    })
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'HR': return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'CEO': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Accounting': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'IT': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Operations': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Broadcaster Hub
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage external contacts and view broadcast history.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-200">
          {successMsg}
        </div>
      )}

      {errorMsg && !showContactModal && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <RefreshCw className="w-4 h-4" /> Broadcast History
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'directory' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <Users className="w-4 h-4" /> Contact Directory
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Sender</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Tag</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Message</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Recipients</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {initialHistory.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-sm font-medium text-zinc-500">No broadcasts found.</td></tr>
                ) : (
                  initialHistory.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-zinc-600">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">
                        {item.sender?.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getTagColor(item.department_tag)}`}>
                          {item.department_tag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 max-w-xs truncate" title={item.message}>
                        {item.message}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-900">
                        {item.recipient_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
            <h2 className="text-sm font-bold text-zinc-900">External Contacts</h2>
            <button 
              onClick={() => handleOpenContactModal()}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Contact
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Name</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Role/Title</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500">Phone Number</th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loadingContacts ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></td></tr>
                ) : contacts.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-sm font-medium text-zinc-500">No contacts found in the directory.</td></tr>
                ) : (
                  contacts.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-zinc-900">{c.full_name}</td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-600">{c.role || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-700">{c.phone_number}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handleOpenContactModal(c)} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteContact(c.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" disabled={isPending}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-black text-lg text-zinc-900">{editingId ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setShowContactModal(false)} className="text-zinc-400 hover:text-zinc-800 p-1 rounded-lg hover:bg-zinc-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveContact} className="p-5 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">{errorMsg}</div>}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Role / Identifier (Optional)</label>
                <input value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. VIP Client" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">Phone Number</label>
                <input required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+639..." />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowContactModal(false)} className="flex-1 py-2.5 border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-zinc-900 text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
