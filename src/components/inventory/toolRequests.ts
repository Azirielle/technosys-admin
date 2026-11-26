// Tool requests from the phone ("Tool request" tickets, prof 20 Nov: requesting a tool is a ticket, the Coordinator
// still decides). Reads the lines the phone wrote ("Tool: …", "How many: …", "Needed on: …", "Why: …").
export type ToolRequest = {
  id: string; from_ticket_id: string | null; employee_id: string; person: string; created_at: string
  tool: string; howMany: number; neededOn: string | null; why: string | null
  /** The technician's choice (phone, C5): picks up at the office or the driver delivers */
  delivery: 'pickup' | 'driver'
}
type Row = { id: string; from_ticket_id: string | null; employee_id: string; description: string; created_at: string; profiles: { full_name: string } | null }

const line = (text: string, label: string) => text.split('\n').find((l) => l.startsWith(`${label}: `))?.slice(label.length + 2) ?? null

export function toRequest(r: Row): ToolRequest {
  return {
    id: r.id, from_ticket_id: r.from_ticket_id, employee_id: r.employee_id, person: r.profiles?.full_name ?? 'Someone', created_at: r.created_at,
    tool: line(r.description, 'Tool') ?? '?', howMany: Number(line(r.description, 'How many')) || 1,
    neededOn: line(r.description, 'Needed on'), why: line(r.description, 'Why'), delivery: line(r.description, 'Delivery') === 'driver' ? 'driver' : 'pickup',
  }
}

/** The query for open requests (newest last, first come first served). */
export const REQUEST_FIELDS = 'id, from_ticket_id, employee_id, description, created_at, profiles!tickets_employee_id_fkey(full_name)'
