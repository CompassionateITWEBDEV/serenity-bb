import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio";

const BUCKET = "chat";

function extFromType(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
  };
  return map[mime] ?? "bin";
}

function isHttp(u?: string | null): boolean {
  return !!u && /^https?:\/\//i.test(u);
}

/**
 * Upload a file/blob to Supabase Storage and return its STORAGE PATH.
 * Why: path is stable and works for both public & private buckets.
 */
export async function uploadToStorage(
  file: File | Blob,
  opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string; signedUrl: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext = (file as File).name?.split(".").pop()?.toLowerCase() || extFromType(mime);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const prefix = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}`;
  const fullPath = `${prefix}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    // why: usually happens when bucket is private or RLS; we surface details
    console.error("[storage.upload] failed", { BUCKET, fullPath, mime, error });
    throw error;
  }

  // Return a short-lived signed URL for immediate local preview (optional).
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 60 * 60); // 1h
  return { path: fullPath, signedUrl: signed?.signedUrl ?? "" };
}

/**
 * Resolve a message's attachment_url (path or legacy http) to a usable URL.
 * - If it's already http(s) → return as-is (legacy data from public buckets).
 * - Else treat it as a storage path and return public or signed URL.
 */
export async function urlForAttachment(attachmentUrlOrPath: string): Promise<string> {
  if (isHttp(attachmentUrlOrPath)) return attachmentUrlOrPath;

  // Try public URL (works when bucket or object is public)
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(attachmentUrlOrPath);
  if (pub?.publicUrl) return pub.publicUrl;

  // Private bucket → sign it
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(attachmentUrlOrPath, 60 * 60 * 24); // 24h
  if (error || !signed?.signedUrl) {
    console.error("[storage.createSignedUrl] failed", { BUCKET, attachmentUrlOrPath, error });
    throw new Error("Cannot resolve attachment URL");
  }
  return signed.signedUrl;
}

/**
 * Insert a message row and store the STORAGE PATH in `attachment_url`.
 * DO NOT store public URLs for private buckets; receivers will fail to load.
 */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  patientId?: string; // include if your RLS demands these fields
  senderId?: string;
  senderName?: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  path: string;          // STORAGE PATH from uploadToStorage().path
  kind: AttachmentKind;  // "image" | "audio"
}) {
  const placeholder = params.kind === "image" ? "(image)" : "(voice note)";

  const { error: insErr } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    patient_id: params.patientId ?? null,
    sender_id: params.senderId ?? null,
    sender_name: params.senderName ?? null,
    sender_role: params.senderRole,
    content: placeholder,         // content is NOT NULL → keep a small placeholder
    read: false,
    urgent: false,
    attachment_url: params.path,  // store PATH, not URL
    attachment_type: params.kind,
  });

  if (insErr) {
    console.error("[messages.insert] failed", insErr);
    throw insErr;
  }

  // Optional: update conversation preview
  const last = params.kind === "image" ? "[image]" : "[voice]";
  await supabase
    .from("conversations")
    .update({ last_message: last, last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId)
    .then(({ error }) => error && console.warn("[conversations.preview] failed", error));
}
