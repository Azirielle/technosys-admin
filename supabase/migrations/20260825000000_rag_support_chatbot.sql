-- Chunk 1.1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Chunk 1.2: Create document_chunks table schema
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a specialized HNSW index on the embedding column for lightning-fast vector search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Chunk 1.3: Create Postgres RPC match_documents
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
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

-- Chunk 1.4: Apply Row Level Security (RLS) policies
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow anyone (or authenticated users) to read the chunks via the RPC
CREATE POLICY "Allow authenticated users to read document chunks"
    ON public.document_chunks
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow service role (backend edge function) to insert/update chunks
CREATE POLICY "Allow service role to insert document chunks"
    ON public.document_chunks
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role to update document chunks"
    ON public.document_chunks
    FOR UPDATE
    TO service_role
    USING (true);