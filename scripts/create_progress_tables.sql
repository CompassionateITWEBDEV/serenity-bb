-- Create progress tracking tables for Serenity Rehabilitation Center
-- This script is safe to run multiple times and handles existing tables gracefully

-- Enable RLS on all tables (safe to run multiple times)
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

-- Add UNIQUE constraint on patient_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'progress_overview_patient_id_key'
    ) THEN
        ALTER TABLE progress_overview ADD CONSTRAINT progress_overview_patient_id_key UNIQUE (patient_id);
    END IF;
END $$;

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add UNIQUE constraint on (patient_id, week) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'weekly_data_patient_id_week_key'
    ) THEN
        ALTER TABLE weekly_data ADD CONSTRAINT weekly_data_patient_id_week_key UNIQUE (patient_id, week);
    END IF;
END $$;

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add UNIQUE constraint on (patient_id, date) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_checkins_patient_id_date_key'
    ) THEN
        ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_patient_id_date_key UNIQUE (patient_id, date);
    END IF;
END $$;

-- Add missing columns if tables exist but are missing them
DO $$
BEGIN
    -- Add missing columns to progress_overview
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress_overview') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_overview' AND column_name = 'created_at') THEN
            ALTER TABLE progress_overview ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_overview' AND column_name = 'updated_at') THEN
            ALTER TABLE progress_overview ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Add missing columns to weekly_goals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_goals') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_goals' AND column_name = 'description') THEN
            ALTER TABLE weekly_goals ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_goals' AND column_name = 'created_at') THEN
            ALTER TABLE weekly_goals ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_goals' AND column_name = 'updated_at') THEN
            ALTER TABLE weekly_goals ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Add missing columns to milestones
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'milestones') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'description') THEN
            ALTER TABLE milestones ADD COLUMN description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'completed') THEN
            ALTER TABLE milestones ADD COLUMN completed BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'type') THEN
            ALTER TABLE milestones ADD COLUMN type TEXT DEFAULT 'minor';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'reward') THEN
            ALTER TABLE milestones ADD COLUMN reward TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'created_at') THEN
            ALTER TABLE milestones ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'updated_at') THEN
            ALTER TABLE milestones ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Add missing columns to progress_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress_metrics') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'change') THEN
            ALTER TABLE progress_metrics ADD COLUMN change TEXT DEFAULT '0';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'trend') THEN
            ALTER TABLE progress_metrics ADD COLUMN trend TEXT DEFAULT 'stable';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'icon') THEN
            ALTER TABLE progress_metrics ADD COLUMN icon TEXT DEFAULT 'trending-up';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'color') THEN
            ALTER TABLE progress_metrics ADD COLUMN color TEXT DEFAULT 'text-gray-600';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'bgcolor') THEN
            ALTER TABLE progress_metrics ADD COLUMN bgcolor TEXT DEFAULT 'bg-gray-100';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'category') THEN
            ALTER TABLE progress_metrics ADD COLUMN category TEXT DEFAULT 'general';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'created_at') THEN
            ALTER TABLE progress_metrics ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'updated_at') THEN
            ALTER TABLE progress_metrics ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Add missing columns to weekly_data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_data') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'wellness') THEN
            ALTER TABLE weekly_data ADD COLUMN wellness INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'attendance') THEN
            ALTER TABLE weekly_data ADD COLUMN attendance INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'goals') THEN
            ALTER TABLE weekly_data ADD COLUMN goals INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'mood') THEN
            ALTER TABLE weekly_data ADD COLUMN mood INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'energy') THEN
            ALTER TABLE weekly_data ADD COLUMN energy INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'sleep') THEN
            ALTER TABLE weekly_data ADD COLUMN sleep INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'created_at') THEN
            ALTER TABLE weekly_data ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'updated_at') THEN
            ALTER TABLE weekly_data ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;

    -- Add missing columns to daily_checkins
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_checkins') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'mood') THEN
            ALTER TABLE daily_checkins ADD COLUMN mood INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'energy') THEN
            ALTER TABLE daily_checkins ADD COLUMN energy INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'sleep') THEN
            ALTER TABLE daily_checkins ADD COLUMN sleep INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'stress') THEN
            ALTER TABLE daily_checkins ADD COLUMN stress INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'notes') THEN
            ALTER TABLE daily_checkins ADD COLUMN notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'created_at') THEN
            ALTER TABLE daily_checkins ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'updated_at') THEN
            ALTER TABLE daily_checkins ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Create indexes for better performance (only if columns exist)
DO $$
BEGIN
    -- Indexes for progress_overview
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_overview' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_progress_overview_patient_id ON progress_overview(patient_id);
    END IF;

    -- Indexes for weekly_goals
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_goals' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_weekly_goals_patient_id ON weekly_goals(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_goals' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_weekly_goals_created_at ON weekly_goals(created_at);
    END IF;

    -- Indexes for milestones
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_milestones_patient_id ON milestones(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'milestones' AND column_name = 'date') THEN
        CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);
    END IF;

    -- Indexes for progress_metrics
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_progress_metrics_patient_id ON progress_metrics(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_metrics' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_progress_metrics_created_at ON progress_metrics(created_at);
    END IF;

    -- Indexes for weekly_data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_weekly_data_patient_id ON weekly_data(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_data' AND column_name = 'week') THEN
        CREATE INDEX IF NOT EXISTS idx_weekly_data_week ON weekly_data(week);
    END IF;

    -- Indexes for daily_checkins
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'patient_id') THEN
        CREATE INDEX IF NOT EXISTS idx_daily_checkins_patient_id ON daily_checkins(patient_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_checkins' AND column_name = 'date') THEN
        CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(date);
    END IF;
END $$;

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

-- Insert sample data for testing (only if table exists and has required columns)
-- Note: These inserts will only work if you're logged in as a user
DO $$
BEGIN
    -- Insert progress overview
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'progress_overview'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'progress_overview' 
            AND column_name = 'patient_id'
        )
    ) THEN
        INSERT INTO progress_overview (patient_id, overall_progress) 
        SELECT auth.uid(), 0 
        WHERE auth.uid() IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM progress_overview WHERE patient_id = auth.uid()
        );
    END IF;

    -- Insert sample weekly goals
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'weekly_goals'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'weekly_goals' 
            AND column_name = 'name'
        )
    ) THEN
        INSERT INTO weekly_goals (patient_id, name, description, target, category, priority)
        SELECT 
            auth.uid(),
            'Complete 3 therapy sessions',
            'Attend all scheduled therapy sessions this week',
            3,
            'therapy',
            'high'
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM weekly_goals 
            WHERE patient_id = auth.uid() 
            AND name = 'Complete 3 therapy sessions'
        );

        INSERT INTO weekly_goals (patient_id, name, description, target, category, priority)
        SELECT 
            auth.uid(),
            'Practice mindfulness for 15 minutes daily',
            'Spend 15 minutes each day on mindfulness exercises',
            7,
            'mindfulness',
            'medium'
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM weekly_goals 
            WHERE patient_id = auth.uid() 
            AND name = 'Practice mindfulness for 15 minutes daily'
        );
    END IF;

    -- Insert sample milestones
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'milestones'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'milestones' 
            AND column_name = 'name'
        )
    ) THEN
        INSERT INTO milestones (patient_id, name, description, date, type, reward)
        SELECT 
            auth.uid(),
            'First Week Complete',
            'Successfully completed your first week of treatment',
            CURRENT_DATE + INTERVAL '7 days',
            'major',
            'Certificate of Achievement'
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM milestones 
            WHERE patient_id = auth.uid() 
            AND name = 'First Week Complete'
        );

        INSERT INTO milestones (patient_id, name, description, date, type)
        SELECT 
            auth.uid(),
            'First Therapy Session',
            'Attended your first individual therapy session',
            CURRENT_DATE + INTERVAL '1 day',
            'minor'
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM milestones 
            WHERE patient_id = auth.uid() 
            AND name = 'First Therapy Session'
        );
    END IF;

    -- Insert sample progress metrics
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'progress_metrics'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'progress_metrics' 
            AND column_name = 'title'
        )
    ) THEN
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
        AND NOT EXISTS (
            SELECT 1 FROM progress_metrics 
            WHERE patient_id = auth.uid() 
            AND title = 'Therapy Sessions'
        );

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
        AND NOT EXISTS (
            SELECT 1 FROM progress_metrics 
            WHERE patient_id = auth.uid() 
            AND title = 'Wellness Score'
        );
    END IF;

    -- Insert sample weekly data
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'weekly_data'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'weekly_data' 
            AND column_name = 'patient_id'
        )
    ) THEN
        INSERT INTO weekly_data (patient_id, week, wellness, attendance, goals, mood, energy, sleep)
        SELECT 
            auth.uid(),
            (CURRENT_DATE - INTERVAL '1 week')::DATE,
            7,
            85,
            60,
            6,
            7,
            8
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM weekly_data 
            WHERE patient_id = auth.uid() 
            AND week = (CURRENT_DATE - INTERVAL '1 week')::DATE
        );
    END IF;

    -- Insert sample daily check-in
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'daily_checkins'
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'daily_checkins' 
            AND column_name = 'patient_id'
        )
        AND EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'daily_checkins_patient_id_date_key'
        )
    ) THEN
        INSERT INTO daily_checkins (patient_id, date, mood, energy, sleep, stress, notes)
        SELECT 
            auth.uid(),
            (CURRENT_DATE - INTERVAL '1 day')::DATE,
            7,
            6,
            7,
            4,
            'Feeling good today, had a productive therapy session'
        WHERE auth.uid() IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM daily_checkins 
            WHERE patient_id = auth.uid() 
            AND date = (CURRENT_DATE - INTERVAL '1 day')::DATE
        );
    END IF;
END $$;
