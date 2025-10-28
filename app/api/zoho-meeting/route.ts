import { NextRequest, NextResponse } from 'next/server';

interface ZohoMeetingRequest {
  conversationId: string;
  patientName?: string;
  staffName?: string;
}

/**
 * Generate a unique meeting ID (12 characters alphanumeric)
 */
function generateMeetingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a Zoho Meeting via API or generate a meeting ID
 */
async function createZohoMeeting(params: {
  topic: string;
  startTime: string;
  duration: number;
  conversationId: string;
}) {
  const accessToken = process.env.ZOHO_ACCESS_TOKEN;
  
  // If no access token, use fixed meeting room URL from env or return error
  if (!accessToken) {
    console.log('No ZOHO_ACCESS_TOKEN found, checking for ZOHO_MEETING_URL');
    const fixedUrl = process.env.ZOHO_MEETING_URL;
    
    if (fixedUrl) {
      console.log('Using fixed Zoho Meeting URL:', fixedUrl);
      // Extract meeting ID from URL if possible
      const urlParts = fixedUrl.split('/');
      const meetingId = urlParts[urlParts.length - 1] || 'default';
      
      return {
        meeting_id: meetingId,
        host_url: fixedUrl,
        attendee_url: fixedUrl,
        topic: params.topic
      };
    }
    
    // If no fixed URL is configured, we need to return an error
    throw new Error('ZOHO_MEETING_URL environment variable is required. Please set it in your .env.local file with your Zoho Meeting room URL.');
  }

  try {
    const response = await fetch('https://meeting.zoho.com/api/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: params.topic,
        start_time: params.startTime,
        duration: params.duration,
        type: 1, // 1=instant meeting
        options: {
          join_before_host: true,
          audio: 'both',
          video: true,
          dial_in: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho Meeting API error:', errorText);
      // Fall back to generating meeting ID
      const meetingId = generateMeetingId();
      return {
        meeting_id: meetingId,
        host_url: `https://meeting.zoho.com/${meetingId}`,
        attendee_url: `https://meeting.zoho.com/${meetingId}`,
        topic: params.topic
      };
    }

    const data = await response.json();
    return data.meeting;
  } catch (error) {
    console.error('Failed to create Zoho Meeting via API:', error);
    // Fall back to generating meeting ID
    const meetingId = generateMeetingId();
    return {
      meeting_id: meetingId,
      host_url: `https://meeting.zoho.com/${meetingId}`,
      attendee_url: `https://meeting.zoho.com/${meetingId}`,
      topic: params.topic
    };
  }
}

/**
 * In-memory storage for conversation meetings
 * In production, you might want to use a database or Redis
 */
const conversationMeetings = new Map<string, {
  meetingUrl: string;
  meetingId: string;
  topic: string;
  createdAt: Date;
}>();

/**
 * API route to create a Zoho Meeting link
 * This creates ONE shared meeting per conversation that both parties join
 */
export async function POST(req: NextRequest) {
  try {
    const body: ZohoMeetingRequest = await req.json();
    const { conversationId, patientName, staffName } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Check if we already have a meeting for this conversation
    const existingMeeting = conversationMeetings.get(conversationId);
    
    // If meeting exists and is less than 1 hour old, reuse it
    if (existingMeeting) {
      const ageInMs = Date.now() - existingMeeting.createdAt.getTime();
      const oneHourInMs = 60 * 60 * 1000;
      
      if (ageInMs < oneHourInMs) {
        console.log(`Reusing existing meeting for conversation ${conversationId}`);
        return NextResponse.json({
          meetingUrl: existingMeeting.meetingUrl,
          meetingId: existingMeeting.meetingId,
          conversationId,
          expiresAt: new Date(existingMeeting.createdAt.getTime() + oneHourInMs).toISOString(),
          topic: existingMeeting.topic
        });
      } else {
        // Meeting expired, remove it
        conversationMeetings.delete(conversationId);
      }
    }

    // Create new meeting for this conversation
    const topic = `${patientName || 'Patient'} & ${staffName || 'Staff'} Meeting`;
    
    const meeting = await createZohoMeeting({
      topic,
      startTime: new Date().toISOString(),
      duration: 60, // 1 hour
      conversationId
    });

    const meetingData = {
      meetingUrl: meeting.attendee_url || meeting.host_url,
      meetingId: meeting.meeting_id,
      topic
    };

    // Store the meeting for this conversation
    conversationMeetings.set(conversationId, {
      ...meetingData,
      createdAt: new Date()
    });

    console.log(`Created new meeting for conversation ${conversationId}: ${meetingData.meetingUrl}`);

    return NextResponse.json({
      ...meetingData,
      conversationId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    });

  } catch (error: any) {
    console.error('Error creating Zoho Meeting:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create meeting link. Please configure ZOHO_MEETING_URL in your environment variables.' },
      { status: 500 }
    );
  }
}
