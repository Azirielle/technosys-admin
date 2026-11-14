-- Admin alerts for new tickets and leaves went to a Telegram bot (edge function notify_admins).
-- Ticketing notifications will go through SMS instead, so the Telegram webhooks are removed.
drop trigger if exists notify_admins_tickets on public.tickets;
drop trigger if exists notify_admins_leaves on public.leaves;
