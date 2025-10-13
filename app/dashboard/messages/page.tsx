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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);

  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"convs" | "staff">("convs");

  const listRef = useRef<HTMLDivElement>(null);

  const [callOpen, setCallOpen] = useState(false);
  const [callRole, setCallRole] = useState<CallRole>("caller");
  const [callMode, setCallMode] = useState<CallMode>("audio");
  const [incoming, setIncoming] = useState<{
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: CallMode;
  } | null>(null);

  /* ------------------------- Auth + Init ------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data: au, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const uid = au.user?.id;
        if (!uid) {
          location.href = "/login";
          return;
        }

        const { data: p, error: patientErr } = await supabase
          .from("patients")
          .select("user_id, first_name, last_name, email")
          .eq("user_id", uid)
          .maybeSingle();
        if (patientErr) throw patientErr;

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

        // ✅ Attach debug listener safely
        import("@/lib/webrtc/signaling")
          .then(({ attachDebugListener }) => {
            try {
              attachDebugListener(uid);
              console.log("[RTC DEBUG] Listener attached for", uid);
            } catch (err) {
              console.error("[RTC DEBUG] Attach failed:", err);
            }
          })
          .catch((err) => console.error("[RTC DEBUG] Import failed:", err));
      } catch (err: any) {
        console.error("Init failed:", err);
        setError(err?.message || "Unable to load user data.");
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------ Conversations ----------------------- */
  const reloadConversations = useCallback(async (patientId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("patient_id", patientId)
      .order("last_message_at", { ascending: false });
    if (error) {
      console.error("Conversations load error:", error);
      return;
    }
    setConvs((data as Conversation[]) || []);
  }, []);

  useEffect(() => {
    if (me?.id) reloadConversations(me.id);
  }, [me?.id, reloadConversations]);

  /* ----------------------------- Staff list ---------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("first_name", { ascending: true });
    if (error) {
      console.error("Staff load error:", error);
      return;
    }
    setStaffDir((data as StaffRow[]) || []);
  }, []);
  useEffect(() => {
    if (me) fetchStaff();
  }, [me, fetchStaff]);

  /* -------------------- Subscribe to messages -------------------- */
  useEffect(() => {
    if (!selectedId || !me) return;
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
              top: listRef.current.scrollHeight,
              behavior: "smooth",
            })
          );
        }
      );
    void ch.subscribe();

    return () => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
  }, [selectedId, me]);

  /* -------------------- Incoming call events -------------------- */
  useEffect(() => {
    if (!me?.id) return;
    const ch = userRingChannel(me.id);

    ch.on("broadcast", { event: "ring" }, (p) => {
      const { conversationId, fromId, fromName, mode } =
        (p.payload || {}) as any;
      if (!conversationId || !fromId) return;
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

  /* -------------------------- Call handling --------------------- */
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

  /* ---------------------------- UI RENDER ---------------------------- */
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading messages…
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        {error}
      </div>
    );

  if (!me)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Unable to load account.
      </div>
    );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* You can add your sidebar, message list, and input UI here */}
      <div className="text-gray-700 text-sm mb-3">
        Logged in as <b>{me.name}</b>
      </div>

      {incoming && (
        <IncomingCallBanner
          callerName={incoming.fromName}
          mode={incoming.mode}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {/* Call dialog */}
      {selectedId && me && (
        <CallDialog
          open={callOpen}
          onOpenChange={setCallOpen}
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
