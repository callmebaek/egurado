-- Create target_keywords_history table
CREATE TABLE IF NOT EXISTS public.target_keywords_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    
    -- Input parameters
    regions JSONB NOT NULL DEFAULT '[]'::jsonb,
    landmarks JSONB DEFAULT '[]'::jsonb,
    menus JSONB NOT NULL DEFAULT '[]'::jsonb,
    industries JSONB NOT NULL DEFAULT '[]'::jsonb,
    other_keywords JSONB DEFAULT '[]'::jsonb,
    
    -- Results
    extracted_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_keywords INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_total_keywords CHECK (total_keywords >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_target_keywords_history_user_id 
    ON public.target_keywords_history(user_id);

CREATE INDEX IF NOT EXISTS idx_target_keywords_history_store_id 
    ON public.target_keywords_history(store_id);

CREATE INDEX IF NOT EXISTS idx_target_keywords_history_created_at 
    ON public.target_keywords_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_target_keywords_history_user_store 
    ON public.target_keywords_history(user_id, store_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.target_keywords_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own history
CREATE POLICY "Users can view their own target keywords history"
    ON public.target_keywords_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert their own target keywords history"
    ON public.target_keywords_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete their own target keywords history"
    ON public.target_keywords_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.target_keywords_history TO authenticated;

-- Add comment
COMMENT ON TABLE public.target_keywords_history IS 'Stores history of target keyword extractions (max 10 per store)';
