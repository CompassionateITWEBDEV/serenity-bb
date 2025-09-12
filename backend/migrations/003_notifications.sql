CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
