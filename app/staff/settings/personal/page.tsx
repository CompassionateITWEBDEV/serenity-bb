// app/staff/settings/personal/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";

/**
 * Edit Profile — Figma-style list rows with inline editing.
 * Back -> /staff/profile (keeps your Profile -> Settings flow).
 */
export default function EditProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "Alex Martinez",
    phone: "+1 234-567-890",
    email: "yourcompany@gmail.com",
    gender: "Male",
    dob: "1998-07-24", // yyyy-mm-dd
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSave() {
    setError(null);
    // very light checks
    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setSaving(true);
    try {
      // TODO: replace with real action, e.g. await updateStaffProfile(form)
      await new Promise((r) => setTimeout(r, 600));
      router.push("/staff/profile");
    } catch {
      setError("Failed to save changes. Try again.");
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
            onClick={() => router.push("/staff/profile")}
            className="h-9 w-9 rounded-full bg-slate-100 grid place-items-center"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold">Personal Information</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-3">
            <EditableRow
              icon={<User className="h-5 w-5" />}
              label="Full Name"
              value={form.fullName}
              placeholder="Enter full name"
              onChange={(v) => set("fullName", v)}
            />
            <EditableRow
              icon={<Phone className="h-5 w-5" />}
              label="Phone number"
              value={form.phone}
              placeholder="Enter phone"
              onChange={(v) => set("phone", v)}
            />
            <EditableRow
              icon={<Mail className="h-5 w-5" />}
              label="Email address"
              value={form.email}
              type="email"
              placeholder="Enter email"
              onChange={(v) => set("email", v)}
            />
            <EditableRow
              icon={<MapPin className="h-5 w-5" />}
              label="Gender"
              value={form.gender}
              placeholder="Male / Female / Other"
              onChange={(v) => set("gender", v)}
            />
            <EditableRow
              icon={<Calendar className="h-5 w-5" />}
              label="Date of birth"
              value={form.dob}
              type="date"
              onChange={(v) => set("dob", v)}
              formatValue={(v) =>
                // pretty date under the hood
                new Date(v).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              }
            />
          </CardContent>
        </Card>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="fixed left-0 right-0 bottom-0 bg-white/80 backdrop-blur border-t">
          <div className="max-w-md mx-auto px-4 py-3 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => router.push("/staff/profile")}>
              Cancel
            </Button>
            <Button className="w-2/3" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* --- UI helper: a list-like row that becomes editable on focus --- */
function EditableRow({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  formatValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "date";
  placeholder?: string;
  formatValue?: (v: string) => string;
}) {
  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800">{label}</div>

          {/* Input rendered to look like a value line; keeps Figma vibe but editable */}
          <div className="mt-1">
            {type === "date" ? (
              <Input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 max-w-xs"
              />
            ) : (
              <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9"
              />
            )}
          </div>

          {formatValue && value && type === "date" && (
            <div className="mt-1 text-xs text-slate-500">{formatValue(value)}</div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 mt-2 shrink-0" />
      </div>
    </div>
  );
}
