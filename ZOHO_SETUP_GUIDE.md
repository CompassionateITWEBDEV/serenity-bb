# Zoho Meeting Setup Guide

## ❌ Problem Fixed!

Randomly generated Zoho Meeting URLs don't work because they're not real meetings! You need to use either:
1. A real Zoho Meeting room URL from your account
2. The Zoho Meeting API with proper authentication

---

## ✅ Solution: Use Your Zoho Meeting Room

### Step 1: Get Your Zoho Meeting Room URL

1. Go to [https://meeting.zoho.com](https://meeting.zoho.com)
2. Log in to your Zoho Meeting account
3. Go to **"My Meeting Rooms"** or **"Personal Rooms"**
4. Find your meeting room URL - it should look like:
   - `https://meeting.zoho.com/room/123456789`
   - `https://meeting.zoho.com/join?meetingid=abc123xyz`
   - Or any valid Zoho meeting room URL

### Step 2: Add to Environment Variables

Open your `.env.local` file and add:

```bash
ZOHO_MEETING_URL=https://meeting.zoho.com/room/YOUR-ROOM-ID
```

**Replace `YOUR-ROOM-ID` with your actual room ID from Step 1.**

### Step 3: Restart Your Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🎯 How It Works Now

Once configured, when someone clicks the call button:

1. System uses your configured `ZOHO_MEETING_URL`
2. Both staff and patient join the **SAME meeting room**
3. They can see and talk to each other in the conference

---

## 🔧 Alternative: Use Zoho Meeting API

If you want to create dynamic meetings with the API:

1. Get a Zoho OAuth access token
2. Add to `.env.local`:
   ```bash
   ZOHO_ACCESS_TOKEN=your_access_token_here
   ```

This requires Zoho API authentication setup - more complex but more flexible.

---

## 📝 Quick Test

1. Make sure `ZOHO_MEETING_URL` is set in `.env.local`
2. Restart your dev server
3. Click the call button in a conversation
4. You should be taken to a working Zoho meeting room

---

## ❓ Troubleshooting

**Q: "Page not found" error**  
A: Your `ZOHO_MEETING_URL` is invalid. Get a real meeting room URL from Zoho.

**Q: Meeting room doesn't exist**  
A: Create a meeting room first in your Zoho Meeting account.

**Q: Both parties can't join**  
A: Make sure the meeting room URL is configured correctly and accessible.

