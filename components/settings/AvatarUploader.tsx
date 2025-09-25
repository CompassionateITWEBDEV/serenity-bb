"use client";
import { useRef, useState } from "react";
import { getAccessToken } from "@/lib/supabase/client";
// ...imports omitted for brevity...

async function onSave() {
  const file = fileRef.current?.files?.[0];
  if (!file) return;
  setBusy(true);
  try {
    const token = (await getAccessToken()) ?? "";
    if (!token) throw new Error("Not signed in (no token)");

    const r1 = await fetch("/api/avatar/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    const j1 = await r1.json();
    if (!r1.ok) throw new Error(j1?.error || "Failed to get signed URL");

    const r2 = await fetch(j1.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!r2.ok) throw new Error("Failed to upload");

    const r3 = await fetch("/api/avatar/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path: j1.path }),
    });
    const j3 = await r3.json();
    if (!r3.ok) throw new Error(j3?.error || "Failed to save profile");

    // success UI handling...
  } catch (e: any) {
    setError(e.message ?? "Upload failed");
    alert(`Failed to upload photo: ${e.message}`);
  } finally {
    setBusy(false);
  }
}
