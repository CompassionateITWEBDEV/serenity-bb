// app/api/patients/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Use anon key for regular signUp (matches your auth.ts approach)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client for fallback operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

type SignupBody = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  treatmentPlan?: string;
};

function problem(status: number, title: string, detail?: string) {
  return new NextResponse(JSON.stringify({ title, detail, status }), {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SignupBody;

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    // Validation
    if (!email || !password) {
      return problem(400, "Signup failed", "Email and password are required");
    }
    
    if (password.length < 8) {
      return problem(400, "Signup failed", "Password must be at least 8 characters");
    }

    if (!body.firstName || !body.lastName) {
      return problem(400, "Signup failed", "First name and last name are required");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return problem(400, "Signup failed", "Please enter a valid email address");
    }

    console.log('Starting signup process for:', email);

    // Step 1: Create the auth user with metadata matching your auth.ts expectations
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "patient",
          firstName: body.firstName,
          lastName: body.lastName,
          // Store additional fields for potential trigger use
          phoneNumber: body.phoneNumber || null,
          dateOfBirth: body.dateOfBirth || null,
          emergencyContactName: body.emergencyContact?.name || null,
          emergencyContactPhone: body.emergencyContact?.phone || null,
          emergencyContactRelationship: body.emergencyContact?.relationship || null,
          treatmentPlan: body.treatmentPlan || "Standard Recovery Program",
        }
      }
    });

    if (error) {
      console.error("Supabase signup error:", error);
      
      if (error.message.includes('User already registered')) {
        return problem(409, "Signup failed", "An account with this email already exists");
      }
      
      // If it's the database trigger error, try fallback with admin client
      if (error.message.includes('Database error saving new user')) {
        console.log("Database trigger failed, trying admin approach...");
        
        try {
          // Use admin client to create user
          const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            user_metadata: {
              role: "patient",
              firstName: body.firstName,
              lastName: body.lastName,
              phoneNumber: body.phoneNumber || null,
              dateOfBirth: body.dateOfBirth || null,
              emergencyContactName: body.emergencyContact?.name || null,
              emergencyContactPhone: body.emergencyContact?.phone || null,
              emergencyContactRelationship: body.emergencyContact?.relationship || null,
              treatmentPlan: body.treatmentPlan || "Standard Recovery Program",
            },
            email_confirm: true
          });

          if (adminError) {
            console.error("Admin create user error:", adminError);
            return problem(500, "Signup failed", "Unable to create account. Please contact support.");
          }

          // Manually create the patient record
          const fullName = `${body.firstName} ${body.lastName}`;
          
          const { error: patientError } = await supabaseAdmin
            .from('patients')
            .insert({
              user_id: adminData.user!.id,
              first_name: body.firstName,
              last_name: body.lastName,
              full_name: fullName,
              email: email,
              phone_number: body.phoneNumber || null,
              date_of_birth: body.dateOfBirth || null,
              emergency_contact_name: body.emergencyContact?.name || null,
              emergency_contact_phone: body.emergencyContact?.phone || null,
              emergency_contact_relationship: body.emergencyContact?.relationship || null,
              treatment_program: body.treatmentPlan || "Standard Recovery Program",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (patientError) {
            console.error("Patient creation error:", patientError);
            // Don't fail the signup, just log the error
          }

          return NextResponse.json({
            success: true,
            requiresEmailConfirmation: false,
            user: {
              id: adminData.user!.id,
              email: adminData.user!.email,
              user_metadata: adminData.user!.user_metadata
            },
            message: "Account created successfully"
          }, { status: 201 });

        } catch (fallbackError) {
          console.error("Fallback signup error:", fallbackError);
          return problem(500, "Signup failed", "Unable to create account. Please try again.");
        }
      }
      
      return problem(400, "Signup failed", error.message);
    }

    if (!data.user) {
      return problem(500, "Signup failed", "User creation failed");
    }

    console.log('User created successfully:', data.user.id);

    // If we have a session, try to create the patient record
    if (data.session) {
      try {
        const fullName = `${body.firstName} ${body.lastName}`;
        
        // This should work if your RLS policies allow it, or if triggers handle it
        const { error: patientError } = await supabase
          .from('patients')
          .upsert({
            user_id: data.user.id,
            first_name: body.firstName,
            last_name: body.lastName,
            full_name: fullName,
            email: email,
            phone_number: body.phoneNumber || null,
            date_of_birth: body.dateOfBirth || null,
            emergency_contact_name: body.emergencyContact?.name || null,
            emergency_contact_phone: body.emergencyContact?.phone || null,
            emergency_contact_relationship: body.emergencyContact?.relationship || null,
            treatment_program: body.treatmentPlan || "Standard Recovery Program",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (patientError) {
          console.error("Patient upsert error:", patientError);
          // Don't fail the signup, the user was created successfully
        }
      } catch (upsertError) {
        console.error("Patient upsert exception:", upsertError);
        // Don't fail the signup
      }
    }

    const requiresEmailConfirmation = !data.session;

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata
      },
      message: requiresEmailConfirmation 
        ? "Please check your email to confirm your account" 
        : "Account created successfully"
    }, { status: 201 });

  } catch (error: any) {
    console.error("Signup route error:", error);
    return problem(500, "Internal Server Error", "An unexpected error occurred");
  }
}
