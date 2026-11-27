-- One concern = one ticket (27 Nov): forms no longer make a second "child" ticket linked to the Techy chat, so the
-- apps stop reading tickets.from_ticket_id. The one old child (a tool request, still open) is unlinked, not closed:
-- it stays a ticket of its own for the Coordinator, and its old chat shows as a plain Techy chat.
update public.tickets set from_ticket_id = null where from_ticket_id is not null;
