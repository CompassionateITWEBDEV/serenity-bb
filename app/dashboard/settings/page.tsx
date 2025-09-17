"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Settings, User, Bell, Shield, Smartphone, Mail, Save, Camera } from "lucide-react"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    appointments: true,
    medications: true,
    progress: false,
    messages: true,
    emergencyAlerts: true,
  })

  const [privacy, setPrivacy] = useState({
    shareProgress: false,
    allowResearch: true,
    dataCollection: true,
  })

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
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="mb-2 bg-transparent">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <p className="text-sm text-gray-600">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" defaultValue="1990-01-01" />
                </div>
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input id="emergencyContact" defaultValue="Jane Doe - (555) 987-6543" />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us a bit about yourself..."
                  defaultValue="Patient at Serenity Rehabilitation Center focusing on recovery and wellness."
                />
              </div>

              <Button className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about important updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="appointments">Appointment Reminders</Label>
                    <p className="text-sm text-gray-600">Get notified about upcoming appointments</p>
                  </div>
                  <Switch
                    id="appointments"
                    checked={notifications.appointments}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, appointments: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="medications">Medication Reminders</Label>
                    <p className="text-sm text-gray-600">Reminders to take your medications</p>
                  </div>
                  <Switch
                    id="medications"
                    checked={notifications.medications}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, medications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="progress">Progress Updates</Label>
                    <p className="text-sm text-gray-600">Weekly progress reports and milestones</p>
                  </div>
                  <Switch
                    id="progress"
                    checked={notifications.progress}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, progress: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="messages">New Messages</Label>
                    <p className="text-sm text-gray-600">Messages from your healthcare team</p>
                  </div>
                  <Switch
                    id="messages"
                    checked={notifications.messages}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, messages: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emergencyAlerts">Emergency Alerts</Label>
                    <p className="text-sm text-gray-600">Critical health and safety notifications</p>
                  </div>
                  <Switch
                    id="emergencyAlerts"
                    checked={notifications.emergencyAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emergencyAlerts: checked })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Notification Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Email</span>
                    </div>
                    <Switch defaultChecked />
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="font-medium">SMS</span>
                    </div>
                    <Switch defaultChecked />
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="h-4 w-4" />
                      <span className="font-medium">Push</span>
                    </div>
                    <Switch defaultChecked />
                  </Card>
                </div>
              </div>

              <Button className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>Control how your data is used and shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shareProgress">Share Progress with Family</Label>
                    <p className="text-sm text-gray-600">Allow family members to view your recovery progress</p>
                  </div>
                  <Switch
                    id="shareProgress"
                    checked={privacy.shareProgress}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, shareProgress: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowResearch">Participate in Research</Label>
                    <p className="text-sm text-gray-600">Help improve treatment by sharing anonymized data</p>
                  </div>
                  <Switch
                    id="allowResearch"
                    checked={privacy.allowResearch}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, allowResearch: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dataCollection">Analytics & Improvement</Label>
                    <p className="text-sm text-gray-600">Help us improve the app with usage analytics</p>
                  </div>
                  <Switch
                    id="dataCollection"
                    checked={privacy.dataCollection}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, dataCollection: checked })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Data Management</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    Request Data Deletion
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    View Privacy Policy
                  </Button>
                </div>
              </div>

              <Button className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Authentication</p>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Badge variant="outline">Not Enabled</Badge>
                </div>
                <Button variant="outline" className="mt-3 bg-transparent">
                  Enable 2FA
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Active Sessions</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-gray-600">Chrome on Windows • Active now</p>
                    </div>
                    <Badge variant="secondary">Current</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Mobile App</p>
                      <p className="text-sm text-gray-600">iOS App • 2 hours ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>

              <Button className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Update Security
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                App Preferences
              </CardTitle>
              <CardDescription>Customize your app experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="cst">Central Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue="mdy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoSave">Auto-save Progress</Label>
                    <p className="text-sm text-gray-600">Automatically save your progress in games and activities</p>
                  </div>
                  <Switch id="autoSave" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="soundEffects">Sound Effects</Label>
                    <p className="text-sm text-gray-600">Play sounds for notifications and interactions</p>
                  </div>
                  <Switch id="soundEffects" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations">Animations</Label>
                    <p className="text-sm text-gray-600">Enable smooth transitions and animations</p>
                  </div>
                  <Switch id="animations" defaultChecked />
                </div>
              </div>

              <Button className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />"use client";

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

      // fetch patient's row
      const { data: row, error } = await supabase
        .from("patients")
        .select(
          "first_name,last_name,email,phone_number,date_of_birth,emergency_contact_name,emergency_contact_phone,bio"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      // map to form state (fallback to auth metadata if row fields are empty)
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
  }, []);

  const onChange =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Save to DB and update auth metadata names
  const onSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // update patients row (RLS must be auth.uid() = user_id)
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

      // keep auth metadata in sync (so other pages mapping from metadata see correct names)
      await supabase.auth.updateUser({
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
        },
      });
      // optionally: toast success
    } catch (e) {
      // optionally: toast error
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
                      // simple split "Name - Phone" to two fields
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

        {/* keep your other tabs (notifications/privacy/security/preferences) as-is */}
      </Tabs>
    </div>
  );
}

                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
