"use server"

import { createClient } from "@/lib/supabase/server"
import { verifyRoleAccess } from "@/lib/permissions"

export async function getContacts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('announcement_contacts').select('*').order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { data }
}

export async function createContact(formData: FormData) {
  try {
    const { authorized } = await verifyRoleAccess('broadcaster', true)
    if (!authorized) return { error: "Unauthorized." }

    const fullName = formData.get("fullName") as string
    const role = formData.get("role") as string
    const phoneNumber = formData.get("phoneNumber") as string

    if (!fullName || !phoneNumber) return { error: "Name and Phone Number are required." }

    const supabase = await createClient()
    const { error } = await supabase.from('announcement_contacts').insert({
      full_name: fullName,
      role: role || null,
      phone_number: phoneNumber,
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateContact(formData: FormData) {
  try {
    const { authorized } = await verifyRoleAccess('broadcaster', true)
    if (!authorized) return { error: "Unauthorized." }

    const id = formData.get("id") as string
    const fullName = formData.get("fullName") as string
    const role = formData.get("role") as string
    const phoneNumber = formData.get("phoneNumber") as string

    if (!id || !fullName || !phoneNumber) return { error: "ID, Name, and Phone Number are required." }

    const supabase = await createClient()
    const { error } = await supabase.from('announcement_contacts').update({
      full_name: fullName,
      role: role || null,
      phone_number: phoneNumber,
    }).eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteContact(id: string) {
  try {
    const { authorized } = await verifyRoleAccess('broadcaster', true)
    if (!authorized) return { error: "Unauthorized." }

    const supabase = await createClient()
    const { error } = await supabase.from('announcement_contacts').delete().eq("id", id)

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function sendBroadcast(formData: FormData) {
  try {
    const { authorized, userId } = await verifyRoleAccess('broadcaster', true)
    if (!authorized || !userId) return { error: "Unauthorized." }

    const departmentTag = formData.get("departmentTag") as string
    const message = formData.get("message") as string
    const recipientIdsStr = formData.get("recipientIds") as string
    
    if (!departmentTag || !message || !recipientIdsStr) {
      return { error: "Missing required fields." }
    }

    const recipientIds = JSON.parse(recipientIdsStr) as string[]

    const supabase = await createClient()
    
    // In a real app, you would fetch the phone numbers for these IDs,
    // and then call the SMS provider API here.
    const { data: contacts } = await supabase
      .from('announcement_contacts')
      .select('phone_number')
      .in('id', recipientIds)
      
    console.log(`[MOCK SMS SENT] Sender: ${departmentTag}, Message: "${message}", Recipients: ${contacts?.length || 0}`)
    // If process.env.SMS_PROVIDER === 'bulksms' ... call API ...

    const { error } = await supabase.from('announcements').insert({
      sender_id: userId,
      department_tag: departmentTag,
      message: message,
      recipient_count: recipientIds.length,
      status: 'mock_sent'
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
