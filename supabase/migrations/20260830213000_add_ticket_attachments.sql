ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS attachment_url TEXT;
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket_attachments', 'ticket_attachments', true) ON CONFLICT (id) DO NOTHING;
