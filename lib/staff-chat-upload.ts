import { createClient } from "@/lib/supabase/client";

const STORAGE_BUCKET = "staff-chat-attachments";

export interface UploadOptions {
  kind: "image" | "audio";
  userId: string;
  roleGroup?: string | null;
}

/**
 * Upload a file to Supabase storage for staff group chat
 * @param blob The file blob to upload
 * @param options Upload options including kind, userId, and optional roleGroup
 * @returns The storage path of the uploaded file
 */
export async function uploadStaffChatFile(
  blob: Blob,
  options: UploadOptions
): Promise<string> {
  const supabase = createClient();
  
  // Get current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = options.kind === "image" 
    ? (blob.type.includes("png") ? "png" : "jpg") 
    : "webm";
  const filename = `${options.userId}/${timestamp}-${random}.${extension}`;
  
  // Determine folder based on role group
  const folder = options.roleGroup || "all";
  const path = `${folder}/${filename}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (!data?.path) {
    throw new Error("Upload succeeded but no path returned");
  }

  return data.path;
}

/**
 * Convert a storage path to a signed URL (for private buckets) or public URL
 * @param path The storage path (e.g., "all/user-id/timestamp-random.ext")
 * @returns Signed or public URL to access the file, or null if path is invalid
 */
export async function urlFromStaffChatPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;

  const supabase = createClient();

  try {
    // If it's already a full URL, return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // Try to get a signed URL first (for private buckets)
    // Signed URLs expire after 1 hour by default
    const { data: signedData, error: signedError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 3600); // Valid for 1 hour

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    // Fallback to public URL if signed URL fails (for public buckets)
    console.warn("Signed URL failed, trying public URL:", signedError);
    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return publicData?.publicUrl || null;
  } catch (error) {
    console.error("Error getting attachment URL:", error);
    return null;
  }
}

