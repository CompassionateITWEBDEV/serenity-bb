"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/**
 * Password & Security — moved under /staff/settings/security
 * Why: match staff-scoped settings IA.
 */
export default function StaffSecuritySettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showError, setShowError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowError(null);

    if (!form.next || !form.confirm) {
      setShowError("New password and confirmation are required.");
      return;
    }
    if (form.next !== form.confirm) {
      setShowError("New passwords do not match.");
      return;
    }
    if (form.next.length < 8) {
      setShowError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setShowError(null);
    setShowSuccess(false);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShowError("Not authenticated. Please log in again.");
        return;
      }

      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.next,
      });

      if (updateError) {
        setShowError(updateError.message || "Failed to update password. Please try again.");
        return;
      }

      setShowSuccess(true);
      setForm({ current: "", next: "", confirm: "" });
      
      // Show success and navigate back after a delay
      setTimeout(() => {
        router.push("/staff/settings");
      }, 1500);
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Failed to update password. Please try again.";
      setShowError(errorMessage);
      console.error("Password update error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/settings")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Password & Security</h1>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardContent className="p-4">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Current password</label>
                <Input
                  type="password"
                  value={form.current}
                  onChange={(e) => set("current", e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-600">New password</label>
                <Input
                  type="password"
                  value={form.next}
                  onChange={(e) => set("next", e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-slate-600">Confirm new password</label>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {showError && (
                <p className="text-sm text-rose-600">{showError}</p>
              )}
              {showSuccess && (
                <p className="text-sm text-emerald-600">Password updated successfully!</p>
              )}

              <Button className="w-full" type="submit" disabled={saving}>
                {saving ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
