"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Why: You saw “Auth session missing”. This card creates a session via OTP or Google. */
export default function SignInCard() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendMagicLink() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setBusy(false);
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use a magic link or Google.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={sendMagicLink} disabled={!email || busy}>Send Link</Button>
        </div>
        <div className="text-xs text-gray-600">or</div>
        <Button variant="outline" onClick={signInWithGoogle}>Continue with Google</Button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </CardContent>
    </Card>
  );
}
