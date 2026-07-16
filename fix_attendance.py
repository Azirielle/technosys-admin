import sys

with open('src/app/actions/attendance.ts', 'r') as f:
    content = f.read()

import re

new_func = '''export async function flagSuspiciousSelfie(logId: string) {
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
}
'''

content = re.sub(r'export async function flagSuspiciousSelfie.*?^}', new_func, content, flags=re.MULTILINE|re.DOTALL)

with open('src/app/actions/attendance.ts', 'w') as f:
    f.write(content)

print("Fixed attendance.ts")
