import sys

with open('src/app/dashboard/layout.tsx', 'r') as f:
    content = f.read()

# Add Megaphone to lucide-react imports if not there
if 'Megaphone' not in content:
    content = content.replace('Map } from ''lucide-react''', 'Map, Megaphone } from ''lucide-react''')

# Add QuickBroadcastDrawer import
import_stmt = "import { QuickBroadcastDrawer } from '@/components/broadcaster/QuickBroadcastDrawer'"
if import_stmt not in content:
    content = content.replace('import GlobalRealtimeSync from ''@/components/GlobalRealtimeSync''', f"import GlobalRealtimeSync from '@/components/GlobalRealtimeSync'\n{import_stmt}")

# Add isQuickBroadcastOpen state
state_stmt = "  const [isQuickBroadcastOpen, setIsQuickBroadcastOpen] = useState(false)"
if state_stmt not in content:
    content = content.replace('const [loading, setLoading] = useState<boolean>(true)', f"const [loading, setLoading] = useState<boolean>(true)\n{state_stmt}")

# Add Broadcaster to navItems
nav_stmt = "    { href: '/dashboard/broadcaster', label: 'Broadcaster', icon: Megaphone },"
if "'/dashboard/broadcaster'" not in content:
    content = content.replace("    { href: '/dashboard/inventory', label: 'Inventory', icon: Package },", f"    {{ href: '/dashboard/inventory', label: 'Inventory', icon: Package }},\n{nav_stmt}")

# Add active module logic
if "if (path.startsWith('/dashboard/broadcaster')) return 'broadcaster'" not in content:
    content = content.replace("if (path.startsWith('/dashboard/inventory')) return 'inventory'", "if (path.startsWith('/dashboard/inventory')) return 'inventory'\n      if (path.startsWith('/dashboard/broadcaster')) return 'broadcaster'")

# Add Megaphone icon to header
header_btn = '''
             <button 
                onClick={() => setIsQuickBroadcastOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 shadow-sm transition-colors cursor-pointer"
             >
               <Megaphone className="w-4 h-4" />
             </button>
'''
if "setIsQuickBroadcastOpen(true)" not in content:
    content = content.replace('<div className="flex items-center gap-4">', f'<div className="flex items-center gap-4">{header_btn}')

# Add QuickBroadcastDrawer to layout
if "<QuickBroadcastDrawer" not in content:
    content = content.replace('</AlertConfirmProvider>', '  <QuickBroadcastDrawer isOpen={isQuickBroadcastOpen} onClose={() => setIsQuickBroadcastOpen(false)} />\n    </AlertConfirmProvider>')

with open('src/app/dashboard/layout.tsx', 'w') as f:
    f.write(content)

print("Updated layout.tsx perfectly")
