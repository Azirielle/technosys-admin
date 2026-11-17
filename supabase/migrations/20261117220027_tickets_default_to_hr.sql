-- Tickets from plain forms (DTR "Ask HR about this day", tool problem reports) are for HR, not the AI. Only the AI
-- Support chat sets handling_mode = 'AI' itself, so the default becomes 'ADMIN' (shown as "HR is answering").
alter table public.tickets alter column handling_mode set default 'ADMIN';
