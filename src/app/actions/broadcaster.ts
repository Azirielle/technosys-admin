"use server"

import { createClient } from "@/lib/supabase/server"
import { verifyRoleAccess } from "@/lib/permissions"
import { batchDispatchNotificationCascade, NotificationCategory } from "@/lib/notification-cascade"

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

    const category: NotificationCategory = departmentTag.toUpperCase().includes('PAYROLL') 
      ? 'PAYROLL_RELEASE' 
      : 'CRITICAL_ANNOUNCEMENT';

    const { data: contacts } = await supabase
      .from('announcement_contacts')
      .select('id, full_name, phone_number')
      .in('id', recipientIds)
      
    let deliveryStatus = 'dispatched';
    if (contacts && contacts.length > 0) {
      const recipients = contacts.map((c: any) => ({
        id: c.id,
        phone: c.phone_number,
        name: c.full_name
      }));

      const cascadeSummary = await batchDispatchNotificationCascade(
        recipients,
        `Broadcaster [${departmentTag}]`,
        message,
        category,
        { departmentTag, senderId: userId }
      );

      deliveryStatus = `dispatched (push: ${cascadeSummary.pushCount}, sms: ${cascadeSummary.smsCount})`;
      console.log(`[BROADCASTER_CASCADE_SUMMARY] Total: ${cascadeSummary.total}, Push: ${cascadeSummary.pushCount}, SMS: ${cascadeSummary.smsCount}`);
    }

    const { error } = await supabase.from('announcements').insert({
      sender_id: userId,
      department_tag: departmentTag,
      message: message,
      recipient_count: recipientIds.length,
      status: deliveryStatus
    })

    if (error) return { error: error.message }
    return { success: true, status: deliveryStatus }
  } catch (err: any) {
    return { error: err.message }
  }
}
