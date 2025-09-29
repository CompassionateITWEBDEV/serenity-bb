"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Heart } from "lucide-react";

/* Serenity SweetAlert helpers */
async function serenitySwal(opts: {
  title: string; text?: string; mood: "success"|"error"|"info";
}) {
  const Swal = (await import("sweetalert2")).default;
  const palette = {
    success: { bg: "linear-gradient(135deg,#ecfeff,#eef2ff)", emoji: "💙✨" },
    error:   { bg: "linear-gradient(135deg,#fff1f2,#fee2e2)", emoji: "😅💤" },
    info:    { bg: "linear-gradient(135deg,#f0fdfa,#e0f2fe)", emoji: "🌤️😊" },
  }[opts.mood];

  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:32px;line-height:1">${palette.emoji}</div>`,
    background: "#ffffff",
    color: "#0f172a",
    backdrop: palette.bg,
    confirmButtonColor: "#06b6d4",
    showConfirmButton: true,
    timer: opts.mood === "success" ? 1400 : undefined,
    customClass: {
      popup: "rounded-2xl shadow-xl",
      title: "font-semibold",
      confirmButton: "rounded-xl",
    },
  });
}

async function serenityToast(title: string, mood: "success"|"error"|"info") {
  const Swal = (await import("sweetalert2")).default;
  const emoji = mood === "success" ? "🎉"
    : mood === "error" ? "⚠️"
    : "✨";
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    customClass: { popup: "rounded-xl shadow-md" },
  });
  return Toast.fire({
    title: `${emoji} ${title}`,
    icon: undefined,
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await login(email, password);

      if (!result.success) {
        const msg = result.error ?? "Invalid email or password.";
        await serenitySwal({ title: "Login failed", text: msg, mood: "error" });
        return;
      }

      await serenitySwal({ title: "Welcome back to Serenity!", text: "You’re in. Let’s keep the good vibes rolling 🌈", mood: "success" });
      router.push("/dashboard");
    } catch (err: any) {
      await serenitySwal({ title: "Something went wrong", text: err?.message ?? "Please try again.", mood: "error" });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-cyan-100 p-3 rounded-full">
              <Heart className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
          <h1 className="text-3xl font-sans font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your recovery journey</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-sans text-center">Patient Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to continue your treatment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
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
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                disabled={loading}
                onClick={() => serenityToast("Signing you in…", "info")}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                New patient?{" "}
                <Link
                  href="/signup"
                  className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Are you staff?{" "}
                <Link href="/staff/login" className="text-cyan-600 hover:text-cyan-700 hover:underline">
                  Login as Staff
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
