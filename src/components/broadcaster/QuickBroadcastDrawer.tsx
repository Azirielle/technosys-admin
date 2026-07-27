"use client"

import { useState, useEffect, useTransition } from "react"
import { X, Megaphone, Loader2, Check, AlertCircle } from "lucide-react"
import { getContacts, sendBroadcast } from "@/app/actions/broadcaster"

type Contact = {
  id: string
  full_name: string
  role: string | null
  phone_number: string
}

type QuickBroadcastDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export function QuickBroadcastDrawer({ isOpen, onClose }: QuickBroadcastDrawerProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  
  const [departmentTag, setDepartmentTag] = useState("HR")
  const [message, setMessage] = useState("")
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchContacts()
    }
  }, [isOpen])

  const fetchContacts = async () => {
    setLoading(true)
    const { data, error } = await getContacts()
    if (!error && data) {
      setContacts(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")

    if (selectedRecipientIds.length === 0) {
      setErrorMsg("Please select at least one recipient.")
      return
    }

    if (!message.trim()) {
      setErrorMsg("Message cannot be empty.")
      return
    }

    const formData = new FormData()
    formData.append("departmentTag", departmentTag)
    formData.append("message", message)
    formData.append("recipientIds", JSON.stringify(selectedRecipientIds))

    startTransition(async () => {
      const res = await sendBroadcast(formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg("Broadcast mock-sent successfully!")
        setTimeout(() => {
          onClose()
          setSuccessMsg("")
          setMessage("")
          setSelectedRecipientIds([])
        }, 2000)
      }
    })
  }

  const toggleRecipient = (id: string) => {
    if (selectedRecipientIds.includes(id)) {
      setSelectedRecipientIds(prev => prev.filter(r => r !== id))
    } else {
      setSelectedRecipientIds(prev => [...prev, id])
    }
  }

  const selectAll = () => {
    setSelectedRecipientIds(contacts.map(c => c.id))
  }

  const clearAll = () => {
    setSelectedRecipientIds([])
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-zinc-200">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-md">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900">Quick Broadcast</h2>
              <p className="text-xs font-semibold text-zinc-500">Send an urgent notice via SMS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="broadcast-form" onSubmit={handleSubmit} className="space-y-6">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4" /> {successMsg}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Sender Tag (Color Coded)</label>
              <select 
                value={departmentTag}
                onChange={(e) => setDepartmentTag(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="HR">HR Department (Pink)</option>
                <option value="CEO">CEO Office (Purple)</option>
                <option value="Accounting">Accounting (Emerald)</option>
                <option value="IT">IT Support (Blue)</option>
                <option value="Operations">Operations (Orange)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Recipients ({selectedRecipientIds.length})</label>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button type="button" onClick={selectAll} className="text-indigo-600 hover:text-indigo-800">All</button>
                  <span className="text-zinc-300">|</span>
                  <button type="button" onClick={clearAll} className="text-zinc-500 hover:text-zinc-800">Clear</button>
                </div>
              </div>
              <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto bg-zinc-50/30">
                {loading ? (
                  <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
                ) : contacts.length === 0 ? (
                  <div className="p-6 text-center text-xs font-medium text-zinc-500">No contacts found. Add them in the Directory.</div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {contacts.map(contact => (
                      <label key={contact.id} className="flex items-center p-3 hover:bg-white cursor-pointer transition-colors group">
                        <input 
                          type="checkbox" 
                          checked={selectedRecipientIds.includes(contact.id)}
                          onChange={() => toggleRecipient(contact.id)}
                          className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="ml-3">
                          <p className="text-xs font-bold text-zinc-800 group-hover:text-indigo-700 transition-colors">{contact.full_name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{contact.role || 'No Role'} • {contact.phone_number}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Message Body (SMS)</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your announcement here..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] text-zinc-400 font-medium">{message.length} characters ({(Math.ceil(message.length / 160) || 1)} SMS part{Math.ceil(message.length / 160) > 1 ? 's' : ''})</p>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100">
          <button 
            type="submit" 
            form="broadcast-form"
            disabled={isPending || loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Megaphone className="w-4 h-4" /> Send Broadcast (Mock)</>}
          </button>
        </div>
      </div>
    </>
  )
}
