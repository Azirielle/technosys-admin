"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// 1. Fetch all tickets
export async function getTickets(statusFilter?: string) {
  try {
    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        employee:profiles!employee_id(full_name, role),
        assignee:profiles!assigned_to(full_name, role)
      `)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'open_assigned') {
        query = query.in('status', ['open', 'assigned', 'in_progress'])
      } else {
        query = query.eq('status', statusFilter)
      }
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch tickets:", err.message || err)
    return []
  }
}

// 2. Fetch a specific ticket's details
export async function getTicketDetails(ticketId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        employee:profiles!employee_id(full_name, role),
        assignee:profiles!assigned_to(full_name, role)
      `)
      .eq('id', ticketId)
      .single()

    if (error) throw error
    return data
  } catch (err: any) {
    console.error(`Failed to fetch ticket ${ticketId}:`, err.message || err)
    return null
  }
}

// 3. Fetch comments for a specific ticket
export async function getTicketComments(ticketId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ticket_comments')
      .select(`
        *,
        author:profiles!author_id(full_name, role)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error(`Failed to fetch comments for ticket ${ticketId}:`, err.message || err)
    return []
  }
}

// 4. Fetch list of admins/staff
export async function getStaffList() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'technician')
      .order('full_name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error("Failed to fetch staff list:", err.message || err)
    return []
  }
}

// 5. Update ticket status
export async function updateTicketStatus(ticketId: string, status: string) {
  try {
    const { error } = await supabaseAdmin
      .from('tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    if (error) throw error

    revalidatePath('/dashboard/tickets')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to update ticket ${ticketId} status:`, err.message || err)
    return { error: err.message || "Failed to update ticket status." }
  }
}

// 6. Assign ticket
export async function assignTicket(ticketId: string, adminId: string | null) {
  try {
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .select('status')
      .eq('id', ticketId)
      .single()

    if (ticketErr) throw ticketErr

    const nextStatus = ticket && ticket.status === 'open' && adminId ? 'assigned' : undefined

    const updateData: any = { 
      assigned_to: adminId, 
      updated_at: new Date().toISOString() 
    }

    if (nextStatus) {
      updateData.status = nextStatus
    }

    const { error } = await supabaseAdmin
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (error) throw error

    revalidatePath('/dashboard/tickets')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to assign ticket ${ticketId}:`, err.message || err)
    return { error: err.message || "Failed to assign ticket." }
  }
}

// 7. Add ticket comment
export async function addTicketComment(ticketId: string, authorId: string, content: string) {
  try {
    if (!content.trim()) {
      return { error: "Comment content cannot be empty." }
    }

    const { error } = await supabaseAdmin
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: authorId,
        content: content.trim()
      })

    if (error) throw error

    // Also touch the ticket's updated_at timestamp
    await supabaseAdmin
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId)

    revalidatePath('/dashboard/tickets')
    return { success: true }
  } catch (err: any) {
    console.error(`Failed to add comment to ticket ${ticketId}:`, err.message || err)
    return { error: err.message || "Failed to add comment." }
  }
}
