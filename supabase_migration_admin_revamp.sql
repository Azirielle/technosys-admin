ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS handling_mode text DEFAULT 'AI';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS admin_summary text;

ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS sender_role text DEFAULT 'technician';
ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;
