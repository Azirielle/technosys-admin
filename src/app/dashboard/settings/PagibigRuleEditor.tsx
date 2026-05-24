"use client"
import { useState } from "react"
import { AlertCircle, ShieldCheck } from "lucide-react"
import { updatePagibigRules } from "@/app/actions/compliance"

export default function PagibigRuleEditor() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePreSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFormData(new FormData(e.currentTarget));
    setIsModalOpen(true);
  };

  const confirmAndSubmit = async () => {
    if (!formData) return;
    setIsPending(true);
    
    const result = await updatePagibigRules(formData);
    
    setIsPending(false);
    setIsModalOpen(false);
    
    if (result?.error) {
      setErrorMsg(result.error);
    } else {
      alert("Pag-IBIG statutory rules successfully updated.");
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

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Pag-IBIG Contribution Rules
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Update the maximum fund salary and deduction bounds.</p>
          </div>
        </div>
        
        <form onSubmit={handlePreSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Maximum Fund Salary (₱)</label>
              <input 
                type="number" 
                name="maxCompensation" 
                defaultValue={10000}
                required
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Maximum Employee Deduction (₱)</label>
              <input 
                type="number" 
                name="employeeShare" 
                defaultValue={200}
                required
                className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              Save Active Rules
            </button>
          </div>
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
