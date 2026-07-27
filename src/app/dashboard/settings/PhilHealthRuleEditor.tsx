"use client"
import { useState } from "react"
import { AlertCircle, ShieldCheck } from "lucide-react"
import { useAlertConfirm } from "@/components/ui/AlertConfirmProvider"
import { updatePhilHealthRules } from "@/app/actions/compliance"

interface PhilHealthRuleEditorProps {
  userRole?: string
}

export default function PhilHealthRuleEditor({ userRole }: PhilHealthRuleEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { alert } = useAlertConfirm();

  const isSuperAdmin = userRole === "super_admin"

  const handlePreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFormData(new FormData(e.currentTarget));
    setIsModalOpen(true);
  };

  const confirmAndSubmit = async () => {
    if (!formData) return;
    setIsPending(true);
    
    const result = await updatePhilHealthRules(formData);
    
    setIsPending(false);
    setIsModalOpen(false);
    
    if (result?.error) {
      setErrorMsg(result.error);
    } else {
      await alert("Statutory rules successfully updated. Payroll calculations will use these new bounds.", "Success", "success");
    }
  };

  return (
    <div className="mb-8">
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Validation Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              PhilHealth Contribution Rules
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Update the floor, ceiling, and percentage bounds.</p>
          </div>
        </div>
        
        <form onSubmit={handlePreSubmit} className="p-6 flex flex-col h-[calc(100%-86px)] justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Wage Floor (₱)</label>
              <input 
                type="number" 
                name="wageFloor" 
                defaultValue={10000}
                required
                disabled={!isSuperAdmin}
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Wage Ceiling (₱)</label>
              <input 
                type="number" 
                name="wageCeiling" 
                defaultValue={100000}
                required
                disabled={!isSuperAdmin}
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Total Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                name="totalRatePercentage" 
                defaultValue={5.0}
                required
                disabled={!isSuperAdmin}
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Employee Share (%)</label>
              <input 
                type="number" 
                step="0.1"
                name="employeeSharePercentage" 
                defaultValue={2.5}
                required
                disabled={!isSuperAdmin}
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
          </div>
          
          {isSuperAdmin && (
            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer">
                Save Active Rules
              </button>
            </div>
          )}
        </form>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-lg font-bold text-zinc-900">Critical System Impact</h2>
            </div>
            
            <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
              <strong>Warning:</strong> Altering these statutory rules will permanently change the calculation logic for all future payslips across the entire workforce. 
              <br/><br/>
              Do you wish to proceed?
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={confirmAndSubmit}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors flex items-center gap-2"
                disabled={isPending}
              >
                {isPending ? "Executing..." : "Yes, Update Rules"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
