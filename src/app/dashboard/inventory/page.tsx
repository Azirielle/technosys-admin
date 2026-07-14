import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getInventoryItems, getTechnicians, getToolAssignments } from "@/app/actions/inventory"
import InventoryWorkspace from "./InventoryWorkspace"

export const revalidate = 0;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const resolvedParams = await searchParams
  const rawTab = resolvedParams?.tab
  const initialTab = (rawTab === "handover" || rawTab === "catalog") ? rawTab : "handover"

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

  // Fetch technicians, assignments, and items in parallel
  const [technicians, assignments, items] = await Promise.all([
    getTechnicians(),
    getToolAssignments(),
    getInventoryItems()
  ])

  return (
    <InventoryWorkspace 
      initialTechnicians={technicians as any}
      initialAssignments={assignments as any}
      initialItems={items as any}
      userId={user.id}
      initialTab={initialTab}
    />
  )
}
