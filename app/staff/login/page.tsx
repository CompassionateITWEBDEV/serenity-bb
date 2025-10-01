// File: app/staff/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

async function serenitySwal(opts: { title: string; text?: string; mood: "success"|"error"|"info" }) {
  const Swal = (await import("sweetalert2")).default;
  const theme =
    opts.mood === "success"
      ? { emoji: "💙✨", backdrop: "linear-gradient(135deg,#eff6ff,#e0e7ff)" }
      : opts.mood === "error"
      ? { emoji: "🚫😕", backdrop: "linear-gradient(135deg,#fee2e2,#fecaca)" }
      : { emoji: "ℹ️😊", backdrop: "linear-gradient(135deg,#e0f2fe,#dbeafe)" };
  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:32px">${theme.emoji}</div>`,
    background: "#ffffff",
    color: "#0f172a",
    backdrop: theme.backdrop,
    confirmButtonColor: "#2563eb",
    customClass: { popup: "rounded-2xl", confirmButton: "rounded-xl" },
    timer: opts.mood === "success" ? 1200 : undefined,
  });
}

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // ✅ Sign in directly with the browser client (persists session/localStorage)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        await serenitySwal({ title: "Staff login failed", text: error?.message || "Check your credentials.", mood: "error" });
        return;
      }

      // ✅ Verify staff row (RLS will allow the signed-in user to read their row)
      const { data: staffRow, error: staffErr } = await supabase
        .from("staff")
        .select("user_id, active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (staffErr) {
        await serenitySwal({ title: "Login error", text: staffErr.message, mood: "error" });
        await supabase.auth.signOut(); // keep the app clean if staff fetch fails
        return;
      }
      if (!staffRow || staffRow.active === false) {
        await serenitySwal({ title: "Not authorized", text: "Your account is not an active staff user.", mood: "error" });
        await supabase.auth.signOut();
        return;
      }

      await serenitySwal({ title: "Welcome, team hero!", text: "Let’s make today awesome ✨", mood: "success" });
      router.push("/staff/dashboard");
    } catch (err: any) {
      await serenitySwal({ title: "Unexpected error", text: err?.message ?? "Try again.", mood: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-sans font-bold text-gray-900 mb-2">Login as Staff</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Staff Login</CardTitle>
            <CardDescription className="text-center">Use your staff credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button disabled={busy} type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700">
                {busy ? "Signing in..." : "Sign In"}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Need an account?{" "}
                <Link href="/staff/signup" className="text-blue-600 hover:text-blue-700 hover:underline">
                  Create Staff Account
                </Link>
              </p>
              <div className="text-center">
                <Link href="/login" className="text-xs text-gray-500 hover:underline">← Patient login</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
