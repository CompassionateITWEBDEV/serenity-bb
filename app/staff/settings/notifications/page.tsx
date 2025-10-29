"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, Bell, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import StaffVerificationStats from "@/components/staff/StaffVerificationStats";

type NotificationPreferences = {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  submission_alerts: boolean;
  message_alerts: boolean;
  appointment_alerts: boolean;
  drug_test_alerts: boolean;
  emergency_alerts: boolean;
};

export default function StaffSettingsNotificationPrefsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    submission_alerts: true,
    message_alerts: true,
    appointment_alerts: true,
    drug_test_alerts: true,
    emergency_alerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      try {
        // Get session token for Bearer auth
        let authHeader = '';
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            authHeader = `Bearer ${session.access_token}`;
            setStaffId(session.user.id);
          }
        } catch (err) {
          console.warn('Failed to get session token:', err);
        }

        const response = await fetch('/api/staff/notification-preferences', {
          credentials: 'include',
          headers: {
            ...(authHeader && { 'Authorization': authHeader }),
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setPrefs(data.preferences);
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          console.error("Error loading preferences:", errorData);
        }
      } catch (err: any) {
        console.error("Error loading preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();

    // Real-time subscription for preference changes
    const channel = supabase
      .channel('staff-notification-preferences')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staff',
          filter: `user_id=eq.${staffId}`,
        },
        (payload) => {
          if (payload.new.notification_preferences) {
            setPrefs(payload.new.notification_preferences as NotificationPreferences);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  async function onSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);
    
    try {
      // Get session token for Bearer auth
      let authHeader = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeader = `Bearer ${session.access_token}`;
        }
      } catch (err) {
        console.warn('Failed to get session token:', err);
      }

      const response = await fetch('/api/staff/notification-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          ...(authHeader && { 'Authorization': authHeader }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: prefs }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }
        const errorMessage = errorData?.error || errorData?.message || "Failed to save preferences. Please try again.";
        setError(errorMessage);
        console.error("Notification preferences error:", errorData);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Failed to save preferences. Please try again.";
      setError(errorMessage);
      console.error("Notification preferences error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-500" />
          <p className="text-slate-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/settings")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center hover:bg-slate-200 transition"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Notification Preferences</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Verified Staff Info */}
        {staffId && (
          <Card className="border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-600" />
                Verified Staff Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaffVerificationStats staffId={staffId} />
            </CardContent>
          </Card>
        )}

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-600" />
              Notification Channels
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Choose how you want to receive real-time notifications
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <ToggleRow 
              label="Email notifications" 
              checked={prefs.email_notifications} 
              onChange={(v) => setPrefs((s) => ({ ...s, email_notifications: v }))} 
            />
            <ToggleRow 
              label="SMS notifications" 
              checked={prefs.sms_notifications} 
              onChange={(v) => setPrefs((s) => ({ ...s, sms_notifications: v }))} 
            />
            <ToggleRow 
              label="Push notifications" 
              checked={prefs.push_notifications} 
              onChange={(v) => setPrefs((s) => ({ ...s, push_notifications: v }))} 
            />
          </CardContent>
        </Card>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Notification Types
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Select which types of events trigger notifications
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <ToggleRow 
              label="Appointment alerts" 
              checked={prefs.appointment_alerts} 
              onChange={(v) => setPrefs((s) => ({ ...s, appointment_alerts: v }))} 
            />
            <ToggleRow 
              label="Message alerts" 
              checked={prefs.message_alerts} 
              onChange={(v) => setPrefs((s) => ({ ...s, message_alerts: v }))} 
            />
            <ToggleRow 
              label="Drug test alerts" 
              checked={prefs.drug_test_alerts} 
              onChange={(v) => setPrefs((s) => ({ ...s, drug_test_alerts: v }))} 
            />
            <ToggleRow 
              label="Submission alerts" 
              checked={prefs.submission_alerts} 
              onChange={(v) => setPrefs((s) => ({ ...s, submission_alerts: v }))} 
            />
            <ToggleRow 
              label="Emergency alerts" 
              checked={prefs.emergency_alerts} 
              onChange={(v) => setPrefs((s) => ({ ...s, emergency_alerts: v }))} 
            />
          </CardContent>
        </Card>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Preferences saved successfully! Changes will apply immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            className="min-w-[200px]" 
            onClick={onSave} 
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save preferences
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full p-0.5 transition ${checked ? "bg-cyan-500" : "bg-slate-300"}`}
        aria-pressed={checked}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
