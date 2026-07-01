"use server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { verifyRoleAccess } from "@/lib/permissions"
import { logActivity } from "./activity"
import { calculatePayrollDeductions } from "@/lib/ph-taxes"


export async function publishPayslip(data: any) {
  try {
    const { authorized } = await verifyRoleAccess('payroll', true)
    if (!authorized) {
      return { error: "Unauthorized. You do not have permissions to publish payslips." }
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabaseAdmin.from('payslips').insert({
      technician_id: data.technician_id,
      period_start: today,
      period_end: today,
      gross_pay: data.gross_pay,
      sss_deduction: data.sss_deduction,
      philhealth_deduction: data.philhealth_deduction,
      pagibig_deduction: data.pagibig_deduction,
      allowances: data.allowances || 0,
      net_pay: data.net_pay,
      status: 'published'
    })

    if (error) {
      if (error.message?.includes('allowances') || error.message?.includes('column')) {
        console.warn("Staging DB missing 'allowances' column. Retrying insert without it...");
        const { error: retryError } = await supabaseAdmin.from('payslips').insert({
          technician_id: data.technician_id,
          period_start: today,
          period_end: today,
          gross_pay: data.gross_pay,
          sss_deduction: data.sss_deduction,
          philhealth_deduction: data.philhealth_deduction,
          pagibig_deduction: data.pagibig_deduction,
          net_pay: data.net_pay,
          status: 'published'
        })
        if (retryError) throw retryError
      } else {
        throw error
      }
    }

    const { data: techProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', data.technician_id).single()
    const techName = techProfile?.full_name || data.technician_id
    await logActivity({
      category: 'payroll',
      action: 'published',
      description: `Published payslip for ${techName} with Net Pay of ₱${Number(data.net_pay).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    })

    revalidatePath("/dashboard/payroll")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to publish payslip:", err.message || err)
    return { error: err.message || "Failed to publish payslip." }
  }
}

export async function getDraftPayroll(startDateStr?: string, endDateStr?: string) {
  try {
    const { authorized } = await verifyRoleAccess('payroll', false)
    if (!authorized) return { error: "Unauthorized access to payroll compilation." }

    // Parse dates (defaulting to current cutoff)
    const now = new Date()
    const start = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate() <= 15 ? 1 : 16)
    start.setHours(0,0,0,0)
    const end = endDateStr ? new Date(endDateStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate() <= 15 ? 10 : 25)
    end.setHours(23,59,59,999)

    // Fetch technicians
    const { data: technicians, error: techErr } = await supabaseAdmin.from('profiles').select('*').eq('role', 'technician').order('full_name')
    if (techErr) throw techErr

    // Fetch logs, schedules, leaves, and holidays
    const { data: logs } = await supabaseAdmin.from('time_logs').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    const { data: scheds } = await supabaseAdmin.from('schedules').select('*')
    const { data: leaves } = await supabaseAdmin.from('leaves').select('*').eq('status', 'approved')
    const { data: holidays } = await supabaseAdmin.from('holidays').select('*').eq('is_active', true)

    const holidayMap = new Map((holidays || []).map(h => [h.holiday_date, Number(h.multiplier || 1.3)]))

    const payrollList = await Promise.all((technicians || []).map(async (emp) => {
      const empLogs = (logs || []).filter(l => l.technician_id === emp.id)
      const hasOpenLogs = empLogs.some(log => log.app_time_in && !log.app_time_out)

      // 1. Calculate regular hours capped at 8 per daily time log
      let regularHours = 0
      let weightedHours = 0
      const clockedInDates = new Set<string>()

      empLogs.forEach(log => {
        const rawHours = Number(log.total_hours || 0)
        const cappedHours = Math.min(8, rawHours)
        regularHours += cappedHours

        if (log.app_time_in) {
          const dateStr = log.app_time_in.split('T')[0]
          clockedInDates.add(dateStr)
          const multiplier = holidayMap.get(dateStr) || 1.0
          weightedHours += cappedHours * multiplier
        } else {
          weightedHours += cappedHours
        }
      })

      // 2. Fetch approved paid/unpaid leaves in the cutoff range
      let paidLeaveDays = 0
      let unpaidLeaveDays = 0
      const empLeaves = (leaves || []).filter(l => l.technician_id === emp.id)

      empLeaves.forEach(leave => {
        const lStart = new Date(leave.start_date)
        const lEnd = new Date(leave.end_date)
        const curr = new Date(lStart)
        while (curr <= lEnd) {
          if (curr >= start && curr <= end) {
            if (leave.leave_type === 'unpaid') unpaidLeaveDays++
            else paidLeaveDays++
          }
          curr.setDate(curr.getDate() + 1)
        }
      })

      const paidLeaveHours = paidLeaveDays * 8
      const unpaidLeaveHours = unpaidLeaveDays * 8
      const totalHours = regularHours + paidLeaveHours

      // 3. Compute default allowances based on schedules
      let defaultAllowances = 0
      const activeScheds = (scheds || []).filter(s => s.technician_id === emp.id)

      const currDay = new Date(start)
      while (currDay <= end) {
        const dateStr = currDay.toISOString().split('T')[0]
        const daySched = activeScheds.find(s => {
          const sStart = new Date(s.start_time)
          sStart.setHours(0,0,0,0)
          const sEnd = s.end_time ? new Date(s.end_time) : sStart
          sEnd.setHours(0,0,0,0)
          const cTime = currDay.getTime()
          return cTime >= sStart.getTime() && cTime <= sEnd.getTime()
        })

        if (daySched) {
          const mode = daySched.attendance_mode
          const rate = daySched.allowance_rate !== undefined ? Number(daySched.allowance_rate || 0) : (mode === 'direct_dispatch' ? 200 : mode === 'out_of_town' ? 500 : 0)
          if (mode === 'direct_dispatch') {
            if (clockedInDates.has(dateStr)) defaultAllowances += rate
          } else if (mode === 'out_of_town') {
            const isOnLeave = empLeaves.some(l => {
              const ls = new Date(l.start_date)
              ls.setHours(0,0,0,0)
              const le = new Date(l.end_date)
              le.setHours(0,0,0,0)
              const ct = currDay.getTime()
              return ct >= ls.getTime() && ct <= le.getTime()
            })
            if (!isOnLeave) defaultAllowances += rate
          }
        }
        currDay.setDate(currDay.getDate() + 1)
      }

      // 4. Compute gross pay based on standard 160 hours/month rate
      const hourlyRate = Number(emp.base_salary || 0) / 160
      const computedGross = Number((hourlyRate * (weightedHours + paidLeaveHours)).toFixed(2))

      // Get calculations using ph-taxes
      const calc = await calculatePayrollDeductions(emp.id, computedGross, end)

      return {
        technician: emp,
        workedHours: Number(regularHours.toFixed(2)),
        paidLeaveDays,
        unpaidLeaveDays,
        paidLeaveHours,
        unpaidLeaveHours,
        totalHours: Number(totalHours.toFixed(2)),
        hasOpenLogs,
        defaultAllowances,
        hourlyRate,
        calculation: calc
      }
    }))

    return { success: true, payrolls: payrollList, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }
  } catch (err: any) {
    console.error("Failed to compile draft payroll:", err.message)
    return { error: err.message || "Failed to compile draft payroll." }
  }
}

