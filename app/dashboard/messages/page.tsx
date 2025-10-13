"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Phone,
  Video,
  Send,
  Image as ImageIcon,
  Camera,
  Mic,
  MessageCircle,
  Search,
  Plus,
  X,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import MessageMedia, { MessageMeta } from "@/components/chat/MessageMedia";
import { chatUploadToPath } from "@/lib/chat/storage";

// NEW: calling utilities
import IncomingCallBanner from "@/components/call/IncomingCallBanner";
import CallDialog, {
  type CallMode,
  type CallRole,
} from "@/components/call/CallDialog";
import {
  userRingChannel,
  sendRing,
  sendHangupToUser,
} from "@/lib/webrtc/signaling";

/* ------------------------------- Types ---------------------------------- */
type ProviderRole = "doctor" | "nurse" | "counselor";
type MessageRow = {
  id: string;
  conversation_id: string;
  patient_id: string | null;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | ProviderRole;
  content: string;
  created_at: string;
  read: boolean;
  urgent: boolean;
  meta?: MessageMeta | null;
  attachment_url?: string | null;
  attachment_type?: "image" | "audio" | "file" | null;
};
type Conversation = {
  id: string;
  patient_id: string;
  provider_id: string;
  provider_name: string | null;
  provider_role: ProviderRole | null;
  provider_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};
type StaffRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

/* ---------------------------- Utils/helpers ----------------------------- */
function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------ Page (PATIENT) -------------------------- */
export default function DashboardMessagesPage() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<{
    blob: Blob;
    type: "image" | "audio" | "file";
    name?: string;
    previewUrl: string;
    duration_sec?: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    },
    [draft?.previewUrl]
  );

  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  // CALL: role/mode + modal state + incoming ring
  const [callOpen, setCallOpen] = useState(false);
  const [callRole, setCallRole] = useState<CallRole>("caller");
  const [callMode, setCallMode] = useState<CallMode>("audio");
  const [incoming, setIncoming] = useState<{
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: CallMode;
  } | null>(null);

  const [sidebarTab, setSidebarTab] = useState<"convs" | "staff">("convs");

  /* ------------------------- Auth ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) {
        location.href = "/login";
        return;
      }

      const { data: p } = await supabase
        .from("patients")
        .select("user_id, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (!p?.user_id) {
        await Swal.fire("Access denied", "This page is for patients.", "error");
        location.href = "/";
        return;
      }

      const name =
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        au.user?.email ||
        "Me";

      setMe({ id: uid, name });
      setLoading(false);

      // ✅ Attach Realtime WebRTC debug listener after login
      import("@/lib/webrtc/signaling").then(({ attachDebugListener }) => {
        try {
          attachDebugListener(uid);
          console.log("[RTC DEBUG] WebRTC listener attached for", uid);
        } catch (err) {
          console.error("[RTC DEBUG] Failed to attach listener:", err);
        }
      });
    })();
  }, []);

  /* ------------------------ Load convos ------------------ */
  const reloadConversations = useCallback(async (patientId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at"
      )
      .eq("patient_id", patientId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      await Swal.fire("Load error", error.message, "error");
      return;
    }
    setConvs((data as Conversation[]) || []);
  }, []);
  useEffect(() => {
    if (me?.id) void reloadConversations(me.id);
  }, [me?.id, reloadConversations]);

  /* ----------------------------- Staff dir ------------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select(
        "user_id, first_name, last_name, email, role, phone, avatar_url"
      )
      .order("first_name", { ascending: true });
    if (error) {
      await Swal.fire("Load error", error.message, "error");
      return;
    }
    setStaffDir((data as StaffRow[]) || []);
  }, []);
  useEffect(() => {
    if (me) void fetchStaff();
  }, [me, fetchStaff]);

  /* --------- Thread subscribe ----------- */
  useEffect(() => {
    if (!selectedId || !me) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) {
        await Swal.fire("Load error", error.message, "error");
        return;
      }
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({ top: listRef.current!.scrollHeight })
        );
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`, { config: { presence: { key: me.id } } })
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "messages",
          event: "INSERT",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as MessageRow]);
          requestAnimationFrame(() =>
            listRef.current?.scrollTo({
              top: listRef.current!.scrollHeight,
              behavior: "smooth",
            })
          );
        }
      );
    void ch.subscribe();

    const ping = () => {
      try {
        ch.track({ user_id: me.id, at: Date.now() });
      } catch {}
    };
    const keepAlive = setInterval(ping, 1500);
    ping();

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [selectedId, me]);

  /* -------------------- Incoming ring -------------------- */
  useEffect(() => {
    if (!me?.id) return;
    const ch = userRingChannel(me.id);

    ch.on("broadcast", { event: "ring" }, (p) => {
      const { conversationId, fromId, fromName, mode } =
        (p.payload || {}) as any;
      if (!conversationId || !fromId) return;
      setSelectedId((curr) => curr || conversationId);
      setIncoming({
        conversationId,
        fromId,
        fromName: fromName || "Caller",
        mode: (mode || "audio") as CallMode,
      });
    });

    ch.on("broadcast", { event: "hangup" }, () => {
      setIncoming(null);
      setCallOpen(false);
    });

    ch.subscribe();
    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [me?.id]);

  /* --------------------------------- Staff → Conversation -------------------------------- */
  async function ensureConversationWith(providerUserId: string) {
    if (!me?.id) return;
    const staff = staffDir.find((s) => s.user_id === providerUserId);
    const provider_name =
      [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") ||
      staff?.email ||
      "Staff";

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", me.id)
      .eq("provider_id", providerUserId)
      .maybeSingle();
    if (existing?.id) {
      setSelectedId(existing.id);
      setSidebarTab("convs");
      return;
    }

    const { data: created, error } = await supabase
      .from("conversations")
      .upsert(
        {
          patient_id: me.id,
          provider_id: providerUserId,
          provider_name,
          provider_role: (staff?.role as ProviderRole | null) ?? null,
          provider_avatar: staff?.avatar_url ?? null,
          last_message: null,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "patient_id,provider_id" }
      )
      .select(
        "id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at"
      )
      .single();

    if (error) {
      await Swal.fire("Cannot start chat", error.message, "error");
      return;
    }

    const newConv: Conversation = created as any;
    setConvs((prev) =>
      prev.some((c) => c.id === newConv.id) ? prev : [newConv, ...prev]
    );
    setSelectedId(newConv.id);
    setSidebarTab("convs");
  }

  /* ------------------------------ PICKERS/REC ---------------------------- */
  function openFilePicker() {
    fileInputRef.current?.click();
  }
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      await Swal.fire("Too large", "Please choose a file under 10 MB.", "info");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" = file.type.startsWith("image")
      ? "image"
      : file.type.startsWith("audio")
      ? "audio"
      : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }

  /* ------------------------------ CALLING -------------------------------- */
  const selectedConv = useMemo(
    () => convs.find((c) => c.id === selectedId) || null,
    [convs, selectedId]
  );
  const providerInfo = useMemo(() => {
    const s = staffDir.find((x) => x.user_id === selectedConv?.provider_id);
    const name =
      [s?.first_name, s?.last_name].filter(Boolean).join(" ") ||
      s?.email ||
      "Staff";
    return {
      id: s?.user_id || selectedConv?.provider_id || "",
      name,
      avatar: s?.avatar_url ?? undefined,
    };
  }, [staffDir, selectedConv?.provider_id]);

  const startCall = useCallback(
    async (mode: CallMode) => {
      if (!selectedId || !me?.id) {
        await Swal.fire("Select a chat", "Open a conversation first.", "info");
        return;
      }
      const peerUserId = providerInfo.id;
      if (!peerUserId) return;
      await sendRing(peerUserId, {
        conversationId: selectedId,
        fromId: me.id,
        fromName: me.name,
        mode,
      });
      setCallRole("caller");
      setCallMode(mode);
      setCallOpen(true);
    },
    [selectedId, me?.id, me?.name, providerInfo.id]
  );

  const acceptIncoming = useCallback(() => {
    if (!incoming) return;
    if (incoming.conversationId && incoming.conversationId !== selectedId)
      setSelectedId(incoming.conversationId);
    setCallRole("callee");
    setCallMode(incoming.mode);
    setCallOpen(true);
    setIncoming(null);
  }, [incoming, selectedId]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    await sendHangupToUser(incoming.fromId, incoming.conversationId);
    setIncoming(null);
  }, [incoming]);

  /* ------------------------------ UI Render ------------------------------ */
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* your chat UI unchanged */}
      {/* ... */}
      {/* Call dialog */}
      {selectedId && me && (
        <CallDialog
          open={callOpen}
          onOpenChange={(v) => setCallOpen(v)}
          conversationId={incoming?.conversationId || selectedId}
          role={callRole}
          mode={callMode}
          meId={me.id}
          meName={me.name}
          peerName={providerInfo.name}
          peerAvatar={providerInfo.avatar}
        />
      )}
    </div>
  );
}
