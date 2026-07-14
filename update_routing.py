import sys

# 1. permissions-client.ts
with open('src/lib/permissions-client.ts', 'r') as f:
    content = f.read()

if 'warnings:' not in content:
    content = content.replace("broadcaster: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator'],", "broadcaster: ['super_admin', 'ceo', 'coo', 'svp', 'admin', 'hr', 'coordinator'],\n  warnings: ['super_admin', 'ceo', 'admin', 'hr', 'coordinator', 'branch_manager', 'supervisor'],")

with open('src/lib/permissions-client.ts', 'w') as f:
    f.write(content)

# 2. layout.tsx
with open('src/app/dashboard/layout.tsx', 'r') as f:
    content = f.read()

if "{ href: '/dashboard/warnings'" not in content:
    content = content.replace("{ href: '/dashboard/broadcaster', label: 'Broadcaster', icon: Megaphone },", "{ href: '/dashboard/broadcaster', label: 'Broadcaster', icon: Megaphone },\n      { href: '/dashboard/warnings', label: 'Warnings', icon: ShieldAlert },")

if "if (path.startsWith('/dashboard/warnings')) return 'warnings'" not in content:
    content = content.replace("if (path.startsWith('/dashboard/broadcaster')) return 'broadcaster'", "if (path.startsWith('/dashboard/broadcaster')) return 'broadcaster'\n      if (path.startsWith('/dashboard/warnings')) return 'warnings'")

with open('src/app/dashboard/layout.tsx', 'w') as f:
    f.write(content)

print("Updated permissions and layout")
