// app/api/patients/signup/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Json = Record<string, unknown>

const bad = (status: number, message: string, details?: unknown) =>
  NextResponse.json({ error: message, details }, { status })

export async function POST(req: Request) {
  console.log('=== SIGNUP API CALLED ===')
  
  // 1) Parse and validate request body
  let body: Json
  try {
    body = (await req.json()) as Json
    console.log('Request body:', body)
  } catch (error) {
    console.error('JSON parse error:', error)
    return bad(400, 'Invalid JSON body')
  }

  // Extract and validate required fields
  const first_name = String(body?.first_name ?? '').trim()
  const last_name = String(body?.last_name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  
  // Optional fields from your form
  const phone_number = String(body?.phone_number ?? body?.phone ?? '').trim() || null
  const date_of_birth = String(body?.date_of_birth ?? '').trim() || null
  const emergency_contact_name = String(body?.emergency_contact_name ?? '').trim() || null
  const emergency_contact_phone = String(body?.emergency_contact_phone ?? '').trim() || null
  const emergency_contact_relationship = String(body?.emergency_contact_relationship ?? '').trim() || null
  const treatment_program = String(body?.treatment_program ?? '').trim() || null

  console.log('Extracted fields:', {
    first_name,
    last_name,
    email,
    hasPassword: Boolean(password),
    phone_number,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    treatment_program
  })

  // Validate required fields
  if (!first_name || !last_name || !email || !password) {
    return bad(400, 'first_name, last_name, email, and password are required')
  }

  if (password.length < 6) {
    return bad(400, 'Password must be at least 6 characters')
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return bad(400, 'Please provide a valid email address')
  }

  // 2) Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('Environment check:', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return bad(500, 'Server configuration error', {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(supabaseUrl),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(supabaseAnonKey),
    })
  }

  const supabase = createSbClient(supabaseUrl, supabaseAnonKey, {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false 
    }
  })

  // 3) Prepare email redirect URL
  const emailRedirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : undefined

  console.log('Email redirect to:', emailRedirectTo)

  try {
    // 4) Attempt to sign up the user
    console.log('Attempting signup...')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          first_name,
          last_name,
          phone_number,
          date_of_birth,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          treatment_program,
          display_name: `${first_name} ${last_name}`, // This might be used by Supabase
        },
      },
    })

    console.log('Supabase signup response:', {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: Boolean(data.session),
      error: error?.message
    })

    // 5) Handle signup errors
    if (error) {
      console.error('Supabase signup error:', error)
      
      // Map specific error messages to appropriate HTTP status codes
      let status = 400
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        status = 409 // Conflict
      } else if (error.message.includes('rate limit')) {
        status = 429 // Too Many Requests
      } else if (error.status) {
        status = error.status
      }

      return bad(status, error.message, { code: error.code })
    }

    // 6) Success response
    const response = {
      success: true,
      message: 'Account created successfully',
      user_id: data.user?.id ?? null,
      email: data.user?.email ?? email,
      needs_email_confirmation: !data.session, // true if email confirmation is required
      email_confirmation_sent: Boolean(data.user && !data.session),
    }

    console.log('Signup successful:', response)

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Unexpected error during signup:', error)
    return bad(500, 'An unexpected error occurred during account creation')
  }
}
