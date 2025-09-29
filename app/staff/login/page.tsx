"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

/* reuse helpers per-file for simplicity */
async function serenitySwalStaff(opts: {
  title: string; text?: string; mood: "success"|"error"|"info";
}) {
  const Swal = (await import("sweetalert2")).default;
  const palette = {
    success: { bg: "linear-gradient(135deg,#f0fdfa,#ecfeff)", emoji: "💼✨" },
    error:   { bg: "linear-gradient(135deg,#fff1f2,#fee2e2)", emoji: "🚫😕" },
    info:    { bg: "linear-gradient(135deg,#eff6ff,#e0f2fe)", emoji: "🛠️😊" },
  }[opts.mood];

  return Swal.fire({
    title: opts.title,
    text: opts.text,
    iconHtml: `<div style="font-size:32px;line-height:1">${palette.emoji}</div>`,
    background: "#ffffff",
    color: "#0f172a",
    backdrop: palette.bg,
    confirmButtonColor: "#06b6d4",
    showConfirmButton: true,
    timer: opts.mood === "success" ? 1300 : undefined,
    customClass: {
      popup: "rounded-2xl shadow-xl",
      title: "font-semibold",
      confirmButton: "rounded-xl",
    },
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
        await serenitySwalStaff({
          title: "Staff login failed",
          text: body?.error || "Please check your credentials.",
          mood: "error",
        });
        return;
      }

      await serenitySwalStaff({
        title: "Welcome, team hero!",
        text: "Let’s make today awesome ✨",
        mood: "success",
      });
      router.push("/staff/dashboard");
    } catch (err: any) {
      await serenitySwalStaff({
        title: "Unexpected error",
        text: err?.message ?? "Please try again.",
        mood: "error",
      });
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

              <div className="text-center mt-2">
                <Link href="/login" className="text-sm text-cyan-600 hover:underline">
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
