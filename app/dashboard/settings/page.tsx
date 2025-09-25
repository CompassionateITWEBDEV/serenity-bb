// path: app/dashboard/settings/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// ❌ REMOVE: import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save } from "lucide-react";
import { supabase } from "@/lib/supabase/client"; // ✅ use the shared, session-aware client

/** ──────────────────────────────────────────────────────────────
 * QUICK CONFIG
 * ────────────────────────────────────────────────────────────── */
const UID_COL = "user_id";
const USE_SIGNED_URL = false; // set true only if Storage bucket "avatars" is PRIVATE
const SIGNED_TTL_SECONDS = 60 * 60 * 24;
/** ────────────────────────────────────────────────────────────── */

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  emergencyName: string;
  emergencyPhone: string;
  bio: string;
};

type PatientRow = {
  [UID_COL]: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bio: string | null;
  avatar_path: string | null;
  updated_at?: string | null;
};

const phoneDigitsOnly = (s: string) => s.replace(/\D/g, "");
const toISO = (s?: string | null) => {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : s;
};
const cacheBust = (url: string) => `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string>("");

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

  const fileRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const a = (form.firstName || "").charAt(0);
    const b = (form.lastName || "").charAt(0);
    return (a + b || "??").toUpperCase();
  }, [form.firstName, form.lastName]);

  async function resolveAvatarUrl(path: string | null) {
    if (!path) {
      setDisplayUrl("");
      return;
    }
    try {
      if (USE_SIGNED_URL) {
        const { data, error } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, SIGNED_TTL_SECONDS);
        if (error) throw error;
        setDisplayUrl(cacheBust(data!.signedUrl));
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setDisplayUrl(cacheBust(data.publicUrl));
      }
      if (typeof window !== "undefined") localStorage.setItem("avatarPath", path);
    } catch (e) {
      console.error("resolveAvatarUrl error:", e);
      setDisplayUrl("");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) throw new Error("Not authenticated");
        const uid = user.id;

        const { data: row, error: rowErr } = await supabase
          .from<PatientRow>("patients")
          .select(
            `${UID_COL},first_name,last_name,email,phone_number,date_of_birth,emergency_contact_name,emergency_contact_phone,bio,avatar_path,updated_at`
          )
          .eq(UID_COL, uid)
          .maybeSingle();
        if (rowErr) console.error("patients select error:", rowErr);

        const meta = user.user_metadata ?? {};
        const first = row?.first_name ?? meta.firstName ?? meta.first_name ?? "";
        const last = row?.last_name ?? meta.lastName ?? meta.last_name ?? "";
        const email = row?.email ?? user.email ?? "";
        const phone = row?.phone_number ?? meta.phoneNumber ?? meta.phone_number ?? "";
        const dob = row?.date_of_birth ? toISO(row.date_of_birth) : toISO(meta.dateOfBirth ?? meta.date_of_birth);
        const ecName = row?.emergency_contact_name ?? meta.emergencyContactName ?? meta.emergency_contact_name ?? "";
        const ecPhone = row?.emergency_contact_phone ?? meta.emergencyContactPhone ?? meta.emergency_contact_phone ?? "";
        const bio = row?.bio ?? "";
        const path = row?.avatar_path ?? null;

        if (!row) {
          const seed: Partial<PatientRow> = {
            [UID_COL]: uid,
            first_name: first || null,
            last_name: last || null,
            email,
            phone_number: phone || null,
            date_of_birth: dob || null,
            emergency_contact_name: ecName || null,
            emergency_contact_phone: ecPhone || null,
            bio: bio || null,
            avatar_path: null,
            updated_at: new Date().toISOString(),
          };
          const ins = await supabase.from("patients").insert(seed).select().single();
          if (ins.error) console.error("seed insert error:", ins.error);
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

        const persistedPath = path ?? (typeof window !== "undefined" ? localStorage.getItem("avatarPath") || null : null);
        setAvatarPath(persistedPath);
        await resolveAvatarUrl(persistedPath);
      } catch (err) {
        console.error("initial load error:", err);
        alert("You must be signed in to edit your settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setForm((f) => ({ ...f, [id]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const payload: Partial<PatientRow> = {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        email: form.email || null,
        phone_number: phoneDigitsOnly(form.phoneNumber) || null,
        date_of_birth: form.dateOfBirth || null,
        emergency_contact_name: form.emergencyName || null,
        emergency_contact_phone: phoneDigitsOnly(form.emergencyPhone) || null,
        bio: form.bio || null,
        updated_at: new Date().toISOString(),
      };

      const upd = await supabase.from("patients").update(payload).eq(UID_COL, uid);
      if (upd.error) throw upd.error;

      window.dispatchEvent(new CustomEvent("profile:updated")); // notify header
      alert("Profile saved.");
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
      if (!uid) throw new Error("Not authenticated"); // this was your 401 source

      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${Date.now()}-${safe}`;

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

      const upd = await supabase
        .from<PatientRow>("patients")
        .update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq(UID_COL, uid);
      if (upd.error) {
        console.error("DB UPDATE ERROR:", upd.error);
        alert(`Saved file but failed to update profile: ${upd.error.message}`);
        return;
      }

      setAvatarPath(path);
      await resolveAvatarUrl(path);
      window.dispatchEvent(new CustomEvent("profile:updated")); // refresh header avatar
      alert("Photo updated.");
    } catch (err: any) {
      console.error("avatar upload flow error:", err);
      alert(`Failed to upload photo: ${err?.message ?? "Unknown error"}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemovePhoto = async () => {
    if (!avatarPath) return;
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      const upd = await supabase
        .from<PatientRow>("patients")
        .update({ avatar_path: null, updated_at: new Date().toISOString() })
        .eq(UID_COL, uid);
      if (upd.error) throw upd.error;

      setAvatarPath(null);
      setDisplayUrl("");
      if (typeof window !== "undefined") localStorage.removeItem("avatarPath");
      window.dispatchEvent(new CustomEvent("profile:updated"));
      alert("Photo removed.");
    } catch (e: any) {
      console.error("remove photo error:", e);
      alert(`Failed to remove photo: ${e?.message ?? "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and privacy settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTr
