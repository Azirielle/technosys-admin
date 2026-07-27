import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyRoleAccess } from "@/lib/permissions"
import PayrollClient from "./PayrollClient"
import { getDraftPayroll } from "@/app/actions/payroll"

export const revalidate = 0; // Ensure fresh data on load

export default async function PayrollPage(props: { searchParams?: Promise<{ startDate?: string; endDate?: string }> | { startDate?: string; endDate?: string } }) {
  const resolvedParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams
  const startDateStr = resolvedParams?.startDate
  const endDateStr = resolvedParams?.endDate

  const result = await getDraftPayroll(startDateStr, endDateStr)
  if ('error' in result) {
    return (
      <div className="p-8">
        <p className="text-rose-500 font-bold">Error loading payroll: {result.error}</p>
      </div>
    )
  }

  // Fetch published payslips to determine status within the selected date range
  const { data: payslips } = await supabaseAdmin
    .from('payslips')
    .select('*')
    .eq('status', 'published')
    .gte('period_start', result.startDate)
    .lte('period_end', result.endDate)

  const { authorized: isWriteAllowed } = await verifyRoleAccess('payroll', true)

  return (
    <PayrollClient 
      technicians={result.payrolls.map(p => p.technician)} 
      publishedPayslips={payslips || []} 
      payrolls={result.payrolls} 
      isWriteAllowed={isWriteAllowed}
      defaultStartDate={result.startDate}
      defaultEndDate={result.endDate}
    />
  )
}

