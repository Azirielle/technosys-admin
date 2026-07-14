"use client"

import { useState } from "react"
import { MapPin, Scale, Calendar, Shield, AlertCircle } from "lucide-react"

import LocationSettings from "./LocationSettings"
import PhilHealthRuleEditor from "./PhilHealthRuleEditor"
import PagibigRuleEditor from "./PagibigRuleEditor"
import SssDataTable from "./SssDataTable"
import AnnouncementsEditor from "./AnnouncementsEditor"
import HolidaysEditor from "./HolidaysEditor"
import DocumentsEditor from "./DocumentsEditor"
import AdminAccounts from "./AdminAccounts"
import CeoOverrides from "./CeoOverrides"
import DeletionQueue from "./DeletionQueue"

interface SettingsClientProps {
  locations: any[]
  sssBrackets: any[]
  announcementsList: any[]
  holidaysList: any[]
  adminsList: any[]
  documentsList: any[]
  userRole: string
  activeOverrides: any[]
  deletionRequests: any[]
}

export default function SettingsClient({
  locations,
  sssBrackets,
  announcementsList,
  holidaysList,
  adminsList,
  documentsList,
  userRole,
  activeOverrides,
  deletionRequests
}: SettingsClientProps) {
  const isSuperAdmin = userRole === "super_admin"
  const isCeo = userRole === "ceo"

  // Define navigational tabs
  const tabs = [
    {
      id: "geofence",
      label: "Branch Geofencing",
      icon: MapPin,
      description: "Manage branch geofencing parameters"
    },
    {
      id: "compliance",
      label: "Statutory Compliance",
      icon: Scale,
      description: "PhilHealth, Pag-IBIG & SSS rules"
    },
    {
      id: "comms",
      label: "Holidays & Comms",
      icon: Calendar,
      description: "Announcements, holidays & document forms"
    },
    ...(isSuperAdmin
      ? [
          {
            id: "access",
            label: "Access Control",
            icon: Shield,
            description: "Super Admin account management"
          }
        ]
      : []),
    ...(isSuperAdmin || isCeo
      ? [
          {
            id: "overrides",
            label: "CEO Overrides",
            icon: Shield,
            description: "Temporary role transfers"
          },
          {
            id: "deletions",
            label: "Deletion Queue",
            icon: Shield,
            description: "Review delete requests"
          }
        ]
      : [])
  ]

  const [activeTab, setActiveTab] = useState<string>("geofence")

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage branch geofencing parameters, statutory payroll rules, and system access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Column - Tab Menu */}
        <div className="md:col-span-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 outline-none ${
                  isActive
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-md translate-x-1"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 hover:translate-x-1 hover:shadow-sm"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                <div>
                  <div className="font-semibold text-sm leading-tight">{tab.label}</div>
                  <div className={`text-[11px] mt-0.5 leading-snug ${isActive ? "text-zinc-400" : "text-zinc-500"}`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right Column - Tab Panel */}
        <div className="md:col-span-3">
          <div className="bg-zinc-50/50 rounded-2xl border border-zinc-200 p-6 shadow-sm min-h-[500px] transition-all duration-300">
            {/* Warning Banner for Read-Only Admin Role */}
            {!isSuperAdmin && (
              <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Read-Only Mode Active</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Standard Admin Access: Settings modifications are locked. Contact a Super Administrator to make changes.
                  </p>
                </div>
              </div>
            )}

            {/* Active Workspace Panes */}
            {activeTab === "geofence" && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    📍 Geofence Configuration
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Specify operational bounds and coordinate triggers for each company branch.</p>
                </div>
                <LocationSettings initialLocations={locations || []} userRole={userRole} />
              </div>
            )}

            {activeTab === "compliance" && (
              <div className="space-y-8">
                <div className="border-b border-zinc-200 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    ⚖️ Statutory Compliance Settings
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure statutory tax rates, contribution limits, and government brackets.</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <PhilHealthRuleEditor userRole={userRole} />
                  <PagibigRuleEditor userRole={userRole} />
                </div>
                <div className="pt-6 border-t border-zinc-200">
                  <SssDataTable initialData={sssBrackets || []} userRole={userRole} />
                </div>
              </div>
            )}

            {activeTab === "comms" && (
              <div className="space-y-10">
                <div className="border-b border-zinc-200 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    📅 Holidays & Company Communications
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Publish announcements, manage regional holiday multipliers, and template documents.</p>
                </div>
                
                <section className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-800 mb-6 flex items-center gap-2">
                    📢 Company Announcements Board
                  </h3>
                  <AnnouncementsEditor
                    initialAnnouncements={announcementsList}
                    officeLocations={locations || []}
                    userRole={userRole}
                  />
                </section>

                <section className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-800 mb-6 flex items-center gap-2">
                    📅 Holidays & Salary Multipliers
                  </h3>
                  <HolidaysEditor
                    initialHolidays={holidaysList}
                    userRole={userRole}
                  />
                </section>

                <section className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-800 mb-6 flex items-center gap-2">
                    📂 Company Documents & Forms Management
                  </h3>
                  <DocumentsEditor
                    initialDocuments={documentsList}
                    officeLocations={locations || []}
                    userRole={userRole}
                  />
                </section>
              </div>
            )}

            {activeTab === "access" && isSuperAdmin && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-4 mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    🛡️ Administrative Access Management
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Control administrative credentials and privilege assignments.</p>
                </div>
                <AdminAccounts initialAdmins={adminsList} />
              </div>
            )}

            {activeTab === "overrides" && (isSuperAdmin || isCeo) && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards">
                <CeoOverrides adminsList={adminsList} activeOverrides={activeOverrides} />
              </div>
            )}

            {activeTab === "deletions" && (isSuperAdmin || isCeo) && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards">
                <DeletionQueue deletionRequests={deletionRequests} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
