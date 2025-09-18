"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User, Bug } from "lucide-react";

/** ──────────────────────────────────────────────────────────────
 *  QUICK CONFIG
 *  ────────────────────────────────────────────────────────────── */
const UID_COL = "user_id";        // the PK/foreign key on patients table
const USE_SIGNED_URL = false;     // set true only if your avatars bucket is PRIVATE
/** ────────────────────────────────────────────────────────────── */

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
  const [avatarUrl, setAvatarUrl] = useState<string>("/patient-avatar.png");
  const [form, setForm] = useState<FormState>({
    firstName: "", lastName: "", email: "", phoneNumber: "",
    dateOfBirth: "", emergencyName: "", emergencyPhone: "", bio: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const a = (form.firstName || "").charAt(0);
    const b = (form.lastName || "").charAt(0);
    return (a + b || "??").toUpperCase();
  }, [form.firstName, form.lastName]);

  // Debug function to check database setup
  const debugDatabaseSetup = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      
      console.log("=== DATABASE DEBUG ===");
      console.log("User ID:", uid);
      console.log("UID_COL:", UID_COL);
      
      // Check if user can read from patients table
      const { data: allPatients, error: readError } = await supabase
        .from("patients")
        .select("*")
        .limit(5);
      
      console.log("Can read patients table:", !readError);
      console.log("Read error (if any):", readError);
      console.log("Sample patients data:", allPatients);
      
      // Check current user's patient record
      const { data: userPatient, error: userError } = await supabase
        .from("patients")
        .select("*")
        .eq(UID_COL, uid)
        .maybeSingle();
        
      console.log("User's patient record:", userPatient);
      console.log("User query error (if any):", userError);
      
      // Test update permission
      const testUpdate = await supabase
        .from("patients")
        .update({ updated_at: new Date().toISOString() })
        .eq(UID_COL, uid)
        .select("*")
        .maybeSingle();
        
      console.log("Update test result:", testUpdate);
      
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  // Load or seed the patient record
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !sessionData?.session?.user) {
          console.error("Session error:", sessErr);
          setLoading(false);
          return;
        }
        const user = sessionData.session.user;
        const uid = user.id;
        const meta: any = user.user_metadata ?? {};

        console.log("Loading data for user:", uid);

        const selectCols = [
          UID_COL, "first_name", "last_name", "email", "phone_number", "date_of_birth",
          "emergency_contact_name", "emergency_contact_phone", "bio", "avatar",
        ].join(",");

        let { data: row, error: rowErr } = await supabase
          .from("patients")
          .select(selectCols)
          .eq(UID_COL, uid)
          .maybeSingle();
        
        console.log("Existing patient record:", row);
        if (rowErr) console.error("patients select error:", rowErr);

        const first = row?.first_name ?? meta.firstName ?? meta.first_name ?? "";
        const last  = row?.last_name  ?? meta.lastName  ?? meta.last_name  ?? "";
        const email = row?.email ?? user.email ?? "";
        const phone = row?.phone_number ?? meta.phoneNumber ?? meta.phone_number ?? "";
        const dob   = row?.date_of_birth ? toISO(row.date_of_birth) : toISO(meta.dateOfBirth ?? meta.date_of_birth);
        const ecName  = row?.emergency_contact_name ?? meta.emergencyContactName ?? meta.emergency_contact_name ?? "";
        const ecPhone = row?.emergency_contact_phone ?? meta.emergencyContactPhone ?? meta.emergency_contact_phone ?? "";
        const bio     = row?.bio ?? "";
        const avatar  = row?.avatar ?? meta.avatar_url ?? "/patient-avatar.png";

        if (!row) {
          console.log("Creating new patient record...");
          const seed: Record<string, any> = {
            [UID_COL]: uid,
            first_name: first || null,
            last_name: last || null,
            email,
            phone_number: phone || null,
            date_of_birth: dob || null,
            emergency_contact_name: ecName || null,
            emergency_contact_phone: ecPhone || null,
            bio: bio || null,
            avatar: avatar || "/patient-avatar.png",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          // Use INSERT instead of UPSERT for clearer error handling
          const { data: inserted, error: insertError } = await supabase
            .from("patients")
            .insert(seed)
            .select(selectCols)
            .single();
            
          if (insertError) {
            console.error("patients insert error:", insertError);
            // Fallback to upsert if insert fails (record might exist)
            const { data: upserted, error: upsertErr } = await supabase
              .from("patients")
              .upsert(seed, { onConflict: UID_COL })
              .select(selectCols)
              .single();
            if (upsertErr) {
              console.error("patients upsert error:", upsertErr);
            }
            row = upserted ?? (seed as any);
          } else {
            row = inserted;
          }
        } else {
          const patch: any = {};
          if (!row.phone_number && phone) patch.phone_number = phone;
          if (!row.date_of_birth && dob) patch.date_of_birth = dob;
          if (!row.emergency_contact_name && ecName) patch.emergency_contact_name = ecName;
          if (!row.emergency_contact_phone && ecPhone) patch.emergency_contact_phone = ecPhone;
          if (!row.avatar && avatar) patch.avatar = avatar;
          
          if (Object.keys(patch).length) {
            patch.updated_at = new Date().toISOString();
            const { error: patchErr } = await supabase.from("patients").update(patch).eq(UID_COL, uid);
            if (patchErr) console.error("patients patch error:", patchErr);
          }
        }

        setForm({
          firstName: first, lastName: last, email, phoneNumber: phone,
          dateOfBirth: dob || "", emergencyName: ecName, emergencyPhone: ecPhone, bio,
        });
        setAvatarUrl(avatar || "/patient-avatar.png");
        console.log("Data loaded successfully");
      } catch (err) {
        console.error("initial load error:", err);
      } finally {
        setLoading(false);
      }
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

      const { data, error } = await supabase
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
        .eq(UID_COL, uid)
        .select(`${UID_COL},bio`)
        .maybeSingle();
      if (error) throw error;

      // keep auth metadata loosely in sync (optional)
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone_number: form.phoneNumber || null,
          date_of_birth: form.dateOfBirth || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
        },
      });
      if (authErr) throw authErr;

      console.log("Saved bio:", data?.bio);
      alert("Profile saved successfully!");
    } catch (e: any) {
      console.error("save error:", e);
      alert(`Could not save: ${e?.message ?? "Unknown error"}`);
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

      console.log("🔍 Debug info:");
      console.log("User ID:", uid);
      console.log("UID_COL:", UID_COL);

      // First, check if patient record exists
      const { data: existingPatient, error: checkError } = await supabase
        .from("patients")
        .select("*")
        .eq(UID_COL, uid)
        .maybeSingle();

      console.log("Existing patient record:", existingPatient);
      if (checkError) {
        console.error("Error checking patient record:", checkError);
      }

      // sanitize filename & build path that matches RLS (no "avatars/" prefix)
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${Date.now()}-${safe}`;
      console.log("Upload path:", path);

      // upload
      const up = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
      if (up.error) {
        console.error("UPLOAD ERROR:", up.error);
        alert(`Upload failed: ${up.error.message}`);
        return;
      }
      console.log("✅ Upload successful:", up.data);

      // resolve URL (public vs signed)
      let publicUrl: string;
      if (USE_SIGNED_URL) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60 * 24);
        if (signErr) throw signErr;
        publicUrl = signed!.signedUrl;
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        publicUrl = data.publicUrl;
      }
      console.log("Generated URL:", publicUrl);

      // Try different approaches based on whether record exists
      let upd;
      
      if (!existingPatient) {
        console.log("🔄 No patient record found, creating one...");
        // Create the patient record first
        upd = await supabase
          .from("patients")
          .insert({
            [UID_COL]: uid,
            avatar: publicUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select(`${UID_COL},avatar`)
          .single();
      } else {
        console.log("🔄 Updating existing patient record...");
        // Update existing record
        upd = await supabase
          .from("patients")
          .update({ 
            avatar: publicUrl, 
            updated_at: new Date().toISOString() 
          })
          .eq(UID_COL, uid)
          .select(`${UID_COL},avatar`)
          .maybeSingle();
      }

      console.log("Database operation result:", upd);

      if (upd.error) {
        console.error("DB UPDATE/INSERT ERROR:", upd.error);
        alert(`Saved file but failed to update profile: ${upd.error.message}`);
        return;
      }

      if (!upd.data) {
        console.error("No data returned from database operation");
        alert("Failed to update profile. Please check console for details.");
        return;
      }

      console.log("✅ Avatar updated successfully:", upd.data);
      
      // Force a refresh of the avatar in case of caching issues
      const timestamp = new Date().getTime();
      setAvatarUrl(`${publicUrl}?t=${timestamp}`);
      
      alert("Avatar updated successfully!");
      
    } catch (err: any) {
      console.error("❌ Avatar upload flow error:", err);
      alert(`Failed to upload photo: ${err?.message ?? "Unknown error"}`);
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
              {/* Debug Button - Remove in production */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <Button
                  variant="outline"
                  onClick={debugDatabaseSetup}
                  className="mb-2"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Database (Check Console)
                </Button>
                <p className="text-sm text-yellow-700">
                  Click this button and check your browser console for debug information if avatar upload isn't working.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || "/patient-avatar.png"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Button
                    variant="outline"
                    className="mb-2 bg-transparent"
                    type="button"
                    onClick={openFilePicker}
                    disabled={uploading}
                  >
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
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange("dateOfBirth")} disabled={loading} />
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
                <Textarea id="bio" placeholder="Tell us a bit about yourself..." value={form.bio} onChange={onChange("bio")} disabled={loading} />
              </div>

              <Button className="w-full md:w-auto" onClick={onSave} disabled={saving || loading}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Placeholder tabs - you can implement these later */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Notification settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Manage your privacy settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Privacy settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your security preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Security settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Manage your application preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Preferences coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
