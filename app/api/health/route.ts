import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint that also shows Supabase configuration status
 * (without exposing sensitive keys)
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  
  const config = {
    supabaseUrl: {
      exists: !!url,
      length: url?.length || 0,
      format: url?.includes("supabase.co") ? "valid" : "invalid",
      projectRef: url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "not found"
    },
    anonKey: {
      exists: !!anon,
      length: anon?.length || 0,
      format: anon?.startsWith("eyJ") ? "valid" : "invalid",
      prefix: anon ? anon.substring(0, 20) + "..." : "missing",
      suffix: anon ? "..." + anon.substring(anon.length - 10) : "missing"
    },
    serviceKey: {
      exists: !!serviceKey,
      length: serviceKey?.length || 0,
      format: serviceKey?.startsWith("eyJ") ? "valid" : "invalid"
    }
  };
  
  const issues: string[] = [];
  if (!url) issues.push("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!url?.includes("supabase.co")) issues.push("NEXT_PUBLIC_SUPABASE_URL format is invalid");
  if (!anon) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  if (anon && !anon.startsWith("eyJ")) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY format is invalid");
  if (anon && anon.length < 100) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY appears too short");
  if (!serviceKey) issues.push("SUPABASE_SERVICE_ROLE_KEY is missing (optional but recommended)");
  
  const status = issues.length === 0 ? "healthy" : "unhealthy";
  
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    config,
    issues: issues.length > 0 ? issues : undefined,
    hint: issues.length > 0 
      ? "Check Vercel → Settings → Environment Variables → Ensure all variables are set for Production environment"
      : "Configuration looks good"
  }, {
    status: issues.length === 0 ? 200 : 500,
    headers: {
      "cache-control": "no-store"
    }
  });
}
