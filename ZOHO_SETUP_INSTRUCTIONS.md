# Zoho Meeting Configuration Instructions

## ✅ NEW: Automatic Meeting Generation

The system now **automatically generates unique meeting links** for each call! You don't need to set a fixed room URL anymore.

### How It Works:
1. When you click the call button, the system generates a unique 12-character meeting ID
2. A new Zoho Meeting link is created for each conversation
3. Each call gets its own unique meeting room

### No Configuration Required!

You can use the system immediately without any environment variables. The API will generate meeting IDs like:
- `https://meeting.zoho.com/abc123xyz789`
- `https://meeting.zoho.com/xyz987def456`

---

## Optional: Use Zoho Meeting API (For Better Integration)

If you want to use Zoho's official API for meeting creation:

### Option 1: Use Zoho Meeting API

1. **Get your Zoho Meeting room URL:**
   - Log into your Zoho Meeting account
   - Go to "My Meeting Rooms" or "Personal Rooms"
   - Copy the room URL (e.g., `https://meeting.zoho.com/room/123456789`)

2. **Add to `.env.local` file:**
   ```bash
   ZOHO_MEETING_URL=https://meeting.zoho.com/room/123456789
   ```
   
3. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

### Option 2: Create a New Meeting Link

If you don't have a permanent room, you can use any Zoho Meeting link:

1. **Create a test meeting in Zoho:**
   - Go to [zoho.com/meeting](https://zoho.com/meeting)
   - Schedule or start a new meeting
   - Copy the meeting link

2. **Add to `.env.local`:**
   ```bash
   ZOHO_MEETING_URL=https://meeting.zoho.com/your-actual-meeting-link-here
   ```

### Option 3: Use a Static Link with Parameters

You can also use a URL that accepts join links:
```bash
ZOHO_MEETING_URL=https://meeting.zoho.com/join
```

Then users will be prompted to enter their meeting ID when clicking the call button.

## Quick Test

1. Click the phone icon on any conversation
2. A unique Zoho Meeting link will be generated
3. The meeting opens in a new tab

## How Unique Links Work

Each call click generates a new meeting ID:
- **Meeting ID Format:** 12 random alphanumeric characters
- **Example URLs:** 
  - Call 1: `https://meeting.zoho.com/abc123def456`
  - Call 2: `https://meeting.zoho.com/xyz789uvw012`
- **Expiration:** Links expire after 1 hour (configurable)
- **No Conflicts:** Each conversation gets its own unique room

## Need Help?

- Check your `.env.local` file exists in the project root
- Verify the URL doesn't contain `your-room-id`
- Make sure to restart the server after adding the variable
- Check browser console for any error messages

