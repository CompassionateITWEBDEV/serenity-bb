import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio";

const BUCKET = "chat"; // ← use the same bucket your old code used

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

/** Uploads to Storage and returns a public URL. */
export async function uploadToStorage(
  file: File | Blob,
  opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string; publicUrl: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext = (file as File).name ? ((file as File).name.split(".").pop() || extFromType(mime)) : extFromType(mime);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const prefix = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}`;
  const fullPath = `${prefix}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fullPath, file, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    // Why: make failures diagnosable in your console + UI alert already shows generic message
    console.error("[storage.upload] failed", { bucket: BUCKET, fullPath, mime, error });
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
  if (!data?.publicUrl) {
    console.error("[storage.getPublicUrl] returned empty url", { bucket: BUCKET, fullPath });
    throw new Error("No public URL");
  }
  return { path: fullPath, publicUrl: data.publicUrl };
}

/** Inserts an attachment message and bumps conversation preview. */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  url: string;
  kind: AttachmentKind;
}) {
  // Insert message (using 'type' + 'content' = URL)
  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_role: params.senderRole,
    type: params.kind,     // 'image' | 'audio'
    content: params.url,   // URL in content
    read: false,
    urgent: false,
  });
  if (msgErr) {
    console.error("[messages.insert] failed", msgErr);
    throw msgErr;
  }

  // Update conversation preview
  const preview = params.kind === "image" ? "[image]" : "[voice]";
  const { error: convErr } = await supabase
    .from("conversations")
    .update({ last_message: preview, last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  if (convErr) {
    // Non-fatal; UI will still show the new message via realtime
    console.warn("[conversations.update preview] failed", convErr);
  }
}
