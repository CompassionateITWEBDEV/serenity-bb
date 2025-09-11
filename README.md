# Lead center design

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/mase2025ai-8394s-projects/v0-lead-center-design)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/htMHU3TYCjo)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/mase2025ai-8394s-projects/v0-lead-center-design](https://vercel.com/mase2025ai-8394s-projects/v0-lead-center-design)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/htMHU3TYCjo](https://v0.app/chat/projects/htMHU3TYCjo)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

\`\`\`
NEXT_PUBLIC_API_URL=<https://your-api-domain.com>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_GA_ID=<your-google-analytics-id>
\`\`\`

The `NEXT_PUBLIC_GA_ID` value must be provided for Google Analytics to initialize and for contact form submissions to report `generate_lead` events.

## Backend Notes

- Patients and staff can create appointments through the `/appointments/` endpoint. Staff must supply a `patient_id` when scheduling on behalf of a patient.
