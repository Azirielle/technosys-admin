import sys

# 1. Fix src/app/actions/broadcaster.ts
with open('src/app/actions/broadcaster.ts', 'r') as f:
    content = f.read()
content = content.replace('@/utils/supabase/server', '@/lib/supabase/server')
content = content.replace('const { authorized, profile } = await verifyRoleAccess', 'const { authorized, userId } = await verifyRoleAccess')
content = content.replace('if (!authorized || !profile)', 'if (!authorized || !userId)')
content = content.replace('sender_id: profile.id,', 'sender_id: userId,')
with open('src/app/actions/broadcaster.ts', 'w') as f:
    f.write(content)

# 2. Fix src/app/dashboard/broadcaster/BroadcasterClient.tsx
with open('src/app/dashboard/broadcaster/BroadcasterClient.tsx', 'r') as f:
    content = f.read()
content = content.replace('import { Megaphone, Users, Search, Plus, Trash2, Edit2, Loader2, RefreshCw }', 'import { Megaphone, Users, Search, Plus, Trash2, Edit2, Loader2, RefreshCw, X }')
with open('src/app/dashboard/broadcaster/BroadcasterClient.tsx', 'w') as f:
    f.write(content)

# 3. Fix src/app/dashboard/broadcaster/page.tsx
with open('src/app/dashboard/broadcaster/page.tsx', 'r') as f:
    content = f.read()
content = content.replace('@/utils/supabase/server', '@/lib/supabase/server')
with open('src/app/dashboard/broadcaster/page.tsx', 'w') as f:
    f.write(content)

# 4. Fix src/app/dashboard/layout.tsx
with open('src/app/dashboard/layout.tsx', 'r') as f:
    content = f.read()
if 'Megaphone' not in content:
    content = content.replace('Map } from ''lucide-react''', 'Map, Megaphone } from ''lucide-react''')
if 'QuickBroadcastDrawer' not in content:
    content = content.replace('import GlobalRealtimeSync from ''@/components/GlobalRealtimeSync''', "import GlobalRealtimeSync from '@/components/GlobalRealtimeSync'\nimport { QuickBroadcastDrawer } from '@/components/broadcaster/QuickBroadcastDrawer'")
with open('src/app/dashboard/layout.tsx', 'w') as f:
    f.write(content)

print("Fixed typescript errors")
