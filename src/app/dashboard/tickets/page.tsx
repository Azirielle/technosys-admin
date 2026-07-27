import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getTickets, getStaffList } from "@/app/actions/tickets"
import TicketWorkspace from "./TicketWorkspace"

export const revalidate = 0;

export default async function TicketsPage() {
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

  // Fetch data in parallel
  const [tickets, staff] = await Promise.all([
    getTickets("active"), // default to active tickets
    getStaffList()
  ])

  return (
    <TicketWorkspace 
      initialTickets={tickets as any} 
      staffList={staff as any} 
      currentUserId={user.id} 
    />
  )
}
