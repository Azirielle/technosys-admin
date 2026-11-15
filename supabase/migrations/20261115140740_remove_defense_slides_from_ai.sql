-- The AI assistant answered technicians partly from the proposal-defense slides, which describe payroll
-- (removed after the defense). Remove those passages; the PDF moved to docs/archive so ingest.ts won't re-add it.
delete from public.document_chunks where document_id = 'Research Defense PPT.pdf';
