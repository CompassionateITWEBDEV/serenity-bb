// File: /lib/supabase/client.ts
"use client";

// Shim only — do NOT create a new client here.
// This prevents multiple GoTrue instances and build errors.
export * from "@/lib/supabase-browser";
export { default } from "@/lib/supabase-browser";
