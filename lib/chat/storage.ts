import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio";

// Single source of truth for bucket name
export const CHAT_BUCKET =
  (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

function extFromType(m: string) {
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
  return map[m] ?? "bin";
}

const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);

/** Upload and return STORAGE PATH (not URL). */
export async function uploadToStorage(
  file: File | Blob,
  opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext =
    (file as File).name?.split(".").pop()?.toLowerCase() || extFromType(mime);
  const filename = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const path = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}/${filename}`;

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, file, {
      contentType: mime,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("[upload]", error);
    throw error;
  }
  return { path };
}

/** Resolve storage path (or legacy http URL) to a usable URL for <img>/<audio>. */
export async function urlForAttachment(
  attachmentUrlOrPath: string
): Promise<string | null> {
  try {
    if (isHttp(attachmentUrlOrPath)) return attachmentUrlOrPath;

    // Prefer signed URL first (needed for private buckets).
    const signed = await supabase.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(attachmentUrlOrPath, 60 * 60 * 24);
    if (signed?.data?.signedUrl) return signed.data.signedUrl;
  } catch (e) {
    // why: if client role can't sign or RLS blocks, fall back to public URL
    console.warn("[urlForAttachment] signed url failed", e);
  }

  try {
    const pub = supabase.storage
      .from(CHAT_BUCKET)
      .getPublicUrl(attachmentUrlOrPath);
    return pub?.data?.publicUrl ?? null;
  } catch (e) {
    console.warn("[urlForAttachment] public url failed", e);
    return null; // never throw → prevents UI crash
  }
}

/** Insert message, storing the STORAGE PATH in `attachment_url`. */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  path: string; // from uploadToStorage().path
  kind: AttachmentKind; // "image" | "audio"
  senderId?: string;
  senderName?: string;
  patientId?: string;
}) {
  const placeholder = params.kind === "image" ? "(image)" : "(voice note)";
  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    patient_id: params.patientId ?? null,
    sender_id: params.senderId ?? null,
    sender_name: params.senderName ?? null,
    sender_role: params.senderRole,
    content: placeholder,
    read: false,
    urgent: false,
    attachment_url: params.path, // store PATH, not URL
    attachment_type: params.kind,
  });
  if (error) {
    console.error("[messages.insert]", error);
    throw error;
  }
}
