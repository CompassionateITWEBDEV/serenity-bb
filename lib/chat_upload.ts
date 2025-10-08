import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio";

const BUCKET = "chat"; // same bucket your older code used

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

/** Upload a file/blob to Supabase Storage (bucket: chat) and return its public URL. */
export async function uploadToStorage(
  file: File | Blob,
  opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string; publicUrl: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext =
    (file as File).name?.split(".").pop()?.toLowerCase() ||
    extFromType(mime);
  const filename = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const prefix = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}`;
  const fullPath = `${prefix}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[storage.upload] failed", { BUCKET, fullPath, mime, error });
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
  if (!data?.publicUrl) {
    console.error("[storage.getPublicUrl] empty", { BUCKET, fullPath });
    throw new Error("No public URL");
  }
  return { path: fullPath, publicUrl: data.publicUrl };
}

/** Insert a message row with attachment_url/attachment_type and bump preview. */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  url: string;
  kind: AttachmentKind; // "image" | "audio"
}) {
  // messages.content is NOT NULL → we use a placeholder text
  const placeholder = params.kind === "image" ? "(image)" : "(voice note)";

  const { error: insErr } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    // patient_id, sender_id, sender_name are set by your ChatBox insert path.
    // When using this helper from ChatBox, those are not required because your
    // real-time list uses the same table and will refresh. If your RLS requires
    // them, you can extend this insert with those fields.
    sender_role: params.senderRole,
    content: placeholder,
    read: false,
    urgent: false,
    attachment_url: params.url,
    attachment_type: params.kind, // "image" | "audio"
  });

  if (insErr) {
    console.error("[messages.insert] failed", insErr);
    throw insErr;
  }

  // Bump conversation preview (not critical if it fails)
  const last = params.kind === "image" ? "[image]" : "[voice]";
  const { error: updErr } = await supabase
    .from("conversations")
    .update({ last_message: last, last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  if (updErr) console.warn("[conversations.preview] failed", updErr);
}
