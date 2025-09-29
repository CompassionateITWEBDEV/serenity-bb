"use client";
import { useEffect, useState } from "react";
import type { StaffProfile } from "@/lib/staff";
import { getCurrentStaff, updateCurrentStaff } from "@/lib/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProfileSettings() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentStaff();
        setProfile(me);
      } catch {
        // swallow
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      const { first_name, last_name, title, department, phone, avatar_url } = profile;
      const updated = await updateCurrentStaff({ first_name, last_name, title, department, phone, avatar_url });
      setProfile(updated);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="First name" value={profile.first_name ?? ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
          <Input placeholder="Last name" value={profile.last_name ?? ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
          <Input placeholder="Title" value={profile.title ?? ""} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
          <Input placeholder="Department (therapy|medical|admin|support)" value={profile.department ?? ""} onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
          <Input placeholder="Phone" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Input placeholder="Avatar URL" value={profile.avatar_url ?? ""} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
