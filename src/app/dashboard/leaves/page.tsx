import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getLeaves } from "@/app/actions/leaves"
import LeavesWorkspace from "./LeavesWorkspace"

export const revalidate = 0;

export default async function LeavesPage() {
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

  // Fetch initial leaves
  const leaves = await getLeaves()

  return (
    <LeavesWorkspace 
      initialLeaves={leaves as any} 
      currentUserId={user.id} 
    />
  )
}
