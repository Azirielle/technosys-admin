import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getInventoryItems, getInventoryTransactions, getInventoryAudits } from "@/app/actions/inventory"
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

  // Fetch stock details, logs, and audits in parallel
  const [items, transactions, audits] = await Promise.all([
    getInventoryItems(),
    getInventoryTransactions(),
    getInventoryAudits()
  ])

  return (
    <InventoryWorkspace 
      initialItems={items as any} 
      initialTransactions={transactions as any} 
      initialAudits={audits as any}
      userId={user.id}
    />
  )
}
