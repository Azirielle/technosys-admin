import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { verifyRoleAccess } from "@/lib/permissions"
import BroadcasterClient from "./BroadcasterClient"

export default async function BroadcasterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { authorized } = await verifyRoleAccess('broadcaster', false)
  
  if (!authorized) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-slate-500">You do not have permission to access the Broadcaster module.</p>
      </div>
    )
  }

  // Fetch initial history
  const { data: history } = await supabase
    .from('announcements')
    .select(`
      *,
      sender:sender_id(full_name, role)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="h-full bg-slate-50/50 flex flex-col">
      <div className="flex-1 p-8">
        <BroadcasterClient initialHistory={history || []} />
      </div>
    </div>
  )
}
