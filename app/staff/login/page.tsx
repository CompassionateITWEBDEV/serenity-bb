"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

/* SweetAlert themed to Serenity */
async function serenitySwal(opts: { title: string; text?: string; mood: "success"|"error"|"info" }) {
  const Swal = (await import("sweetalert2")).default;
  const palette =
    opts.mood === "success"
      ? { emoji: "💙✨", bg: "linear-gradient(135deg,#f0fdfa,#ecfeff)" }
      : opts.mood === "error"
      ? { emoji: "🚫😕", bg: "linear-gradient(135deg,#fff1f2,#fee2e2)" }
      : { emoji: "🛠️😊", bg: "linear-gradient(135deg,#eff6ff,#e0f2fe)" };
  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:32px">${palette.emoji}</div>`,
    background: "#fff",
    color: "#0f172a",
    backdrop: palette.bg,
    confirmButtonColor: "#06b6d4",
    customClass: { popup: "rounded-2xl", confirmButton: "rounded-xl" },
    timer: opts.mood === "success" ? 1300 : undefined,
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
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        await serenitySwal({ title: "Staff login failed", text: body?.error || "Check your credentials.", mood: "error" });
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
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
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
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

              <Button disabled={busy} type="submit" className="w-full h-11">
                {busy ? "Signing in..." : "Sign In"}
              </Button>

              {/* ✅ New: direct link to staff signup */}
              <p className="text-center text-sm text-gray-600">
                Need an account?{" "}
                <Link href="/staff/signup" className="text-cyan-600 hover:text-cyan-700 hover:underline">
                  Create Staff Account
                </Link>
              </p>

              {/* Optional cross-link back to patient login */}
              <div className="text-center">
                <Link href="/login" className="text-xs text-gray-500 hover:underline">
                  ← Patient login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
