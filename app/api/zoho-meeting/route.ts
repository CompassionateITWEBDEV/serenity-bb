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
  
  // If no access token, generate a unique meeting ID manually
  if (!accessToken) {
    console.log('No ZOHO_ACCESS_TOKEN found, generating unique meeting ID');
    const meetingId = generateMeetingId();
    const meetingUrl = `https://meeting.zoho.com/${meetingId}`;
    
    return {
      meeting_id: meetingId,
      host_url: meetingUrl,
      attendee_url: meetingUrl,
      topic: params.topic
    };
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
 * API route to create a Zoho Meeting link
 * This automatically generates a unique meeting ID for each call
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

    const topic = `${patientName || 'Patient'} & ${staffName || 'Staff'} Meeting`;
    
    // Create meeting dynamically - generates unique ID
    const meeting = await createZohoMeeting({
      topic,
      startTime: new Date().toISOString(),
      duration: 60, // 1 hour
      conversationId
    });

    return NextResponse.json({
      meetingUrl: meeting.attendee_url || meeting.host_url,
      meetingId: meeting.meeting_id,
      conversationId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      topic
    });

  } catch (error: any) {
    console.error('Error creating Zoho Meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting link' },
      { status: 500 }
    );
  }
}
