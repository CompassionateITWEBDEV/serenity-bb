"use client"

import { useEffect, useMemo, useState } from "react";
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Load patient profile for the logged-in user
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessionData?.session?.user) {
        setLoading(false);
        return;
      }
      const user = sessionData.session.user;

      const { data: row } = await supabase
        .from("patients")
        .select(
          "first_name,last_name,email,phone_number,date_of_birth,emergency_contact_name,emergency_contact_phone,bio"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      const meta: any = user.user_metadata ?? {};
      const first = row?.first_name ?? meta.firstName ?? meta.first_name ?? "";
      const last = row?.last_name ?? meta.lastName ?? meta.last_name ?? "";

      const dobISO =
        row?.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)
          ? row.date_of_birth
          : row?.date_of_birth
          ? new Date(row.date_of_birth).toISOString().slice(0, 10)
          : "";

      setForm({
        firstName: first,
        lastName: last,
        email: row?.email ?? user.email ?? "",
        phoneNumber: row?.phone_number ?? "",
        dateOfBirth: dobISO,
        emergencyName: row?.emergency_contact_name ?? "",
        emergencyPhone: row?.emergency_contact_phone ?? "",
        bio: row?.bio ?? "",
      });
      setLoading(false);
    })();
  }, []); // <-- this was missing

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

      await supabase.auth.updateUser({
        data: { first_name: form.firstName, last_name: form.lastName },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
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
                  <AvatarImage src="/patient-avatar.png" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="mb-2 bg-transparent" type="button" disabled>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <p className="text-sm text-gray-600">JPG, GIF or PNG. 1MB max.</p>
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
