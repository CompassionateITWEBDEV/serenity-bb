import { supabase } from "@/lib/supabase/client";

export type AttachmentKind = "image" | "audio";

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

/** Upload a file/blob to Supabase Storage and return its public URL. */
export async function uploadToStorage(
  file: File | Blob,
  opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string; publicUrl: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext = extFromType(mime);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const prefix = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}`;
  const fullPath = `${prefix}/${filename}`;

  const { error } = await supabase.storage.from("chat-uploads").upload(fullPath, file, {
    contentType: mime,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("chat-uploads").getPublicUrl(fullPath);
  if (!data?.publicUrl) throw new Error("Failed generating public URL");
  return { path: fullPath, publicUrl: data.publicUrl };
}

/** Insert an attachment message that points to a URL. */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  senderRole: "patient" | "doctor" | "nurse" | "counselor";
  url: string;
  kind: AttachmentKind;
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_role: params.senderRole,
    type: params.kind,           // 'image' | 'audio'
    content: params.url,         // URL to the uploaded media
    read: false,
  });
  if (error) throw error;

  // Optionally bump conversation preview fields
  await supabase.from("conversations")
    .update({
      last_message: params.kind === "image" ? "[image]" : "[voice]",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", params.conversationId);
}
