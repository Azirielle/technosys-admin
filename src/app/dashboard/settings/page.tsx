import { supabaseAdmin } from "@/lib/supabase/admin"
import PhilHealthRuleEditor from "./PhilHealthRuleEditor"
import PagibigRuleEditor from "./PagibigRuleEditor"
import SssDataTable from "./SssDataTable"

export const revalidate = 0;

export default async function SettingsPage() {
  // Fetch SSS brackets to pass to the DataTable
  const { data: sssBrackets } = await supabaseAdmin
    .from('sss_brackets')
    .select('*')
    .order('min_compensation', { ascending: true })

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Compliance Settings</h1>
        <p className="text-zinc-500 mt-1">Manage standard statutory deductions securely.</p>
      </div>

      <div className="space-y-8">
        <PhilHealthRuleEditor />
        <PagibigRuleEditor />
        <SssDataTable initialData={sssBrackets || []} />
      </div>
    </div>
  )
}
