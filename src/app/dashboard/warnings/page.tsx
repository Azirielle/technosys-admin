import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { verifyRoleAccess } from "@/lib/permissions"
import WarningsClient from "./WarningsClient"

export default async function WarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { authorized, role } = await verifyRoleAccess('warnings', false)
  
  if (!authorized) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-slate-500">You do not have permission to access the Warnings module.</p>
      </div>
    )
  }

  // Fetch initial warnings
  const { data: history } = await supabase
    .from('employee_warnings')
    .select(`
      *,
      employee:employee_id(full_name, role),
      issuer:issued_by(full_name, role),
      reviewer:service_dept_reviewer_id(full_name, role),
      editor:last_edited_by(full_name, role)
    `)
    .order('created_at', { ascending: false })

  // Fetch employees for dropdowns
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })

  return (
    <div className="h-full bg-slate-50/50 flex flex-col">
      <div className="flex-1 p-8">
        <WarningsClient initialWarnings={history || []} employees={employees || []} currentUserRole={role || ''} />
      </div>
    </div>
  )
}
