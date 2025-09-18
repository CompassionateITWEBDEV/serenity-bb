"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User } from "lucide-react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string; // YYYY-MM-DD
  emergencyName: string;
  emergencyPhone: string;
  bio: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const toISO = (v?: string | null) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : s;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>("/patient-avatar.png");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    emergencyName: "",
    emergencyPhone: "",
    bio: "",
  });

  const initials = useMemo(() => {
    const a = (form.firstName || "").charAt(0);
    const b = (form.lastName || "").charAt(0);
    return (a + b || "??").toUpperCase();
  }, [form.firstName, form.lastName]);

  // Load profile; if the patients row is missing/incomplete, seed/patch it from auth metadata
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessionData?.session?.user) {
        setLoading(false);
        return;
      }
      const user = sessionData.session.user;
      const uid = user.id;
      const meta: any = user.user_metadata ?? {};

      // Pull row (include avatar)
      let { data: row } = await supabase
        .from("patients")
        .select(
          "user_id,first_name,last_name,email,phone_number,date_of_birth,emergency_contact_name,emergency_contact_phone,bio,avatar"
        )
        .eq("user_id", uid)
        .maybeSingle();

      // Merge DB + auth metadata
      const first = row?.first_name ?? meta.firstName ?? meta.first_name ?? "";
      const last  = row?.last_name  ?? meta.lastName  ?? meta.last_name  ?? "";
      const email = row?.email ?? user.email ?? "";
      const phone = row?.phone_number ?? meta.phoneNumber ?? meta.phone_number ?? "";
      const dob   = row?.date_of_birth ? toISO(row.date_of_birth) : toISO(meta.dateOfBirth ?? meta.date_of_birth);
      const ecName  = row?.emergency_contact_name ?? meta.emergencyContactName ?? meta.emergency_contact_name ?? "";
      const ecPhone = row?.emergency_contact_phone ?? meta.emergencyContactPhone ?? meta.emergency_contact_phone ?? "";
      const bio     = row?.bio ?? "";
      const avatar  = row?.avatar ?? meta.avatar_url ?? "/patient-avatar.png";

      // Self-heal: create or patch row so Settings always shows what user supplied at signup
      if (!row) {
        const seed = {
          user_id: uid,
          first_name: first || null,
          last_name: last || null,
          email,
          phone_number: phone || null,
          date_of_birth: dob || null,
          emergency_contact_name: ecName || null,
          emergency_contact_phone: ecPhone || null,
          bio: bio || null,
          avatar: avatar || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: inserted } = await supabase
          .from("patients")
          .upsert(seed, { onConflict: "user_id" })
          .select()
          .maybeSingle();
        row = inserted ?? (seed as any);
      } else {
        const patch: any = {};
        if (!row.phone_number && phone) patch.phone_number = phone;
        if (!row.date_of_birth && dob) patch.date_of_birth = dob;
        if (!row.emergency_contact_name && ecName) patch.emergency_contact_name = ecName;
        if (!row.emergency_contact_phone && ecPhone) patch.emergency_contact_phone = ecPhone;
        if (!row.avatar && avatar) patch.avatar = avatar;
        if (Object.keys(patch).length) {
          patch.updated_at = new Date().toISOString();
          await supabase.from("patients").update(patch).eq("user_id", uid);
        }
      }

      setForm({
        firstName: first,
        lastName: last,
        email,
        phoneNumber: phone,
        dateOfBirth: dob || "",
        emergencyName: ecName,
        emergencyPhone: ecPhone,
        bio,
      });
      setAvatarUrl(avatar || "/patient-avatar.png");
      setLoading(false);
    })();
  }, []);

  const onChange =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Update patients
      const { error: upErr } = await supabase
        .from("patients")
        .update({
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone_number: form.phoneNumber,
          date_of_birth: form.dateOfBirth || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
          bio: form.bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);
      if (upErr) throw upErr;

      // Keep auth metadata in sync so other screens pulling from metadata see the same info
      await supabase.auth.updateUser({
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone_number: form.phoneNumber || null,
          date_of_birth: form.dateOfBirth || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // === Avatar upload ===
  const openFilePicker = () => fileRef.current?.click();

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      alert("Image must be ≤ 1MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Upload to Storage (bucket: avatars)
      const path = `avatars/${uid}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      // Save to DB + auth metadata
      await supabase.from("patients").update({ avatar: publicUrl, updated_at: new Date().toISOString() }).eq("user_id", uid);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

      // Update UI
      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and privacy settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and profile picture</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || "/patient-avatar.png"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="mb-2 bg-transparent" type="button" onClick={openFilePicker} disabled={uploading}>
                    <Camera className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Change Photo"}
                  </Button>
                  <p className="text-sm text-gray-600">JPG, GIF or PNG. 1MB max.</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={form.firstName} onChange={onChange("firstName")} disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={form.lastName} onChange={onChange("lastName")} disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={onChange("email")} disabled />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={form.phoneNumber} onChange={onChange("phoneNumber")} disabled={loading} />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={onChange("dateOfBirth")}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={form.emergencyName ? `${form.emergencyName} - ${form.emergencyPhone}` : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const [name, phone] = val.split(" - ");
                      setForm((f) => ({ ...f, emergencyName: name ?? "", emergencyPhone: phone ?? "" }));
                    }}
                    placeholder="Name - Phone"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself..."
                  value={form.bio}
                  onChange={onChange("bio")}
                  disabled={loading}
                />
              </div>

              <Button className="w-full md:w-auto" onClick={onSave} disabled={saving || loading}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
