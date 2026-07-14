CREATE TABLE role_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    granted_role TEXT NOT NULL,
    granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE role_overrides ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON role_overrides
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert for ceo and super_admin
CREATE POLICY "Enable insert for ceo and super_admin" ON role_overrides
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ceo', 'super_admin')
        )
    );

-- Allow delete for ceo and super_admin
CREATE POLICY "Enable delete for ceo and super_admin" ON role_overrides
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ceo', 'super_admin')
        )
    );
