"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import CallHistory from "@/components/call/CallHistory";

/* --------------------------------- Signaling helpers --------------------------------- */
/** prevent sending before presence channel is actually subscribed */
async function ensureSubscribedFor(ch: ReturnType<typeof supabase.channel>) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ Channel subscription timeout, proceeding anyway');
      resolve(); // Don't reject, just proceed
    }, 5000); // Reduced timeout for localhost
    
    ch.subscribe((status) => {
      console.log('📡 Channel subscription status:', status);
      
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        console.warn('⚠️ Channel subscription failed:', status);
        resolve(); // Don't reject, just proceed
      }
    });
  });
}

/** notify peer so they can show IncomingCallBanner immediately */
async function ringPeer(
  toUserId: string,
  payload: {
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: "audio" | "video";
  }
) {
  console.log('📞 Ringing peer:', toUserId, payload);
  
  try {
    // Send to both user channel and staff-specific channel
    const userChannel = supabase.channel(`user_${toUserId}`, {
    config: { broadcast: { ack: true } },
  });
    const staffChannel = supabase.channel(`staff-calls-${toUserId}`, {
      config: { broadcast: { ack: true } },
    });
    
    console.log('📡 Setting up channels for:', toUserId);
    
    // Subscribe to channels with timeout handling
    try {
      await ensureSubscribedFor(userChannel);
      console.log('✅ User channel subscribed');
    } catch (error) {
      console.warn('⚠️ User channel subscription failed:', error);
    }
    
    try {
      await ensureSubscribedFor(staffChannel);
      console.log('✅ Staff channel subscribed');
    } catch (error) {
      console.warn('⚠️ Staff channel subscription failed:', error);
    }
    
    // Send to user channel (for general notifications)
    console.log('📤 Sending to user channel...');
    const userResponse = await userChannel.send({
    type: "broadcast",
    event: "invite",
    payload,
  });
    console.log('📤 User channel response:', userResponse);
    
    // Send to staff channel (for incoming call banner)
    console.log('📤 Sending to staff channel...');
    const staffResponse = await staffChannel.send({
      type: "broadcast",
      event: "incoming-call",
      payload: {
        conversationId: payload.conversationId,
        callerId: payload.fromId,
        callerName: payload.fromName,
        mode: payload.mode,
        timestamp: new Date().toISOString(),
      },
    });
    console.log('📤 Staff channel response:', staffResponse);
    
    // Clean up channels
    supabase.removeChannel(userChannel);
    supabase.removeChannel(staffChannel);
    
    if (userResponse !== "ok" && staffResponse !== "ok") {
      throw new Error(`Failed to send invite - User: ${userResponse}, Staff: ${staffResponse}`);
    }
    
    console.log('✅ Ring peer completed successfully');
  } catch (error) {
    console.error('❌ Ring peer failed:', error);
    throw error;
  }
}

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
  const router = useRouter();

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

  // Incoming invite => show banner here too
  const [incoming, setIncoming] = useState<{
    conversationId: string;
    fromId: string;
    fromName: string;
    mode: "audio" | "video";
    meetingUrl?: string;
  } | null>(null);

  const [sidebarTab, setSidebarTab] = useState<"convs" | "staff">("convs");

  /* ------------------------- Incoming Call Listener ------------------------ */
  useEffect(() => {
    if (!me?.id) return;
    
    const ch = supabase.channel(`user_${me.id}`, {
      config: { broadcast: { ack: true } }
    });
    
    console.log('📡 Patient subscribing to incoming call channel:', `user_${me.id}`);
    
    // Handle connection errors gracefully
    ch.on('broadcast', { event: '*' }, (payload) => {
      // Silent handler to prevent unhandled errors
    }).subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Channel subscription error - this is non-critical');
      }
    });
    
    ch.on("broadcast", { event: "invite" }, (payload) => {
      const { conversationId, fromId, fromName, mode } = (payload.payload || {}) as any;
      if (!conversationId || !fromId) {
        console.warn("📞 Invalid invite payload:", payload.payload);
        return;
      }
      
      console.log("📞 Patient received incoming call:", { conversationId, fromId, fromName, mode });
      console.log("📞 Setting incoming call state to show banner");
      
      setIncoming({
        conversationId,
        fromId,
        fromName: fromName || "Caller",
        mode: (mode || "audio") as "audio" | "video",
      });
    });
    
    ch.on("broadcast", { event: "bye" }, () => {
      console.log("📞 Received bye signal, clearing incoming call");
      setIncoming(null);
    });
    
    ch.subscribe((status) => {
      console.log('📡 Patient channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Patient successfully subscribed to incoming call channel');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Patient channel subscription failed:', status);
      }
    });
    
    return () => {
      console.log('🧹 Patient cleaning up incoming call listener');
      supabase.removeChannel(ch);
    };
  }, [me?.id]);

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
      .channel(`thread_${selectedId}`, {
        config: { presence: { key: me.id } },
      })
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

  /* --------------------------------- STAFF → CONVERSATION -------------------------------- */
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
      await Swal.fire("Too large", "Choose a file under 10 MB.", "info");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
      ? "audio"
      : "file";
    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }
  async function takePhoto() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      (video as any).muted = true;
      video.srcObject = stream as any;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = (video as any).videoWidth || 640;
      canvas.height = (video as any).videoHeight || 480;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("No photo"))),
          "image/jpeg",
          0.9
        )!
      );
      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (err: any) {
      await Swal.fire(
        "Camera error",
        err?.message || "Cannot access camera.",
        "error"
      );
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }
  async function toggleRecord() {
    if (recording) {
      mediaRecRef.current?.stop();
      return;
    }
    if (typeof window.MediaRecorder === "undefined") {
      await Swal.fire(
        "Unsupported",
        "Voice recording isn’t supported by this browser.",
        "info"
      );
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      await Swal.fire("Permission", "Microphone permission denied.", "info");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
    chunksRef.current = [];
    const startedAt = Date.now();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setDraft({
        blob,
        type: "audio",
        name: "voice.webm",
        previewUrl,
        duration_sec: duration,
      });
    };
    mediaRecRef.current = rec;
    setRecording(true);
    rec.start();
  }

  /* --------------------------------- SEND -------------------------------- */
  const canSend = useMemo(
    () => (!!compose.trim() || !!draft) && !!me && !!selectedId && !sending,
    [compose, draft, me, selectedId, sending]
  );
  async function send() {
    if (!me || !selectedId || !canSend) return;
    setSending(true);
    const caption = compose.trim();
    let meta: MessageMeta | null = null;
    try {
      if (draft) {
        if (draft.type === "image") {
          const path = await chatUploadToPath(draft.blob, {
            conversationId: selectedId,
            kind: "image",
            fileName: draft.name || "image.jpg",
          });
          meta = { image_path: path, duration_sec: null };
        } else if (draft.type === "audio") {
          const path = await chatUploadToPath(draft.blob, {
            conversationId: selectedId,
            kind: "audio",
            fileName: draft.name || "voice.webm",
          });
          meta = { audio_path: path, duration_sec: draft.duration_sec ?? null };
        } else meta = {};
      }
    } catch (e: any) {
      await Swal.fire(
        "Upload failed",
        e.message || "Could not upload media.",
        "error"
      );
      setSending(false);
      return;
    }
    const content =
      caption ||
      (meta?.audio_path ? "(voice note)" : meta?.image_path ? "(image)" : "");
    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content,
      read: false,
      urgent: false,
      meta,
    });
    if (insErr) {
      await Swal.fire("Send failed", insErr.message, "error");
      setSending(false);
      return;
    }
    setCompose("");
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
    await supabase
      .from("conversations")
      .update({
        last_message: content || "",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", selectedId);
    setSending(false);
  }

  /* ------------------------------ CALL (navigate to /call) -------------------------------- */
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
    async (mode: "audio" | "video") => {
      if (!selectedId || !me?.id) {
        await Swal.fire("Select a chat", "Open a conversation first.", "info");
        return;
      }
      const peerUserId = providerInfo.id;
      if (!peerUserId) {
        await Swal.fire(
          "Unavailable",
          "No peer available for this conversation.",
          "info"
        );
        return;
      }

      // Create or get Zoho Meeting link
      try {
        const response = await fetch('/api/zoho-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selectedId,
            patientName: me.name,
            staffName: providerInfo.name
          })
        });

        const data = await response.json();
        
        if (data.meetingUrl) {
          // Send meeting link as a message in the conversation
          const meetingMessage = `📞 Starting ${mode} call\n\nJoin the meeting:\n${data.meetingUrl}`;
          
          const { error: msgErr } = await supabase.from("messages").insert({
            conversation_id: selectedId,
            patient_id: me.id,
            sender_id: me.id,
            sender_name: me.name,
            sender_role: "patient",
            content: meetingMessage,
            read: false,
            urgent: false,
          });

          if (msgErr) {
            console.error('Failed to send meeting message:', msgErr);
          }

          // Update conversation with meeting link as last message
          await supabase
            .from("conversations")
            .update({
              last_message: `📞 ${mode} call`,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", selectedId);

          // Open Zoho Meeting in new tab
          window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
          
          // Notify peer about the meeting
          await ringPeer(peerUserId, {
            conversationId: selectedId,
            fromId: me.id,
            fromName: providerInfo.name ? me.name : "Patient",
            mode,
          });
        } else {
          throw new Error('Failed to get meeting URL');
        }
      } catch (error) {
        console.error('Failed to start Zoho Meeting:', error);
        await Swal.fire(
          "Meeting Error",
          "Could not start the meeting. Please try again.",
          "error"
        );
      }
    },
    [selectedId, me?.id, me?.name, providerInfo.id, providerInfo.name]
  );

  // Accept / Decline (Banner)
  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    
    try {
      // Get Zoho Meeting link for this conversation
      const response = await fetch('/api/zoho-meeting', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          conversationId: incoming.conversationId,
          patientName: me?.name,
          staffName: incoming.fromName
        })
      });

      const data = await response.json();
      
      if (data.meetingUrl) {
        // Open Zoho Meeting in new tab
        window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Failed to get meeting URL');
      }
    } catch (error) {
      console.error('Failed to join Zoho Meeting:', error);
      await Swal.fire(
        "Meeting Error",
        "Could not join the meeting. Please try again.",
        "error"
      );
    }
    
    setIncoming(null);
  }, [incoming, me?.name]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    const ch = supabase.channel(`user_${incoming.fromId}`, {
      config: { broadcast: { ack: true } },
    });
    await new Promise<void>((res) =>
      ch.subscribe((s) => s === "SUBSCRIBED" && res())
    );
    await ch.send({
      type: "broadcast",
      event: "bye",
      payload: { conversationId: incoming.conversationId },
    });
    setIncoming(null);
  }, [incoming]);

  /* ------------------------------ Lists / filters ------------------------------ */
  const search = q.trim().toLowerCase();
  const convsSorted = useMemo(
    () =>
      [...convs].sort((a, b) =>
        (b.last_message_at || b.created_at || "").localeCompare(
          a.last_message_at || a.created_at || ""
        )
      ),
    [convs]
  );
  const filteredConvs = useMemo(
    () =>
      convsSorted.filter((c) => {
        const s = staffDir.find((x) => x.user_id === c.provider_id);
        const name =
          [s?.first_name, s?.last_name].filter(Boolean).join(" ") ||
          s?.email ||
          "Staff";
        return search ? name.toLowerCase().includes(search) : true;
      }),
    [convsSorted, staffDir, search]
  );
  const filteredStaff = useMemo(
    () =>
      search
        ? staffDir.filter((s) => {
            const name =
              [s.first_name, s.last_name].filter(Boolean).join(" ") ||
              s.email ||
              "";
            return (
              name.toLowerCase().includes(search) ||
              (s.role || "").toLowerCase().includes(search)
            );
          })
        : staffDir,
    [staffDir, search]
  );

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Messages
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setSidebarTab("staff")}
          title="Start a new chat"
        >
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="minh-0 flex min-h-0 flex-col rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div className="font-medium">Conversations</div>
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant={sidebarTab === "convs" ? "default" : "outline"}
                  onClick={() => setSidebarTab("convs")}
                >
                  Chats
                </Button>
                <Button
                  size="sm"
                  variant={sidebarTab === "staff" ? "default" : "outline"}
                  onClick={() => setSidebarTab("staff")}
                >
                  <Users className="mr-1 h-4 w-4" /> Staff
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={
                  sidebarTab === "convs"
                    ? "Search conversations…"
                    : "Search staff…"
                }
                className="pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 divide-y overflow-y-auto dark:divide-zinc-800">
            {sidebarTab === "convs"
              ? filteredConvs.map((c) => {
                  const s = staffDir.find((x) => x.user_id === c.provider_id);
                  const name =
                    [s?.first_name, s?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    s?.email ||
                    "Staff";
                  const avatar = s?.avatar_url ?? undefined;
                  const active = selectedId === c.id;
                  return (
                    <button
                      key={`conv-${c.id}`}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 ${
                        active
                          ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-900/10"
                          : "border-transparent"
                      }`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatar} />
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="truncate font-medium">{name}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              c.last_message_at ?? c.created_at
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {c.provider_role ?? "staff"}
                          </Badge>
                          <p className="truncate text-xs text-gray-500">
                            {c.last_message ?? "—"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              : filteredStaff.map((s) => {
                  const name =
                    [s.first_name, s.last_name].filter(Boolean).join(" ") ||
                    s.email ||
                    "Staff";
                  return (
                    <button
                      key={`staff-${s.user_id}`}
                      onClick={() => ensureConversationWith(s.user_id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900"
                      title={`Chat with ${name}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback>{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="truncate font-medium">{name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {s.role || "staff"}
                          </Badge>
                          <p className="truncate text-xs text-gray-500">
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            {sidebarTab === "convs" && filteredConvs.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                No conversations yet.
              </div>
            )}
            {sidebarTab === "staff" && filteredStaff.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No staff found.</div>
            )}
          </div>
        </div>

        {/* Call History */}
        <div className="hidden lg:block">
          <CallHistory userId={me?.id || ""} conversationId={selectedId || undefined} limit={5} />
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 flex min-h-0 flex-col rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <div className="text-lg font-medium">
                  Select a conversation or pick a staff to start
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full lg:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={
                      staffDir.find(
                        (x) =>
                          x.user_id ===
                          convs.find((c) => c.id === selectedId)?.provider_id
                      )?.avatar_url || undefined
                    }
                  />
                  <AvatarFallback>
                    {initials(
                      staffDir.find(
                        (x) =>
                          x.user_id ===
                          convs.find((c) => c.id === selectedId)?.provider_id
                      )?.first_name || "S"
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="font-semibold">
                    {(() => {
                      const sel = convs.find((c) => c.id === selectedId);
                      const s = staffDir.find(
                        (x) => x.user_id === sel?.provider_id
                      );
                      return (
                        [s?.first_name, s?.last_name].filter(Boolean).join(" ") ||
                        s?.email ||
                        "Staff"
                      );
                    })()}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => startCall("audio")}
                    title="Start audio call"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                 
                </div>
              </div>

              {/* Incoming call banner */}
              {incoming && (
                  <IncomingCallBanner
                    callerName={incoming.fromName}
                    mode={incoming.mode}
                    onAccept={acceptIncoming}
                    onDecline={declineIncoming}
                  />
              )}

              <div
                ref={listRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-950"
              >
                {msgs.map((m) => {
                  const own = m.sender_id === me?.id;
                  const bubble = own
                    ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-2 ring-1 ring-gray-200/60 dark:ring-zinc-700/60";
                  const t = (m.content || "").trim().toLowerCase();
                  const showText = !(
                    t === "(image)" ||
                    t === "(photo)" ||
                    t === "(voice note)"
                  );
                  return (
                    <div
                      key={m.id}
                      className={`flex ${own ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[80%]">
                        <div className={bubble}>
                          <MessageMedia
                            meta={m.meta}
                            attachment_type={m.attachment_type}
                            attachment_url={m.attachment_url}
                          />
                          {showText && (
                            <p className="whitespace-pre-wrap break-words">
                              {m.content.split(/(\[.*?\]\(.*?\))/g).map((part, idx) => {
                                const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
                                if (linkMatch) {
                                  return (
                                    <a
                                      key={idx}
                                      href={linkMatch[2]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        window.open(linkMatch[2], '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      {linkMatch[1]}
                                    </a>
                                  );
                                }
                                return <span key={idx}>{part}</span>;
                              })}
                            </p>
                          )}
                          <div
                            className={`mt-1 text-[11px] ${
                              own ? "text-cyan-100/90" : "text-gray-500"
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && (
                  <div className="py-6 text-center text-sm text-gray-500">
                    No messages yet.
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="sticky bottom-0 border-t bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 supports-[backdrop-filter]:bg-white/70">
                {draft && (
                  <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border bg-white p-2 pr-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="max-h-20 max-w-[180px] overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-zinc-700">
                      {draft.type === "image" && (
                        <img
                          src={draft.previewUrl}
                          alt="preview"
                          className="h-20 w-auto object-cover"
                        />
                      )}
                      {draft.type === "audio" && (
                        <audio
                          controls
                          src={draft.previewUrl}
                          className="h-10 w-[180px]"
                        />
                      )}
                      {draft.type === "file" && (
                        <div className="p-3">📎 {draft.name || "file"}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ml-auto rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      onClick={() => {
                        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
                        setDraft(null);
                      }}
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={openFilePicker}
                      className="rounded-full"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*,audio/*"
                      onChange={onPickFile}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={takePhoto}
                      className="rounded-full"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={toggleRecord}
                      className={`rounded-full ${recording ? "animate-pulse" : ""}`}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Type your message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[44px] max-h-[140px] flex-1 rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button
                    onClick={send}
                    disabled={!canSend}
                    className="h-11 shrink-0 rounded-2xl px-4 shadow-md"
                    aria-busy={sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky incoming banner - always show when call is incoming */}
      {incoming && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(640px,90vw)] -translate-x-1/2 animate-in slide-in-from-bottom-5">
          <IncomingCallBanner
            callerName={incoming.fromName}
            mode={incoming.mode}
            onAccept={acceptIncoming}
            onDecline={declineIncoming}
          />
        </div>
      )}
    </div>
  );
}
