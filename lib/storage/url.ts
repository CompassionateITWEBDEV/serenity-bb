export const CHAT_BUCKET =
  (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

export function publicUrlForAttachment(attachmentUrlOrPath?: string | null) {
  if (!attachmentUrlOrPath) return null;
  if (/^https?:\/\//i.test(attachmentUrlOrPath)) return attachmentUrlOrPath;
  const u = new URL("/api/chat/file", typeof window === "undefined" ? "http://localhost" : window.location.origin);
  u.searchParams.set("bucket", CHAT_BUCKET);
  u.searchParams.set("path", attachmentUrlOrPath);
  return u.pathname + "?" + u.searchParams.toString(); // relative URL for client
}
