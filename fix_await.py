import sys

# 1. Fix src/app/actions/broadcaster.ts
with open('src/app/actions/broadcaster.ts', 'r') as f:
    content = f.read()
content = content.replace('const supabase = createClient()', 'const supabase = await createClient()')
with open('src/app/actions/broadcaster.ts', 'w') as f:
    f.write(content)

# 2. Fix src/app/dashboard/broadcaster/page.tsx
with open('src/app/dashboard/broadcaster/page.tsx', 'r') as f:
    content = f.read()
content = content.replace('const supabase = createClient()', 'const supabase = await createClient()')
with open('src/app/dashboard/broadcaster/page.tsx', 'w') as f:
    f.write(content)

# 3. Fix src/app/dashboard/layout.tsx
with open('src/app/dashboard/layout.tsx', 'r') as f:
    content = f.read()
content = content.replace('ClipboardList, ShieldAlert, Map } from \'lucide-react\'', 'ClipboardList, ShieldAlert, Map, Megaphone } from \'lucide-react\'')
content = content.replace('import GlobalRealtimeSync from \'@/components/GlobalRealtimeSync\'', 'import GlobalRealtimeSync from \'@/components/GlobalRealtimeSync\'\nimport { QuickBroadcastDrawer } from \'@/components/broadcaster/QuickBroadcastDrawer\'')
with open('src/app/dashboard/layout.tsx', 'w') as f:
    f.write(content)

print("Fixed await and imports")
