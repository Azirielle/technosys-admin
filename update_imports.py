import sys

# Update AttendanceTabs.tsx
with open('src/app/dashboard/attendance/AttendanceTabs.tsx', 'r') as f:
    content = f.read()

content = content.replace('import PendingSelfiesWidget from "../PendingSelfiesWidget"', 'import SelfieAuditWidget from "../SelfieAuditWidget"')
content = content.replace('<PendingSelfiesWidget pendingSelfies={pendingSelfies} canApprove={canApprove} />', '<SelfieAuditWidget recentSelfies={pendingSelfies} canApprove={canApprove} />')

with open('src/app/dashboard/attendance/AttendanceTabs.tsx', 'w') as f:
    f.write(content)

# Update page.tsx
with open('src/app/dashboard/attendance/page.tsx', 'r') as f:
    page_content = f.read()

page_content = page_content.replace('getPendingSelfies', 'getRecentSelfies')

with open('src/app/dashboard/attendance/page.tsx', 'w') as f:
    f.write(page_content)

print("Updated imports and page")
