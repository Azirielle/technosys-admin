import sys

with open('src/app/actions/attendance.ts', 'r') as f:
    content = f.read()

content = content.replace("export async function getPendingSelfies()", "export async function getRecentSelfies()")
content = content.replace(".eq('photo_status', 'pending')", ".neq('photo_status', 'flagged').limit(20)")

old_approval = '''export async function processSelfieApproval(logId: string, status: 'approved' | 'rejected') {
  try {
    const { authorized, userId } = await verifyRoleAccess('attendance', true) 
    if (!authorized || !userId) {
      return { error: "Unauthorized. You do not have permission to approve attendance photos." }
    }

    const { error } = await supabaseAdmin
      .from('time_logs')
      .update({ 
        photo_status: status,
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', logId)

    if (error) throw error

    await logActivity(userId, 'attendance_approval', Selfie  for log )

    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (err: any) {
    console.error("Selfie approval failed:", err.message)
    return { error: err.message }
  }
}'''

new_flag = '''export async function flagSuspiciousSelfie(logId: string) {
  try {
    const { authorized, userId } = await verifyRoleAccess('attendance', true) 
    if (!authorized || !userId) {
      return { error: "Unauthorized. You do not have permission to flag attendance photos." }
    }

    const { error } = await supabaseAdmin
      .from('time_logs')
      .update({ 
        photo_status: 'flagged'
      })
      .eq('id', logId)

    if (error) throw error

    await logActivity(userId, 'attendance_flagged', Selfie flagged as suspicious for log )

    revalidatePath('/dashboard/attendance')
    return { success: true }
  } catch (err: any) {
    console.error("Selfie flagging failed:", err.message)
    return { error: err.message }
  }
}'''

content = content.replace(old_approval, new_flag)

with open('src/app/actions/attendance.ts', 'w') as f:
    f.write(content)

print("Updated attendance.ts")
