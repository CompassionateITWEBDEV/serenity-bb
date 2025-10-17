# Avatar Upload Fix - StorageApiError: RLS Policy Violation

## Problem
The ProfileEditor component was getting a `StorageApiError: new row violates row-level security policy` when trying to upload avatars to the Supabase storage bucket.

## Root Cause
The `avatars` storage bucket in Supabase doesn't have the proper Row Level Security (RLS) policies configured to allow users to upload files.

## Solution

### 1. Set up Storage Policies (Required)
Run the SQL script `scripts/setup_avatars_storage_policies.sql` in your Supabase SQL editor:

```sql
-- This creates the necessary RLS policies for the avatars bucket
-- Users can only upload/view/update/delete files in their own user folder
```

### 2. Updated ProfileEditor Component
The ProfileEditor has been updated to:
- Use user-scoped file paths (`{userId}/{timestamp}-{filename}`)
- Include proper file validation (type and size)
- Handle authentication properly
- Store the avatar path correctly in the database

### 3. Key Changes Made

#### File Path Structure
- **Before**: `avatars/{filename}` (caused RLS violation)
- **After**: `avatars/{userId}/{timestamp}-{filename}` (follows RLS policy)

#### File Validation
- Added file type validation (PNG, JPG, WebP only)
- Added file size validation (1MB max)
- Better error messages for validation failures

#### Storage Configuration
- Added proper upload options (cacheControl, upsert, contentType)
- Better error handling and user feedback

## How to Apply the Fix

### Step 1: Run the SQL Script
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the contents of `scripts/setup_avatars_storage_policies.sql`

### Step 2: Verify the Fix
1. The ProfileEditor component is already updated
2. Try uploading an avatar - it should now work without RLS errors
3. Check that avatars are stored in user-specific folders

## Storage Policy Details

The policies created allow:
- **Upload**: Users can upload files to `avatars/{their-user-id}/` folder
- **View**: Users can view files in their own folder + public access
- **Update**: Users can update files in their own folder
- **Delete**: Users can delete files in their own folder

This ensures security while allowing proper avatar functionality.

## Testing
After applying the fix:
1. Try uploading a valid image file (PNG/JPG/WebP, <1MB)
2. Try uploading an invalid file type - should show error
3. Try uploading a large file - should show error
4. Verify the avatar appears correctly in the UI
5. Check that the avatar persists after page refresh



