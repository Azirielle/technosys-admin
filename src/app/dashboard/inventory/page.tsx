import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getInventoryItems, getInventoryLedger, getProcurementOrders, getInventoryAudits } from "@/app/actions/inventory"
import InventoryWorkspace from "./InventoryWorkspace"

export const revalidate = 0;

export default async function InventoryPage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) {
      user = data.user
    }
  } catch (e) {
    console.error("Auth session expired or database wiped")
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch ledger summaries, POs, items, and audits in parallel
  const [ledger, procurement, items, audits] = await Promise.all([
    getInventoryLedger(),
    getProcurementOrders(),
    getInventoryItems(),
    getInventoryAudits()
  ])

  return (
    <InventoryWorkspace 
      initialLedger={ledger as any}
      initialProcurement={procurement as any}
      initialItems={items as any}
      initialAudits={audits as any}
      userId={user.id}
    />
  )
}
