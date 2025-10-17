# Progress Tracking Setup Instructions

## Database Setup Required

The Progress Tracking feature requires database tables to be created. Please follow these steps:

### 1. Run the SQL Script

Execute the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/create_progress_tables.sql
-- into your Supabase SQL Editor and run it
```

### 2. Tables Created

The script will create the following tables:

- `progress_overview` - Overall progress tracking
- `weekly_goals` - Weekly goal management
- `milestones` - Recovery milestones
- `progress_metrics` - Progress metrics and KPIs
- `weekly_data` - Weekly trend data
- `daily_checkins` - Daily check-in data

### 3. Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Proper authentication is required
- Data is isolated per patient

### 4. Sample Data

The script includes sample data for testing:
- Sample weekly goals
- Sample milestones
- Sample progress metrics
- Sample weekly and daily data

### 5. Features Available After Setup

Once the database is set up, you'll have access to:

- **Real-time progress tracking** with live updates
- **Interactive goal management** with progress bars
- **Milestone tracking** with completion status
- **Daily check-ins** for mood, energy, sleep, stress
- **Trend visualization** with weekly data
- **Progress metrics** with trend indicators

### 6. Troubleshooting

If you see errors like "table does not exist" or "column does not exist":
1. Make sure you've run the SQL script
2. Check that RLS policies are properly set up
3. Verify that the user is authenticated
4. Check the browser console for detailed error messages

### 7. Next Steps

After running the SQL script:
1. Refresh the Progress Tracking page
2. You should see sample data and be able to interact with goals
3. Try adding new goals and updating progress
4. Check the real-time updates as you make changes

The system will gracefully handle missing tables and show appropriate error messages until the database is properly set up.



