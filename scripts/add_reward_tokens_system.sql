-- Add reward tokens system to the database

-- Create reward_tokens table to track patient tokens
CREATE TABLE IF NOT EXISTS reward_tokens (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tokens_earned INTEGER NOT NULL DEFAULT 0,
    tokens_spent INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create token_transactions table to track individual token awards/spending
CREATE TABLE IF NOT EXISTS token_transactions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent')),
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'appointment', 'video_upload', 'daily_checkin', etc.
    source_id INTEGER, -- ID of the related record (appointment_id, video_id, etc.)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rewards_catalog table for available rewards
CREATE TABLE IF NOT EXISTS rewards_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cost_tokens INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'privilege', 'item', 'experience', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create patient_rewards table to track redeemed rewards
CREATE TABLE IF NOT EXISTS patient_rewards (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reward_id INTEGER NOT NULL REFERENCES rewards_catalog(id),
    tokens_spent INTEGER NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired'))
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reward_tokens_updated_at BEFORE UPDATE ON reward_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample rewards
INSERT INTO rewards_catalog (name, description, cost_tokens, category) VALUES
('Extra Therapy Session', 'Schedule an additional therapy session this week', 50, 'privilege'),
('Comfort Item Request', 'Request a personal comfort item for your room', 25, 'item'),
('Extended Visiting Hours', 'Enjoy extended visiting hours for family/friends', 30, 'privilege'),
('Healthy Snack Pack', 'Receive a selection of healthy snacks', 15, 'item'),
('Music Therapy Session', 'Participate in a special music therapy session', 40, 'experience'),
('Art Supplies Kit', 'Get art supplies for creative expression', 20, 'item'),
('Outdoor Activity Time', 'Extra time for outdoor activities and fresh air', 35, 'privilege'),
('Meditation Session', 'Private guided meditation session', 25, 'experience');

-- Function to award tokens
CREATE OR REPLACE FUNCTION award_tokens(
    p_patient_id INTEGER,
    p_amount INTEGER,
    p_reason VARCHAR(100),
    p_source_type VARCHAR(50),
    p_source_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    current_total INTEGER;
    new_level INTEGER;
BEGIN
    -- Insert transaction record
    INSERT INTO token_transactions (patient_id, transaction_type, amount, reason, source_type, source_id, description)
    VALUES (p_patient_id, 'earned', p_amount, p_reason, p_source_type, p_source_id, p_description);
    
    -- Update or create reward_tokens record
    INSERT INTO reward_tokens (patient_id, tokens_earned, total_tokens)
    VALUES (p_patient_id, p_amount, p_amount)
    ON CONFLICT (patient_id) DO UPDATE SET
        tokens_earned = reward_tokens.tokens_earned + p_amount,
        total_tokens = reward_tokens.total_tokens + p_amount;
    
    -- Calculate new level (every 100 tokens = 1 level)
    SELECT total_tokens INTO current_total FROM reward_tokens WHERE patient_id = p_patient_id;
    new_level := GREATEST(1, current_total / 100 + 1);
    
    UPDATE reward_tokens SET level = new_level WHERE patient_id = p_patient_id;
END;
$$ LANGUAGE plpgsql;

-- Function to spend tokens
CREATE OR REPLACE FUNCTION spend_tokens(
    p_patient_id INTEGER,
    p_amount INTEGER,
    p_reason VARCHAR(100),
    p_reward_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    available_tokens INTEGER;
BEGIN
    -- Check available tokens
    SELECT (total_tokens - tokens_spent) INTO available_tokens 
    FROM reward_tokens WHERE patient_id = p_patient_id;
    
    IF available_tokens IS NULL OR available_tokens < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Insert transaction record
    INSERT INTO token_transactions (patient_id, transaction_type, amount, reason, source_type, source_id)
    VALUES (p_patient_id, 'spent', p_amount, p_reason, 'reward_redemption', p_reward_id);
    
    -- Update tokens_spent
    UPDATE reward_tokens SET tokens_spent = tokens_spent + p_amount WHERE patient_id = p_patient_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
