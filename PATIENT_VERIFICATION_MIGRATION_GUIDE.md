# Patient Verification System Migration Guide

## Issue
The PatientVerificationManager component is showing an "Internal server error" because the required database tables for the patient verification system have not been created yet.

## Solution
You need to run the SQL migration script to create the required tables in your Supabase database.

## Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your project

2. **Navigate to SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query"

3. **Run the migration script**
   - Open the file `scripts/create_patient_verification_system.sql` in your project
   - Copy the entire contents of the file
   - Paste it into the SQL Editor
   - Click "Run" to execute the SQL

4. **Verify the migration**
   - Check that the following tables were created:
     - `patient_verifications`
     - `patient_verification_documents`
     - `patient_verification_logs`
     - `patient_verification_summary` (view)

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the migration
supabase db reset --db-url "your-supabase-db-url"
psql "your-supabase-db-url" -f scripts/create_patient_verification_system.sql
```

### Option 3: Using psql directly

```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" -f scripts/create_patient_verification_system.sql
```

## What the Migration Creates

The migration script creates:

- **Tables:**
  - `patient_verifications` - Main verification records
  - `patient_verification_documents` - Document uploads
  - `patient_verification_logs` - Audit trail

- **View:**
  - `patient_verification_summary` - Aggregated verification status

- **Security:**
  - Row Level Security (RLS) policies
  - Proper permissions for staff and patients

- **Performance:**
  - Database indexes for better query performance

- **Automation:**
  - Triggers for automatic timestamp updates
  - Audit logging for verification changes

## Verification

After running the migration:

1. **Check the component**
   - Refresh the PatientVerificationManager page
   - The error should be resolved
   - You should see the patient verification interface

2. **Test the API endpoints**
   - `/api/admin/check-migration` - Should return `migrationRequired: false`
   - `/api/patient-verifications/summary` - Should work without errors

## Troubleshooting

### If you still get errors:

1. **Check the migration status:**
   ```bash
   curl http://localhost:3000/api/admin/check-migration
   ```

2. **Verify tables exist:**
   - Go to Supabase Dashboard → Table Editor
   - Look for the patient verification tables

3. **Check for SQL errors:**
   - Review the Supabase logs for any SQL execution errors
   - Make sure all statements executed successfully

### Common Issues:

- **Permission errors:** Make sure you're using the service role key
- **SQL syntax errors:** Check that the SQL file is complete and valid
- **Connection issues:** Verify your Supabase connection settings

## Next Steps

Once the migration is complete:

1. The PatientVerificationManager will work properly
2. Staff can create verification requests for patients
3. Patients can upload required documents
4. Staff can approve/reject verifications
5. The system will track all verification activities

## Support

If you continue to have issues:

1. Check the browser console for detailed error messages
2. Review the Supabase logs in your dashboard
3. Verify your environment variables are set correctly
4. Ensure your Supabase project is active and accessible

