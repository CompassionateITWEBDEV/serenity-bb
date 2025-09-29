"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldPlus } from "lucide-react";

/* Serenity SweetAlert helpers (happy vibes + emojis) */
async function serenitySwal(opts: { title: string; text?: string; mood: "success"|"error"|"info" }) {
  const Swal = (await import("sweetalert2")).default;
  const theme = opts.mood === "success"
    ? { emoji: "💙✨", backdrop: "linear-gradient(135deg,#ecfeff,#eef2ff)" }
    : opts.mood === "error"
    ? { emoji: "😅💤", backdrop: "linear-gradient(135deg,#fff1f2,#fee2e2)" }
    : { emoji: "🌤️😊", backdrop: "linear-gradient(135deg,#f0fdfa,#e0f2fe)" };

  return Swal.fire({
    title: opts.title,
    text: opts.text,
    icon: undefined,
    iconHtml: `<div style="font-size:32px;line-height:1">${theme.emoji}</div>`,
    background: "#ffffff",
    color: "#0f172a",
    backdrop: theme.backdrop,
    confirmButtonColor: "#06b6d4",
    showConfirmButton: true,
    customClass: { popup: "rounded-2xl shadow-xl", confirmButton: "rounded-xl", title: "font-semibold" },
    timer: opts.mood === "success" ? 1400 : undefined,
  });
}

export default function StaffSignUpPage() {
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!first || !last || !email || !pw || !cpw) {
      await serenitySwal({ title: "Missing info", text: "Please fill out all fields 🙏", mood: "info" });
      return;
    }
    if (pw.length < 8) {
      await serenitySwal({ title: "Weak password", text: "Use at least 8 characters 💪", mood: "error" });
      return;
    }
    if (pw !== cpw) {
      await serenitySwal({ title: "Passwords don’t match", text: "Please retype them 🙂", mood: "error" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/staff/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: first, lastName: last, email, password: pw }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        await serenitySwal({
          title: "Couldn’t create account",
          text: body?.error || "Please check your details and try again.",
          mood: "error",
        });
        return;
      }

      await serenitySwal({
        title: "Welcome to Serenity Team!",
        text: "Your staff account is ready. Let’s do great things 💙",
        mood: "success",
      });

      router.push("/staff/dashboard");
    } catch (err: any) {
      await serenitySwal({ title: "Unexpected error", text: err?.message ?? "Please try again.", mood: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-cyan-100 p-3 rounded-full">
              <ShieldPlus className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
          <h1 className="text-3xl font-sans font-bold text-gray-900 mb-2">Sign Up for Connected Care</h1>
          <p className="text-gray-600">Create your staff account to continue</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Staff Sign Up</CardTitle>
            <CardDescription className="text-center">Use your work details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last">Last name</Label>
                  <Input id="last" value={last} onChange={(e) => setLast(e.target.value)} required className="h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    minLength={8}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpw">Confirm password</Label>
                <Input
                  id="cpw"
                  type={showPw ? "text" : "password"}
                  value={cpw}
                  onChange={(e) => setCpw(e.target.value)}
                  minLength={8}
                  required
                  className="h-11"
                />
              </div>

              <Button type="submit" disabled={busy} className="w-full h-11 bg-cyan-600 hover:bg-cyan-700">
                {busy ? "Creating account…" : "Sign Up"}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/staff/login" className="text-cyan-600 hover:text-cyan-700 hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
