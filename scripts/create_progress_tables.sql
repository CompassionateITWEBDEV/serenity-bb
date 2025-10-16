-- Create progress tracking tables for Serenity Rehabilitation Center

-- Enable RLS on all tables
ALTER TABLE IF EXISTS progress_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_checkins ENABLE ROW LEVEL SECURITY;

-- 1. Progress Overview Table
CREATE TABLE IF NOT EXISTS progress_overview (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Weekly Goals Table
CREATE TABLE IF NOT EXISTS weekly_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    current INTEGER DEFAULT 0 CHECK (current >= 0),
    target INTEGER NOT NULL CHECK (target > 0),
    completed BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'minor' CHECK (type IN ('major', 'minor')),
    reward TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Progress Metrics Table
CREATE TABLE IF NOT EXISTS progress_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value TEXT NOT NULL,
    change TEXT DEFAULT '0',
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    icon TEXT DEFAULT 'trending-up',
    color TEXT DEFAULT 'text-gray-600',
    bgcolor TEXT DEFAULT 'bg-gray-100',
    category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Weekly Data Table
CREATE TABLE IF NOT EXISTS weekly_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week DATE NOT NULL,
    wellness INTEGER DEFAULT 0 CHECK (wellness >= 0 AND wellness <= 10),
    attendance INTEGER DEFAULT 0 CHECK (attendance >= 0 AND attendance <= 100),
    goals INTEGER DEFAULT 0 CHECK (goals >= 0 AND goals <= 100),
    mood INTEGER DEFAULT 0 CHECK (mood >= 0 AND mood <= 10),
    energy INTEGER DEFAULT 0 CHECK (energy >= 0 AND energy <= 10),
    sleep INTEGER DEFAULT 0 CHECK (sleep >= 0 AND sleep <= 24),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, week)
);

-- 6. Daily Check-ins Table
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood INTEGER DEFAULT 0 CHECK (mood >= 0 AND mood <= 10),
    energy INTEGER DEFAULT 0 CHECK (energy >= 0 AND energy <= 10),
    sleep INTEGER DEFAULT 0 CHECK (sleep >= 0 AND sleep <= 24),
    stress INTEGER DEFAULT 0 CHECK (stress >= 0 AND stress <= 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_overview_patient_id ON progress_overview(patient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_patient_id ON weekly_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_created_at ON weekly_goals(created_at);
CREATE INDEX IF NOT EXISTS idx_milestones_patient_id ON milestones(patient_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_patient_id ON progress_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_created_at ON progress_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_data_patient_id ON weekly_data(patient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_data_week ON weekly_data(week);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_id ON daily_checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(date);

-- RLS Policies for progress_overview
DROP POLICY IF EXISTS "Users can view own progress overview" ON progress_overview;
CREATE POLICY "Users can view own progress overview" ON progress_overview
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own progress overview" ON progress_overview;
CREATE POLICY "Users can insert own progress overview" ON progress_overview
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own progress overview" ON progress_overview;
CREATE POLICY "Users can update own progress overview" ON progress_overview
    FOR UPDATE USING (auth.uid() = patient_id);

-- RLS Policies for weekly_goals
DROP POLICY IF EXISTS "Users can view own weekly goals" ON weekly_goals;
CREATE POLICY "Users can view own weekly goals" ON weekly_goals
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own weekly goals" ON weekly_goals;
CREATE POLICY "Users can insert own weekly goals" ON weekly_goals
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own weekly goals" ON weekly_goals;
CREATE POLICY "Users can update own weekly goals" ON weekly_goals
    FOR UPDATE USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can delete own weekly goals" ON weekly_goals;
CREATE POLICY "Users can delete own weekly goals" ON weekly_goals
    FOR DELETE USING (auth.uid() = patient_id);

-- RLS Policies for milestones
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own milestones" ON milestones;
CREATE POLICY "Users can insert own milestones" ON milestones
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
CREATE POLICY "Users can update own milestones" ON milestones
    FOR UPDATE USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;
CREATE POLICY "Users can delete own milestones" ON milestones
    FOR DELETE USING (auth.uid() = patient_id);

-- RLS Policies for progress_metrics
DROP POLICY IF EXISTS "Users can view own progress metrics" ON progress_metrics;
CREATE POLICY "Users can view own progress metrics" ON progress_metrics
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own progress metrics" ON progress_metrics;
CREATE POLICY "Users can insert own progress metrics" ON progress_metrics
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own progress metrics" ON progress_metrics;
CREATE POLICY "Users can update own progress metrics" ON progress_metrics
    FOR UPDATE USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can delete own progress metrics" ON progress_metrics;
CREATE POLICY "Users can delete own progress metrics" ON progress_metrics
    FOR DELETE USING (auth.uid() = patient_id);

-- RLS Policies for weekly_data
DROP POLICY IF EXISTS "Users can view own weekly data" ON weekly_data;
CREATE POLICY "Users can view own weekly data" ON weekly_data
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own weekly data" ON weekly_data;
CREATE POLICY "Users can insert own weekly data" ON weekly_data
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own weekly data" ON weekly_data;
CREATE POLICY "Users can update own weekly data" ON weekly_data
    FOR UPDATE USING (auth.uid() = patient_id);

-- RLS Policies for daily_checkins
DROP POLICY IF EXISTS "Users can view own daily checkins" ON daily_checkins;
CREATE POLICY "Users can view own daily checkins" ON daily_checkins
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can insert own daily checkins" ON daily_checkins;
CREATE POLICY "Users can insert own daily checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own daily checkins" ON daily_checkins;
CREATE POLICY "Users can update own daily checkins" ON daily_checkins
    FOR UPDATE USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can delete own daily checkins" ON daily_checkins;
CREATE POLICY "Users can delete own daily checkins" ON daily_checkins
    FOR DELETE USING (auth.uid() = patient_id);

-- Insert some sample data for testing
INSERT INTO progress_overview (patient_id, overall_progress) 
SELECT auth.uid(), 0 
WHERE auth.uid() IS NOT NULL 
ON CONFLICT (patient_id) DO NOTHING;

-- Insert sample weekly goals
INSERT INTO weekly_goals (patient_id, name, description, target, category, priority)
SELECT 
    auth.uid(),
    'Complete 3 therapy sessions',
    'Attend all scheduled therapy sessions this week',
    3,
    'therapy',
    'high'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO weekly_goals (patient_id, name, description, target, category, priority)
SELECT 
    auth.uid(),
    'Practice mindfulness for 15 minutes daily',
    'Spend 15 minutes each day on mindfulness exercises',
    7,
    'mindfulness',
    'medium'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert sample milestones
INSERT INTO milestones (patient_id, name, description, date, type, reward)
SELECT 
    auth.uid(),
    'First Week Complete',
    'Successfully completed your first week of treatment',
    CURRENT_DATE + INTERVAL '7 days',
    'major',
    'Certificate of Achievement'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO milestones (patient_id, name, description, date, type)
SELECT 
    auth.uid(),
    'First Therapy Session',
    'Attended your first individual therapy session',
    CURRENT_DATE + INTERVAL '1 day',
    'minor'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert sample progress metrics
INSERT INTO progress_metrics (patient_id, title, value, change, trend, icon, color, bgcolor, category)
SELECT 
    auth.uid(),
    'Therapy Sessions',
    '0',
    '+0',
    'stable',
    'calendar',
    'text-blue-600',
    'bg-blue-100',
    'attendance'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO progress_metrics (patient_id, title, value, change, trend, icon, color, bgcolor, category)
SELECT 
    auth.uid(),
    'Wellness Score',
    '0/10',
    '+0',
    'stable',
    'heart',
    'text-green-600',
    'bg-green-100',
    'wellness'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert sample weekly data
INSERT INTO weekly_data (patient_id, week, wellness, attendance, goals, mood, energy, sleep)
SELECT 
    auth.uid(),
    CURRENT_DATE - INTERVAL '1 week',
    7,
    85,
    60,
    6,
    7,
    8
WHERE auth.uid() IS NOT NULL
ON CONFLICT (patient_id, week) DO NOTHING;

-- Insert sample daily check-in
INSERT INTO daily_checkins (patient_id, date, mood, energy, sleep, stress, notes)
SELECT 
    auth.uid(),
    CURRENT_DATE - INTERVAL '1 day',
    7,
    6,
    7,
    4,
    'Feeling good today, had a productive therapy session'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (patient_id, date) DO NOTHING;

