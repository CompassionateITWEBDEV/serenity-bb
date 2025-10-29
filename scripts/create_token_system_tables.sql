-- Create token_transactions table for tracking token transactions
-- patient_id stores the auth.users UUID directly (matching auth.uid())
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'bonus', 'penalty', 'refund'
    amount INTEGER NOT NULL, -- positive for earned, negative for spent
    reason VARCHAR(255) NOT NULL, -- description of why tokens were earned/spent
    metadata JSONB DEFAULT '{}', -- additional data about the transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_transactions_patient_id ON token_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);

-- Create reward_tokens table for tracking patient token balances
-- patient_id stores the auth.users UUID directly (matching auth.uid())
CREATE TABLE IF NOT EXISTS reward_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_earned INTEGER DEFAULT 0 NOT NULL,
    tokens_spent INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL, -- tokens_earned - tokens_spent
    level INTEGER DEFAULT 1 NOT NULL, -- current level based on total tokens
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for reward_tokens
CREATE INDEX IF NOT EXISTS idx_reward_tokens_patient_id ON reward_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_reward_tokens_total_tokens ON reward_tokens(total_tokens);

-- Enable Row Level Security
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_transactions
CREATE POLICY "Patients can view their own token transactions"
    ON token_transactions FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert their own token transactions"
    ON token_transactions FOR INSERT
    WITH CHECK (patient_id = auth.uid());

-- RLS Policies for reward_tokens
CREATE POLICY "Patients can view their own reward tokens"
    ON reward_tokens FOR SELECT
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can update their own reward tokens"
    ON reward_tokens FOR UPDATE
    USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert their own reward tokens"
    ON reward_tokens FOR INSERT
    WITH CHECK (patient_id = auth.uid());

-- Staff can view all token data (adjust as needed)
CREATE POLICY "Staff can view all token transactions"
    ON token_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all reward tokens"
    ON reward_tokens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff
            WHERE staff.user_id = auth.uid()
        )
    );

-- Function to automatically update total_tokens when transactions are inserted
CREATE OR REPLACE FUNCTION update_reward_tokens()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO reward_tokens (patient_id, tokens_earned, tokens_spent, total_tokens, last_updated)
    VALUES (
        NEW.patient_id,
        CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        NEW.amount,
        NOW()
    )
    ON CONFLICT (patient_id) DO UPDATE SET
        tokens_earned = reward_tokens.tokens_earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
        tokens_spent = reward_tokens.tokens_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        total_tokens = reward_tokens.total_tokens + NEW.amount,
        level = GREATEST(1, FLOOR((reward_tokens.total_tokens + NEW.amount) / 100) + 1),
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reward_tokens when a transaction is created
CREATE TRIGGER trigger_update_reward_tokens
    AFTER INSERT ON token_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_tokens();

-- Enable Realtime for both tables
-- Note: If you get an error that the table is already in publication, that's fine - just continue
ALTER PUBLICATION supabase_realtime ADD TABLE token_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE reward_tokens;

