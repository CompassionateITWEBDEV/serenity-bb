import { supabase } from "@/lib/supabase/client";
export type AttachmentKind = "image" | "audio";
const BUCKET = "chat";

function extFromType(m: string) {
  const map: Record<string,string> = {
    "image/jpeg":"jpg","image/jpg":"jpg","image/png":"png","image/webp":"webp","image/heic":"heic",
    "audio/webm":"webm","audio/ogg":"ogg","audio/mpeg":"mp3","audio/mp4":"m4a","audio/wav":"wav",
  }; return map[m] ?? "bin";
}
const isHttp = (u?: string|null) => !!u && /^https?:\/\//i.test(u);

/** Upload and return STORAGE PATH (not URL) */
export async function uploadToStorage(
  file: File|Blob, opts: { conversationId: string; kind: AttachmentKind; userId?: string }
): Promise<{ path: string }> {
  const mime = (file as File).type || "application/octet-stream";
  const ext = (file as File).name?.split(".").pop()?.toLowerCase() || extFromType(mime);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${opts.conversationId}/${opts.kind}/${opts.userId ?? "n"}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mime, cacheControl: "3600", upsert: false,
  });
  if (error) { console.error("[upload]", error); throw error; }
  return { path };
}

/** Resolve a storage path (or legacy http URL) to a usable URL for <img>/<audio>. */
export async function urlForAttachment(attachmentUrlOrPath: string): Promise<string|null> {
  try {
    if (isHttp(attachmentUrlOrPath)) return attachmentUrlOrPath;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(attachmentUrlOrPath);
    if (pub?.publicUrl) return pub.publicUrl; // bucket public
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(attachmentUrlOrPath, 60*60*24);
    return signed?.signedUrl ?? null; // bucket private
  } catch (e) {
    console.warn("[urlForAttachment] failed", e);
    return null; // never throw → prevents client crash
  }
}

/** Insert message, storing the STORAGE PATH in `attachment_url`. */
export async function sendAttachmentMessage(params: {
  conversationId: string;
  senderRole: "patient"|"doctor"|"nurse"|"counselor";
  path: string;                // <- from uploadToStorage().path
  kind: AttachmentKind;        // "image" | "audio"
  senderId?: string; senderName?: string; patientId?: string;
}) {
  const placeholder = params.kind === "image" ? "(image)" : "(voice note)";
  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    patient_id: params.patientId ?? null,
    sender_id: params.senderId ?? null,
    sender_name: params.senderName ?? null,
    sender_role: params.senderRole,
    content: placeholder,
    read: false, urgent: false,
    attachment_url: params.path,       // <- PATH, not URL
    attachment_type: params.kind,
  });
  if (error) { console.error("[messages.insert]", error); throw error; }
}
