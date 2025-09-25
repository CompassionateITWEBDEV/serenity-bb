// FILE: components/settings/AvatarUploader.tsx  (update: send Bearer token)
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessToken } from "@/lib/supabase/client";

export default function AvatarUploader() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return setError("PNG/JPG/WebP only");
    if (file.size > 3 * 1024 * 1024) return setError("Max 3MB");
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function onSave() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const token = (await getAccessToken()) ?? "";

      // 1) Signed upload URL
      const r1 = await fetch("/api/avatar/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1?.error || "Failed to get signed URL");

      // 2) Upload
      const r2 = await fetch(j1.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!r2.ok) throw new Error("Failed to upload");

      // 3) Commit profile
      const r3 = await fetch("/api/avatar/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ path: j1.path }),
      });
      const j3 = await r3.json();
      if (!r3.ok) throw new Error(j3?.error || "Failed to save profile");

      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      alert("Profile photo updated.");
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-14 w-14 rounded-full overflow-hidden bg-gray-100">
        {preview ? (
          <Image src={preview} alt="Preview" fill className="object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">??</div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Input ref={fileRef} type="file" accept="image/*" onChange={onChange} disabled={busy} />
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={busy || !preview}>Save</Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
