-- Link tickets to the Techy AI chat they were filed from (M2).
-- When an employee files a DTR issue or tool problem from Techy's suggestions, from_ticket_id points
-- to that Techy conversation so HR sees one unified thread, and HR replies route back to the employee's chat.
alter table public.tickets
  add column if not exists from_ticket_id uuid references public.tickets(id) on delete set null;

create index if not exists idx_tickets_from_ticket_id on public.tickets(from_ticket_id);
