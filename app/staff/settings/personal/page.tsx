// app/staff/settings/personal/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Briefcase,
  Building,
} from "lucide-react";
import { getCurrentStaff, updateCurrentStaff, type StaffProfile } from "@/lib/staff";

// Valid department values as per staff_department_check constraint
// Note: Using "none" as a special value (not empty string) since Select.Item cannot have empty string value
const VALID_DEPARTMENTS = [
  { value: "none", label: "None" },
  { value: "therapy", label: "Therapy" },
  { value: "medical", label: "Medical" },
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
] as const;

/**
 * Edit Profile — Figma-style list rows with inline editing.
 * Loads and saves real staff profile data from Supabase.
 */
export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    title: "",
    department: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load profile data on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const staff = await getCurrentStaff();
        if (!staff) {
          setError("No staff profile found. Please contact support.");
          return;
        }
        setProfile(staff);
        setForm({
          firstName: staff.first_name || "",
          lastName: staff.last_name || "",
          phone: staff.phone || "",
          title: staff.title || "",
          // Convert null/empty to "none" for the Select component (which doesn't allow empty string)
          department: staff.department ? staff.department.toLowerCase() : "none",
        });
      } catch (err: any) {
        console.error("Failed to load profile:", err);
        setError(err?.message || "Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSave() {
    setError(null);
    setSuccess(false);
    
    // Validation
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    try {
      // Build update patch - only include department if it's not empty
      // This avoids check constraint violations when department is null/empty
      const updatePatch: any = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        phone: form.phone.trim() || null,
        title: form.title.trim() || null,
      };
      
      // Normalize department to lowercase and set to null if empty or "none"
      // Valid values per staff_department_check: null, 'therapy', 'medical', 'admin', 'support'
      const deptTrimmed = form.department.trim().toLowerCase();
      if (deptTrimmed && deptTrimmed !== 'none' && ['therapy', 'medical', 'admin', 'support'].includes(deptTrimmed)) {
        updatePatch.department = deptTrimmed;
      } else {
        updatePatch.department = null;
      }

      // Debug logging
      console.log("🔍 Attempting to update staff profile with:", updatePatch);
      console.log("🔍 Department value being sent:", updatePatch.department);

      // This directly updates the 'staff' table in Supabase
      // updateCurrentStaff() uses: supabase.from("staff").update(patch).eq("user_id", uid)
      const updated = await updateCurrentStaff(updatePatch);
      
      console.log("✅ Update response received:", updated);
      
      // Verify update was successful by checking returned data
      if (!updated) {
        throw new Error("Update completed but no data returned");
      }
      
      setProfile(updated);
      setSuccess(true);
      
      console.log("Profile updated successfully in Supabase:", updated);
      
      // Show success message briefly, then navigate back
      setTimeout(() => {
        router.push("/staff/settings");
      }, 1000);
    } catch (err: any) {
      let errorMessage = err?.message || err?.toString() || "Failed to save changes. Please try again.";
      
      // Check for specific Supabase error codes
      if (err?.code === "PGRST116") {
        errorMessage = "Profile not found. Please contact support.";
      } else if (err?.code === "42501") {
        errorMessage = "Permission denied. You may not have access to update this profile.";
      } else if (err?.message?.includes("staff_department_check") || err?.message?.includes("check constraint")) {
        // Department check constraint violation
        errorMessage = "Invalid department value. Please use a valid department name or leave it empty. Contact support for valid department options.";
      }
      
      setError(errorMessage);
      console.error("Profile update error (Supabase):", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-sm text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-50">
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
        <main className="max-w-md mx-auto p-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-rose-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push("/staff/profile")}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
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
          <h1 className="text-lg font-semibold">Personal Information</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-24">
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-3">
            <EditableRow
              icon={<User className="h-5 w-5" />}
              label="First Name"
              value={form.firstName}
              placeholder="Enter first name"
              onChange={(v) => set("firstName", v)}
            />
            <EditableRow
              icon={<User className="h-5 w-5" />}
              label="Last Name"
              value={form.lastName}
              placeholder="Enter last name"
              onChange={(v) => set("lastName", v)}
            />
            <EditableRow
              icon={<Mail className="h-5 w-5" />}
              label="Email address"
              value={profile?.email || ""}
              type="email"
              placeholder="Email"
              disabled
            />
            <EditableRow
              icon={<Phone className="h-5 w-5" />}
              label="Phone number"
              value={form.phone}
              placeholder="Enter phone number"
              onChange={(v) => set("phone", v)}
            />
            <EditableRow
              icon={<Briefcase className="h-5 w-5" />}
              label="Title"
              value={form.title}
              placeholder="e.g., Doctor, Nurse, Therapist"
              onChange={(v) => set("title", v)}
            />
            <DepartmentSelectRow
              icon={<Building className="h-5 w-5" />}
              label="Department"
              value={form.department}
              onChange={(v) => set("department", v)}
            />
          </CardContent>
        </Card>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-600">Profile updated successfully!</p>}

        <div className="fixed left-0 right-0 bottom-0 bg-white/80 backdrop-blur border-t">
          <div className="max-w-md mx-auto px-4 py-3 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => router.push("/staff/settings")}>
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
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: "text" | "email" | "date";
  placeholder?: string;
  formatValue?: (v: string) => string;
  disabled?: boolean;
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
                onChange={(e) => onChange?.(e.target.value)}
                className="h-9 max-w-xs"
                disabled={disabled}
              />
            ) : (
              <Input
                type={type}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                className="h-9"
                disabled={disabled}
              />
            )}
          </div>

          {formatValue && value && type === "date" && (
            <div className="mt-1 text-xs text-slate-500">{formatValue(value)}</div>
          )}
        </div>
        {!disabled && <ChevronRight className="h-4 w-4 text-slate-300 mt-2 shrink-0" />}
      </div>
    </div>
  );
}

/* --- Department Select Row: dropdown matching EditableRow style --- */
function DepartmentSelectRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800">{label}</div>
          <div className="mt-1">
            <Select
              value={value || "none"}
              onValueChange={(v) => onChange?.(v)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {VALID_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 mt-2 shrink-0" />
      </div>
    </div>
  );
}
