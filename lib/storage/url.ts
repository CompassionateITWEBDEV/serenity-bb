// lib/storage/url.ts
export const CHAT_BUCKET =
  (process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET ?? "chat").trim();

/** Build a browser-usable URL to our proxy route. */
export function publicUrlForAttachment(pathOrUrl?: string | null) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // legacy direct URLs
  const base =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL ?? ""
      : window.location.origin;
  const u = new URL("/api/chat/file", base || "http://localhost");
  u.searchParams.set("bucket", CHAT_BUCKET);
  u.searchParams.set("path", pathOrUrl);
  // relative URL keeps it portable between domains
  return u.pathname + "?" + u.searchParams.toString();
}
