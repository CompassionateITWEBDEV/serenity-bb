# Notification and Profile System

## Overview

This system provides real-time notifications for staff when patients send submissions or messages, along with a fully functional profile editing system for patients.

## Features

### 🔔 Staff Notifications
- **Real-time notifications** when patients send submissions or messages
- **Notification types**: Submission, Message, Appointment, Emergency
- **Priority levels**: Low, Medium, High, Urgent
- **Real-time updates** using Supabase subscriptions
- **Notification management**: Mark as read, bulk actions, filtering

### 👤 Profile Editing
- **Comprehensive profile editor** with validation
- **Avatar upload** functionality
- **Emergency contact** management
- **Treatment information** updates
- **Real-time form validation** with error handling
- **Auto-save** and manual save options

## Database Schema

### Staff Notifications Table
```sql
CREATE TABLE staff_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('submission', 'message', 'appointment', 'emergency')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

### Staff Members Table
```sql
CREATE TABLE staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'nurse', 'therapist', 'admin', 'staff')),
  active BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "sms_notifications": false,
    "submission_alerts": true,
    "message_alerts": true,
    "appointment_alerts": true,
    "emergency_alerts": true
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Notifications
- `POST /api/notifications/message` - Create message notification for staff
- `GET /api/notifications` - Get notifications for current user
- `PATCH /api/notifications` - Mark notifications as read/unread

### Profile
- `GET /api/profile` - Get current user profile
- `PATCH /api/profile` - Update current user profile

## Components

### Staff Notifications
- `app/staff/notifications/page.tsx` - Main notifications page
- `components/staff/NotificationBell.tsx` - Header notification bell
- `lib/notifications/staff-notifications.ts` - Notification utilities

### Profile Editing
- `components/profile/ProfileEditor.tsx` - Enhanced profile editor
- `app/dashboard/profile/page.tsx` - Profile page with editor integration

## Usage

### Setting Up Notifications

1. **Run the database migration**:
   ```bash
   # Execute the SQL script in your Supabase dashboard
   cat scripts/create_staff_notifications_table.sql
   ```

2. **Create staff members**:
   ```typescript
   // When a user signs up with staff role, they'll be automatically added
   // Or manually insert into staff_members table
   ```

3. **Trigger notifications**:
   ```typescript
   import { createSubmissionNotification, createMessageNotification } from '@/lib/notifications/staff-notifications';
   
   // When patient creates submission
   await createSubmissionNotification(patientId, submissionId, submissionType, patientName);
   
   // When patient sends message
   await createMessageNotification(patientId, messageId, conversationId, patientName, messagePreview);
   ```

### Using Profile Editor

1. **Import the component**:
   ```typescript
   import ProfileEditor from '@/components/profile/ProfileEditor';
   ```

2. **Use in your page**:
   ```typescript
   <ProfileEditor
     initialData={profileData}
     isEditing={isEditing}
     onEditToggle={() => setIsEditing(!isEditing)}
     onSave={async (data) => {
       // Handle save logic
       console.log('Profile saved:', data);
     }}
   />
   ```

## Real-time Features

### Staff Notifications
- **Real-time updates** when new notifications arrive
- **Live unread count** in header bell
- **Instant notification display** without page refresh
- **Auto-refresh** when notifications are marked as read

### Profile Updates
- **Real-time validation** as user types
- **Auto-save** functionality (optional)
- **Live character count** for bio field
- **Instant feedback** on form errors

## Configuration

### Notification Preferences
Staff members can configure their notification preferences:

```typescript
interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  submission_alerts: boolean;
  message_alerts: boolean;
  appointment_alerts: boolean;
  emergency_alerts: boolean;
}
```

### Profile Validation
The profile editor includes comprehensive validation:

```typescript
const ProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  treatmentType: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});
```

## Testing

### Test Notification Flow
1. **Patient creates submission** → Staff receives notification
2. **Patient sends message** → Staff receives notification
3. **Staff marks as read** → Notification count updates
4. **Real-time updates** → No page refresh needed

### Test Profile Editing
1. **Click "Edit Profile"** → Form becomes editable
2. **Make changes** → Real-time validation
3. **Save changes** → Profile updates in database
4. **Cancel changes** → Form resets to original values

## Security

- **Row Level Security (RLS)** enabled on all tables
- **User authentication** required for all operations
- **Data validation** on both client and server
- **Secure file uploads** for avatars
- **Input sanitization** for all text fields

## Performance

- **Optimized queries** with proper indexing
- **Real-time subscriptions** with efficient filtering
- **Lazy loading** for notification lists
- **Debounced validation** for form inputs
- **Efficient state management** with React hooks

## Troubleshooting

### Common Issues

1. **Notifications not appearing**:
   - Check if staff member exists in `staff_members` table
   - Verify RLS policies are correct
   - Check Supabase real-time connection

2. **Profile not saving**:
   - Verify user authentication
   - Check form validation errors
   - Ensure database permissions are correct

3. **Real-time not working**:
   - Check Supabase connection
   - Verify channel subscriptions
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'notifications,profile');
```

This will log detailed information about notification and profile operations.
