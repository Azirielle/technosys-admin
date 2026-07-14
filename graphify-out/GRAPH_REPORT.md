# Graph Report - .  (2026-06-23)

## Corpus Check
- 117 files · ~87,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 364 nodes · 625 edges · 29 communities (19 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Employee Management|Employee Management]]
- [[_COMMUNITY_Announcements & Holidays|Announcements & Holidays]]
- [[_COMMUNITY_Leaves & Payroll|Leaves & Payroll]]
- [[_COMMUNITY_Authentication & Utilities|Authentication & Utilities]]
- [[_COMMUNITY_Academic Thesis Frameworks|Academic Thesis Frameworks]]
- [[_COMMUNITY_Component Directories|Component Directories]]
- [[_COMMUNITY_Project Configuration|Project Configuration]]
- [[_COMMUNITY_Inventory Management|Inventory Management]]
- [[_COMMUNITY_TypeScript Settings|TypeScript Settings]]
- [[_COMMUNITY_Dependencies|Dependencies]]
- [[_COMMUNITY_Service Ticketing|Service Ticketing]]
- [[_COMMUNITY_Activity Logging|Activity Logging]]
- [[_COMMUNITY_Geofencing & Locations|Geofencing & Locations]]
- [[_COMMUNITY_Statutory Compliance Settings|Statutory Compliance Settings]]
- [[_COMMUNITY_AI Code Review Scripts|AI Code Review Scripts]]
- [[_COMMUNITY_Module 15|Module 15]]
- [[_COMMUNITY_Module 16|Module 16]]
- [[_COMMUNITY_Module 17|Module 17]]
- [[_COMMUNITY_Module 18|Module 18]]
- [[_COMMUNITY_Module 19|Module 19]]
- [[_COMMUNITY_Module 20|Module 20]]
- [[_COMMUNITY_Module 21|Module 21]]
- [[_COMMUNITY_Module 22|Module 22]]
- [[_COMMUNITY_Module 23|Module 23]]
- [[_COMMUNITY_Module 26|Module 26]]
- [[_COMMUNITY_Module 27|Module 27]]
- [[_COMMUNITY_Module 28|Module 28]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 46 edges
2. `logActivity()` - 33 edges
3. `supabaseAdmin` - 19 edges
4. `compilerOptions` - 16 edges
5. `cn()` - 15 edges
6. `getBranchFilter()` - 12 edges
7. `TechnoSys System Study Proposal` - 10 edges
8. `sendPushNotification()` - 8 edges
9. `SettingsPage()` - 7 edges
10. `createClient()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `TechnoSys Chapters 1-3 PDF` --conceptually_related_to--> `TechnoSys System Study Proposal`  [INFERRED]
  research/TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3.pdf → graphify-out/converted/TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3_0c7c8765.md
- `TechnoSys Project Document PDF` --conceptually_related_to--> `TechnoSys System Study Proposal`  [INFERRED]
  research/TECHNOCYCLE CORPORATION_TECHNOSYS_doc.pdf → graphify-out/converted/TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3_0c7c8765.md
- `TechnoSys Questionnaire Form PDF` --conceptually_related_to--> `TechnoSys System Study Proposal`  [INFERRED]
  research/TECHNOCYCLE CORPORATION_TECHNOSYS_QUESTIONNAIRE.pdf → graphify-out/converted/TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3_0c7c8765.md
- `Sandbox Setup Prompt` --conceptually_related_to--> `TechnoSys System Study Proposal`  [AMBIGUOUS]
  sandbox_setup_guide.md → graphify-out/converted/TECHNOCYCLE CORPORATION_TECHNOSYS_CHP1-3_0c7c8765.md
- `TechnoSys System Architecture` --conceptually_related_to--> `Statutory Payroll Compliance Engine`  [INFERRED]
  README.md → task.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Geofenced Attendance & Spoofing Protection Flow** — converted_technocycle_corporation_technosys_chp1_3_0c7c8765_geofenced_attendance, hris_admin_task_gps_spoofing_detection, hris_admin_task_interactive_geofence_map [INFERRED 0.85]
- **Philippine Statutory Payroll Compliance Engine** — hris_admin_task_statutory_payroll_engine, hris_admin_readme_rbac_separator, converted_technocycle_corporation_technosys_chp1_3_0c7c8765_proposal [INFERRED 0.85]
- **Offline-First Caching and Security Integration** — hris_admin_task_offline_queue_sync, hris_admin_task_secure_offline_auth, converted_technocycle_corporation_technosys_chp1_3_0c7c8765_proposal [INFERRED 0.85]

## Communities (29 total, 10 thin omitted)

### Community 0 - "Employee Management"
Cohesion: 0.09
Nodes (29): logActivity(), addManualDtrLog(), bulkRegisterEmployees(), ChecklistData, createAdmin(), deleteAdmin(), deleteTechnician(), employeeImportSchema (+21 more)

### Community 1 - "Announcements & Holidays"
Cohesion: 0.11
Nodes (19): createAnnouncement(), createHoliday(), deleteAnnouncement(), deleteHoliday(), getAnnouncements(), getHolidays(), createDocument(), deleteDocument() (+11 more)

### Community 2 - "Leaves & Payroll"
Cohesion: 0.14
Nodes (13): getLeaves(), LeaveRequest, updateLeaveStatus(), publishPayslip(), DashboardPage(), LeavesWorkspaceProps, LeavesPage(), getBranchFilter() (+5 more)

### Community 3 - "Authentication & Utilities"
Cohesion: 0.17
Nodes (14): cn(), login(), metadata, Button(), buttonVariants, Card(), CardAction(), CardContent() (+6 more)

### Community 4 - "Academic Thesis Frameworks"
Cohesion: 0.11
Nodes (23): Biometric Fingerprint Authentication, Geofenced Attendance Validation, Grönroos (2021) Citation, Information Systems Theory, ISO/IEC (2023) Citation, ISO/IEC 25010 Quality Model, Iterative SDLC Model, Laudon & Laudon (2022) Citation (+15 more)

### Community 5 - "Component Directories"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "Project Configuration"
Cohesion: 0.10
Nodes (20): devDependencies, eslint, eslint-config-next, pg, promptfoo, tailwindcss, @tailwindcss/postcss, @types/leaflet (+12 more)

### Community 7 - "Inventory Management"
Cohesion: 0.17
Nodes (15): bulkRegisterInventory(), createInventoryAudit(), createOrUpdateInventoryItem(), getInventoryAudits(), getInventoryItems(), getInventoryTransactions(), inventoryImportSchema, notifyLowStockAdmins() (+7 more)

### Community 8 - "TypeScript Settings"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @base-ui/react, class-variance-authority, clsx, dotenv, leaflet, lucide-react, next (+11 more)

### Community 10 - "Service Ticketing"
Cohesion: 0.18
Nodes (12): addTicketComment(), assignTicket(), getStaffList(), getTicketComments(), getTickets(), updateTicketStatus(), TicketsPage(), Comment (+4 more)

### Community 11 - "Activity Logging"
Cohesion: 0.19
Nodes (5): ActivityLog, getActivityLogs(), categoryConfig, DocumentsEditor(), createClient()

### Community 12 - "Geofencing & Locations"
Cohesion: 0.22
Nodes (8): getTechnicians(), addOfficeLocation(), getOfficeLocations(), toggleLocationActive(), EmployeesPage(), GeofenceMap, LocationSettingsProps, OfficeLocation

### Community 13 - "Statutory Compliance Settings"
Cohesion: 0.23
Nodes (6): updatePagibigRules(), updatePhilHealthRules(), PagibigRuleEditorProps, PhilHealthRuleEditorProps, PagibigRuleSchema, PhilHealthRuleSchema

### Community 14 - "AI Code Review Scripts"
Cohesion: 0.38
Nodes (6): filterDiff(), fs, main(), [owner, repo], path, postGlobalReview()

### Community 16 - "Module 16"
Cohesion: 0.40
Nodes (3): { chromium }, path, tasks

### Community 20 - "Module 20"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules, Developer Guidelines and Commands, Jira Headless API Client

## Ambiguous Edges - Review These
- `TechnoSys System Study Proposal` → `Sandbox Setup Prompt`  [AMBIGUOUS]
  sandbox_setup_guide.md · relation: conceptually_related_to

## Knowledge Gaps
- **129 isolated node(s):** `{ chromium }`, `path`, `tasks`, `$schema`, `style` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `TechnoSys System Study Proposal` and `Sandbox Setup Prompt`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `createClient()` connect `Announcements & Holidays` to `Employee Management`, `Leaves & Payroll`, `Authentication & Utilities`, `Inventory Management`, `Service Ticketing`, `Activity Logging`, `Geofencing & Locations`, `Statutory Compliance Settings`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `logActivity()` connect `Employee Management` to `Announcements & Holidays`, `Leaves & Payroll`, `Inventory Management`, `Service Ticketing`, `Activity Logging`, `Geofencing & Locations`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `supabaseAdmin` connect `Leaves & Payroll` to `Employee Management`, `Announcements & Holidays`, `Inventory Management`, `Service Ticketing`, `Geofencing & Locations`, `Statutory Compliance Settings`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `{ chromium }`, `path`, `tasks` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Employee Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09080841638981174 - nodes in this community are weakly interconnected._
- **Should `Announcements & Holidays` be split into smaller, more focused modules?**
  _Cohesion score 0.11174242424242424 - nodes in this community are weakly interconnected._