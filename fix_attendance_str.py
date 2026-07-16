import sys

with open('src/app/actions/attendance.ts', 'r') as f:
    content = f.read()

import re

new_func = "export async function flagSuspiciousSelfie(logId: string) {\n  try {\n    const { authorized, userId } = await verifyRoleAccess('attendance', true) \n    if (!authorized || !userId) {\n      return { error: \"Unauthorized. You do not have permission to flag attendance photos.\" }\n    }\n\n    const { error } = await supabaseAdmin\n      .from('time_logs')\n      .update({ \n        photo_status: 'flagged'\n      })\n      .eq('id', logId)\n\n    if (error) throw error\n\n    await logActivity(userId, 'attendance_flagged', Selfie flagged as suspicious for log \)\n\n    revalidatePath('/dashboard/attendance')\n    return { success: true }\n  } catch (err: any) {\n    console.error(\"Selfie flagging failed:\", err.message)\n    return { error: err.message }\n  }\n}\n"

content = re.sub(r'export async function flagSuspiciousSelfie.*?^}', new_func, content, flags=re.MULTILINE|re.DOTALL)

with open('src/app/actions/attendance.ts', 'w') as f:
    f.write(content)

print("Fixed attendance.ts string interpolation")
