"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/** why: handle both legacy `avatar` URL and new `avatar_path` in Storage */
export function useAvatarUrl(avatar?: string | null, avatar_path?: string | null, signed = false) {
  const [url, setUrl] = useState<string | null>(avatar ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (avatar_path) {
        if (signed) {
          const { data, error } = await supabase.storage.from("avatars").createSignedUrl(avatar_path, 600);
          if (!cancelled) setUrl(error ? avatar ?? null : data?.signedUrl ?? avatar ?? null);
        } else {
          const { data } = supabase.storage.from("avatars").getPublicUrl(avatar_path);
          if (!cancelled) setUrl(data.publicUrl ?? avatar ?? null);
        }
      } else {
        if (!cancelled) setUrl(avatar ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [avatar, avatar_path, signed]);

  return url;
}
