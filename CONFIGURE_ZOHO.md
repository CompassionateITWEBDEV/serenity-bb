# 🔧 Configure Your Zoho Meeting URL

## ⚠️ Current Issue

Your application is trying to use the placeholder URL `https://meeting.zoho.com/your-room-id` which doesn't exist!

## ✅ Solution - Get Your Real Zoho Meeting Room URL

### Step 1: Get Your Room URL

1. **Go to Zoho Meeting**
   - Visit: https://meeting.zoho.com
   - Log in with your Zoho account

2. **Find Your Meeting Room**
   - Click on **"My Meeting Rooms"** or **"Personal Rooms"** in the left menu
   - Look for your permanent meeting room
   - Click on it to open

3. **Copy the URL**
   - The URL should look like one of these:
     - `https://meeting.zoho.com/room/123456789`
     - `https://meeting.zoho.com/join?meetingid=abc123xyz`
     - Or similar format

### Step 2: Update Your Configuration

**Option A: Use the Setup Page (Recommended)**
1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/zoho-setup`
3. Paste your meeting room URL
4. Click "Verify & Save"

**Option B: Update .env.local File**
1. Open `.env.local` file
2. Find the line: `ZOHO_MEETING_URL=...`
3. Replace with your actual URL:
   ```bash
   ZOHO_MEETING_URL=https://meeting.zoho.com/room/YOUR-ACTUAL-ROOM-ID
   ```
4. Save the file
5. Restart your server: `npm run dev`

### Step 3: Test

1. Click the call button in a conversation
2. It should open your actual Zoho Meeting room
3. No more "Page not found" error! ✅

---

## 🆘 Don't Have a Zoho Meeting Room?

1. **Create a Free Account**
   - Go to: https://www.zoho.com/meeting
   - Sign up for free
   - Get your meeting room URL

2. **Or Use a Test Meeting**
   - Create a new meeting in Zoho
   - Use that meeting's join link temporarily

---

## 📝 Quick Checklist

- [ ] Logged into https://meeting.zoho.com
- [ ] Found "My Meeting Rooms" section
- [ ] Copied the meeting room URL
- [ ] Updated in `.env.local` or via setup page
- [ ] Restarted the dev server
- [ ] Tested by clicking call button

Once you do this, calls will work perfectly! 🎉

