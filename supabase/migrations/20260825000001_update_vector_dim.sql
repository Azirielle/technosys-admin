-- Drop the index and the table, then recreate with 384 dimensions for local transformers
DROP TABLE IF EXISTS public.document_chunks;

CREATE TABLE public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(384) NOT NULL, -- Changed to 384 for local Xenova/all-MiniLM-L6-v2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks
USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read document chunks"
    ON public.document_chunks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert document chunks"
    ON public.document_chunks FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update document chunks"
    ON public.document_chunks FOR UPDATE TO service_role USING (true);

-- Also update the RPC function to accept 384 dimensions
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id UUID,
    document_id TEXT,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.document_id,
        document_chunks.content,
        document_chunks.metadata,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE document_chunks.metadata @> filter
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;