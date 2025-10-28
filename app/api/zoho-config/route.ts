import { NextRequest, NextResponse } from 'next/server';

/**
 * API to manage Zoho Meeting configuration
 * Stores configuration in server environment or database
 */

// For development, store in memory. In production, use database
let zohoConfig: { url: string } | null = null;

// GET - Retrieve current configuration
export async function GET() {
  try {
    // Check environment variable first (for production)
    const envUrl = process.env.ZOHO_MEETING_URL;
    
    return NextResponse.json({
      url: zohoConfig?.url || envUrl || null,
      source: envUrl ? 'environment' : (zohoConfig ? 'config' : 'none')
    });
  } catch (error: any) {
    console.error('Error retrieving Zoho config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

// POST - Save/Update configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Validate it's a Zoho Meeting URL
    if (!url.includes('meeting.zoho.com')) {
      return NextResponse.json(
        { error: 'Must be a valid Zoho Meeting URL' },
        { status: 400 }
      );
    }

    // Save to config
    zohoConfig = { url };

    // In production, save to database here
    // await db.zohoConfig.upsert({ where: { id: 'default' }, update: { url }, create: { url } });

    return NextResponse.json({
      success: true,
      url,
      message: 'Configuration saved successfully'
    });

  } catch (error: any) {
    console.error('Error saving Zoho config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

