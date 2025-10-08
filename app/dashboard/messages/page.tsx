"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Phone, Video, Send, Image as ImageIcon, Camera, Mic,
  MessageCircle, Search, EllipsisVertical, Plus, Trash2, Power, PowerOff, X
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";

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
  meta?: { audio_url?: string; image_url?: string; duration_sec?: number } | null;
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
  title: string | null;
  department: string | null;
  role: string | null;
  avatar_url: string | null;
  active: boolean | null;
};

/* ---------------------------- Utils/helpers ----------------------------- */

const CHAT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CHAT_BUCKET?.trim() || "chat";

function initials(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  return s.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function toProviderRole(role?: string | null): ProviderRole {
  const r = (role ?? "").toLowerCase();
  if (r.includes("doc")) return "doctor";
  if (r.includes("nurse")) return "nurse";
  if (r.includes("counsel")) return "counselor";
  return "nurse";
}
function upsertConversation(list: Conversation[], row: Conversation): Conversation[] {
  const i = list.findIndex((c) => c.id === row.id);
  if (i === -1) return [row, ...list];
  const next = list.slice(); next[i] = { ...next[i], ...row }; return next;
}

/* ------------------------------ Page ------------------------------------ */

export default function PatientMessagesPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [staffDir, setStaffDir] = useState<StaffRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);

  const [q, setQ] = useState("");
  const [compose, setCompose] = useState("");
  const [loading, setLoading] = useState(true);

  const [providerOnline, setProviderOnline] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const presenceTimer = useRef<number | null>(null);

  // Draft media (staged before sending)
  const [draft, setDraft] = useState<{
    blob: Blob;
    type: "image" | "audio" | "file";
    name?: string;
    previewUrl: string; // object URL for preview
    duration_sec?: number;
  } | null>(null);

  // revoke preview URL when draft changes
  useEffect(() => {
    return () => { if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl); };
  }, [draft?.previewUrl]);

  // Media recording
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -------- Add Staff dialog state -------- */
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    title: string;
    department: string;
    role: string;
    avatar_url: string;
    active: boolean;
  }>({
    user_id: "",
    first_name: "",
    last_name: "",
    email: "",
    title: "",
    department: "",
    role: "nurse",
    avatar_url: "",
    active: true,
  });

  /* ------------------------- Auth + ensure patient ------------------------ */
  useEffect(() => {
    (async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) { router.replace("/login"); return; }

      const { data: p } = await supabase
        .from("patients")
        .select("user_id, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      if (!p?.user_id) {
        await Swal.fire("Access denied", "This page is for patients.", "error");
        router.replace("/");
        return;
      }

      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || au.user?.email || "Me";
      setMe({ id: uid, name });
      setLoading(false);
    })();
  }, [router]);

  /* ------------------------------ Heartbeat ------------------------------- */
  useEffect(() => {
    if (!me) return;
    const beat = async () => { try { await supabase.rpc("patient_heartbeat"); } catch {} };

    (async () => {
      await beat();
      const fast = setInterval(beat, 1000);
      setTimeout(() => clearInterval(fast), 2200);
    })();
    const slow = setInterval(beat, 10000);

    const ch = supabase.channel(`online:${me.id}`, { config: { presence: { key: me.id } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const ping = () => ch.track({ online: true, at: Date.now() });
        ping(); setTimeout(ping, 600);
      }
    });

    const onFocus = () => { void beat(); try { ch.track({ online: true, at: Date.now() }); } catch {} };
    const onVis = () => { if (document.visibilityState === "visible") onFocus(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(slow);
      try { supabase.removeChannel(ch); } catch {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [me]);

  /* ------------------------ Load conversations (patient) ------------------ */
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,patient_id,provider_id,provider_name,provider_role,provider_avatar,last_message,last_message_at,created_at")
        .eq("patient_id", me.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      setConvs((data as Conversation[]) || []);

      const providerId = params.get("providerId");
      if (providerId) {
        const exists = (data || []).find((c) => c.provider_id === providerId);
        if (exists) setSelectedId(exists.id);
      }
    })();
  }, [me, params]);

  /* ----------------------------- Staff directory ------------------------- */
  const fetchStaff = useCallback(async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("user_id, first_name, last_name, email, title, department, role, avatar_url, active")
      .order("first_name", { ascending: true });
    if (error) { await Swal.fire("Load error", error.message, "error"); return; }
    setStaffDir((data as StaffRow[]) || []);
  }, []);

  useEffect(() => { if (me) void fetchStaff(); }, [me, fetchStaff]);

  /* -------------------- Open/subscribe a conversation thread -------------- */
  useEffect(() => {
    if (!selectedId || !me) return;
    let alive = true;
    setProviderOnline(false);

    (async () => {
      const { data, error } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) { await Swal.fire("Load error", error.message, "error"); return; }
      if (alive) {
        setMsgs((data as MessageRow[]) || []);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight }));
      }
    })();

    const ch = supabase
      .channel(`thread_${selectedId}`, { config: { presence: { key: me.id } } })
      .on(
        "postgres_changes",
        { schema: "public", table: "messages", event: "*", filter: `conversation_id=eq.${selectedId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMsgs((prev) => [...prev, payload.new as MessageRow]);
            requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" }));
          } else {
            const { data } = await supabase
              .from("messages").select("*")
              .eq("conversation_id", selectedId)
              .order("created_at", { ascending: true });
            setMsgs((data as MessageRow[]) || []);
          }
        }
      );

    const compute = () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const others = Object.values(state).flat() as any[];
      const online = others.some((s: any) => s?.uid && s.uid !== me.id);
      setProviderOnline(online);
    };

    ch.on("presence", { event: "sync" }, compute)
      .on("presence", { event: "join" }, compute)
      .on("presence", { event: "leave" }, compute)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          try { ch.track({ uid: me.id, at: Date.now(), status: "idle" }); } catch {}
          compute();
          if (presenceTimer.current) window.clearTimeout(presenceTimer.current);
          presenceTimer.current = window.setTimeout(compute, 700);
        }
      });

    const keepAlive = setInterval(() => {
      try { ch.track({ uid: me.id, at: Date.now(), status: "idle" }); } catch {}
    }, 1500);

    return () => {
      alive = false;
      clearInterval(keepAlive);
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [selectedId, me]);

  /* ------------------------- Start a new conversation --------------------- */
  const [starting, setStarting] = useState(false);
  const startChatWith = useCallback(async (staff: StaffRow) => {
    if (!me || starting) return;
    setStarting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch("/api/chat/new", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ providerId: staff.user_id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to start chat");

      const conv: Conversation = payload.conversation;

      if (!conv.provider_name || !conv.provider_role) {
        const provider_name = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email || "Staff";
        const provider_role = toProviderRole(staff.role ?? "");
        const provider_avatar = staff.avatar_url ?? null;
        await supabase.from("conversations").update({ provider_name, provider_role, provider_avatar }).eq("id", conv.id);
        conv.provider_name = provider_name; conv.provider_role = provider_role; conv.provider_avatar = provider_avatar;
      }

      setConvs((prev) => upsertConversation(prev, conv));
      setSelectedId(conv.id);
    } catch (e: any) {
      await Swal.fire("Could not start chat", e.message || String(e), "error");
    } finally {
      setStarting(false);
    }
  }, [me, starting]);

  /* ------------------------- Storage helper (public/signed) --------------- */
  async function uploadToChat(fileOrBlob: Blob, fileName?: string) {
    if (!selectedId || !me) throw new Error("Missing conversation");
    const detected = (fileOrBlob as File).type || (fileOrBlob as any).type || "";
    const extFromName = (fileName || "").split(".").pop() || "";
    const ext = extFromName || (detected.startsWith("image/") ? detected.split("/")[1] : detected ? "webm" : "bin");
    const path = `${selectedId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .upload(path, fileOrBlob, {
        contentType: detected || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      if (/not found/i.test(upErr.message) || /No such file/i.test(upErr.message)) {
        throw new Error(`Storage bucket "${CHAT_BUCKET}" not found or not accessible.`);
      }
      throw upErr;
    }

    const pub = supabase.storage.from(CHAT_BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;

    const { data: signed, error: signErr } = await supabase
      .storage
      .from(CHAT_BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (signErr || !signed?.signedUrl) throw new Error("Uploaded, but cannot generate a URL.");
    return signed.signedUrl;
  }

  /* --------------------------------- Send -------------------------------- */
  const canSend = useMemo(
    () => (!!compose.trim() || !!draft) && !!me && !!selectedId,
    [compose, draft, me, selectedId]
  );

  async function send() {
    if (!me || !selectedId || !canSend) return;

    const conv = convs.find((c) => c.id === selectedId);
    const caption = compose.trim();

    // Upload if there's a draft
    let meta: MessageRow["meta"] | null = null;
    try {
      if (draft) {
        let url = await uploadToChat(
          draft.blob,
          draft.name || (draft.type === "image" ? "image.jpg" : draft.type === "audio" ? "voice.webm" : "file.bin")
        );
        if (draft.type === "image") meta = { image_url: url };
        else if (draft.type === "audio") meta = { audio_url: url, duration_sec: draft.duration_sec };
        else meta = { image_url: undefined, audio_url: undefined }; // generic file (you can expand to file_url if you add it to meta)
      }
    } catch (e: any) {
      await Swal.fire("Upload failed", e.message || "Could not upload media.", "error");
      return;
    }

    const optimistic: MessageRow = {
      id: `tmp-${crypto.randomUUID()}`,
      conversation_id: selectedId,
      patient_id: conv?.patient_id ?? me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content: caption || (draft?.type === "audio" ? "(voice note)" : draft?.type === "image" ? "(image)" : ""),
      created_at: new Date().toISOString(),
      read: false,
      urgent: false,
      meta,
    };

    setMsgs((m) => [...m, optimistic]);
    setCompose("");
    if (draft?.previewUrl) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);

    const { error: insErr } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      patient_id: conv?.patient_id ?? me.id,
      sender_id: me.id,
      sender_name: me.name,
      sender_role: "patient",
      content: optimistic.content,
      read: false,
      urgent: false,
      meta,
    });

    if (insErr) {
      setMsgs((m) => m.filter((x) => x.id !== optimistic.id));
      await Swal.fire("Send failed", insErr.message, "error");
      return;
    }

    await supabase
      .from("conversations")
      .update({ last_message: optimistic.content || (meta?.image_url ? "(image)" : meta?.audio_url ? "(voice note)" : ""), last_message_at: new Date().toISOString() })
      .eq("id", selectedId);
  }

  /* ------------------------------ Staff CRUD ------------------------------ */

  function validateUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  async function addStaff() {
    if (!form.user_id || !validateUuid(form.user_id)) return Swal.fire("Invalid user_id", "Paste a valid UUID from Auth.users.", "warning");
    if (!form.email) return Swal.fire("Missing email", "Email is required.", "warning");

    const payload = {
      user_id: form.user_id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email,
      title: form.title || null,
      department: form.department || null,
      role: form.role || "nurse",
      avatar_url: form.avatar_url || null,
      active: form.active ?? true,
    };

    const { error } = await supabase.from("staff").insert(payload);
    if (error) return Swal.fire("Add staff failed", error.message, "error");

    setAddOpen(false);
    setForm({ user_id: "", first_name: "", last_name: "", email: "", title: "", department: "", role: "nurse", avatar_url: "", active: true });
    await fetchStaff();
    await Swal.fire("Staff added", "New staff member inserted.", "success");
  }

  async function deactivateStaff(s: StaffRow) {
    const prev = staffDir.slice();
    setStaffDir((arr) => arr.map((x) => (x.user_id === s.user_id ? { ...x, active: false } : x)));
    const { error } = await supabase.from("staff").update({ active: false }).eq("user_id", s.user_id);
    if (error) { setStaffDir(prev); return Swal.fire("Deactivate failed", error.message, "error"); }
  }

  async function activateStaff(s: StaffRow) {
    const prev = staffDir.slice();
    setStaffDir((arr) => arr.map((x) => (x.user_id === s.user_id ? { ...x, active: true } : x)));
    const { error } = await supabase.from("staff").update({ active: true }).eq("user_id", s.user_id);
    if (error) { setStaffDir(prev); return Swal.fire("Activate failed", error.message, "error"); }
  }

  async function deleteStaff(s: StaffRow) {
    const ok = await Swal.fire({ title: "Delete staff permanently?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!ok.isConfirmed) return;
    const prev = staffDir.slice();
    setStaffDir((arr) => arr.filter((x) => x.user_id !== s.user_id));
    const { error } = await supabase.from("staff").delete().eq("user_id", s.user_id);
    if (error) { setStaffDir(prev); return Swal.fire("Delete failed", error.message, "error"); }
  }

  /* ------------------------------ Media pickers --------------------------- */

  function openFilePicker() { fileInputRef.current?.click(); }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      await Swal.fire("Too large", "Please choose a file under 10 MB.", "info");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const kind: "image" | "audio" | "file" =
      file.type.startsWith("image/") ? "image" :
      file.type.startsWith("audio/") ? "audio" : "file";

    setDraft({ blob: file, type: kind, name: file.name, previewUrl });
  }

  async function takePhoto() {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream as any; await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("No photo"))), "image/jpeg", 0.9)!
      );

      const previewUrl = URL.createObjectURL(blob);
      setDraft({ blob, type: "image", name: "photo.jpg", previewUrl });
    } catch (err: any) {
      await Swal.fire("Camera error", err?.message || "Cannot access camera.", "error");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }

  async function toggleRecord() {
    if (recording) { mediaRecRef.current?.stop(); return; }

    if (typeof window.MediaRecorder === "undefined") {
      await Swal.fire("Unsupported", "Voice recording isn’t supported by this browser.", "info");
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      await Swal.fire("Permission", "Microphone permission denied.", "info");
      return;
    }

    const mime =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
      MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

    chunksRef.current = [];
    const startedAt = Date.now();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);

      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setDraft({ blob, type: "audio", name: "voice.webm", previewUrl, duration_sec: duration });
    };
    mediaRecRef.current = rec;
    setRecording(true);
    rec.start();
  }

  /* ------------------------------ Derived UI ----------------------------- */
  const search = q.trim().toLowerCase();
  const convsSorted = useMemo(() => {
    const arr = convs.slice();
    arr.sort((a, b) => {
      const ta = a.last_message_at || a.created_at || "";
      const tb = b.last_message_at || b.created_at || "";
      return tb.localeCompare(ta);
    });
    return arr;
  }, [convs]);

  const filteredStaff = useMemo(() => {
    return (staffDir || []).filter((s) => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "";
      const hit = name.toLowerCase().includes(search)
        || (s.email ?? "").toLowerCase().includes(search)
        || (s.department ?? "").toLowerCase().includes(search)
        || (s.title ?? "").toLowerCase().includes(search);
      return search ? hit : true;
    });
  }, [staffDir, search]);

  const selectedConv = useMemo(() => convs.find((c) => c.id === selectedId) || null, [convs, selectedId]);
  const otherName = selectedConv?.provider_name ?? "Staff";
  const otherAvatar = selectedConv?.provider_avatar ?? undefined;

  /* --------------------------------- UI ---------------------------------- */
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Chat with your care team</p>
        </div>
      </div>

      {/* Desktop layout: sidebar + thread */}
      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <div className="font-medium">Direct Message</div>
              </div>
              {/* Add Staff button */}
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add staff</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add staff</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm">Auth User ID (UUID)</label>
                      <Input value={form.user_id} onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))} placeholder="00000000-0000-4000-8000-000000000000" />
                    </div>
                    <div>
                      <label className="text-sm">First name</label>
                      <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm">Last name</label>
                      <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm">Email</label>
                      <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm">Title</label>
                      <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm">Department</label>
                      <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm">Role</label>
                      <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="doctor | nurse | counselor" />
                    </div>
                    <div>
                      <label className="text-sm">Avatar URL</label>
                      <Input value={form.avatar_url} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={addStaff}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search staff…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto divide-y dark:divide-zinc-800">
            {convsSorted
              .filter((c) => (search ? (c.provider_name ?? "Staff").toLowerCase().includes(search) : true))
              .map((c) => {
                const active = selectedId === c.id;
                return (
                  <button
                    key={`conv-${c.id}`}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center gap-3 border-l-4 ${
                      active ? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-900/10" : "border-transparent"
                    }`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.provider_avatar ?? undefined} />
                      <AvatarFallback>{initials(c.provider_name ?? "Staff")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium">{c.provider_name ?? "Staff"}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(c.last_message_at ?? c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{c.provider_role ?? "staff"}</Badge>
                        <p className="truncate text-xs text-gray-500">{c.last_message ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}

            {/* Staff directory (with actions) */}
            <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">Staff directory</div>
            {filteredStaff.map((s) => {
              const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Staff";
              return (
                <div key={`staff-${s.user_id}`} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-900">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="truncate font-medium">{name}</div>
                      <div className="text-xs text-gray-500">{s.title ?? s.department ?? ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.active ? "secondary" : "outline"} className="capitalize">{toProviderRole(s.role ?? "")}</Badge>
                      <p className="truncate text-xs text-gray-500">{s.email}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><EllipsisVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {s.active ? (
                          <DropdownMenuItem onClick={() => deactivateStaff(s)}>
                            <PowerOff className="mr-2 h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activateStaff(s)}>
                            <Power className="mr-2 h-4 w-4" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteStaff(s)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startChatWith(s)}>
                          Start chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {filteredStaff.length === 0 && <div className="p-6 text-sm text-gray-500">No staff found.</div>}
          </div>
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 min-h-0 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="mx-auto mb-4 h-12 w-12" />
                <div className="text-lg font-medium">Select a conversation</div>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b dark:border-zinc-800 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className="rounded-full lg:hidden">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={otherAvatar} />
                  <AvatarFallback>{initials(otherName)}</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="font-semibold">{otherName}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${providerOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <span className={providerOnline ? "text-emerald-600" : "text-gray-500"}>{providerOnline ? "Online" : "Offline"}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full"><Phone className="h-5 w-5" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full"><Video className="h-5 w-5" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                {msgs.map((m) => {
                  const own = m.sender_id === me?.id;
                  const bubble = own
                    ? "bg-cyan-500 text-white rounded-2xl px-4 py-2 shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-2 ring-1 ring-gray-200/60 dark:ring-zinc-700/60";
                  return (
                    <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={bubble}>
                          {/* Media */}
                          {m.meta?.image_url && (
                            <img
                              src={m.meta.image_url}
                              alt="image"
                              className="mb-2 max-h-64 w-full rounded-xl object-cover"
                              loading="lazy"
                            />
                          )}
                          {m.meta?.audio_url && (
                            <audio className="mb-2 w-full" controls src={m.meta.audio_url} />
                          )}

                          {/* Text content */}
                          {m.content && (
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          )}

                          <div className={`mt-1 text-[11px] ${own ? "text-cyan-100/90" : "text-gray-500"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {msgs.length === 0 && <div className="text-sm text-gray-500 text-center py-6">No messages yet.</div>}
              </div>

              {/* Composer */}
              <div className="border-t dark:border-zinc-800 p-3">
                {/* Draft preview chip */}
                {draft && (
                  <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border bg-white p-2 pr-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="max-h-20 max-w-[180px] overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-zinc-700">
                      {draft.type === "image" && <img src={draft.previewUrl} alt="preview" className="h-20 w-auto object-cover" />}
                      {draft.type === "audio" && <audio controls src={draft.previewUrl} className="h-10 w-[180px]" />}
                      {draft.type === "file"  && <div className="p-3">📎 {draft.name || "file"}</div>}
                    </div>
                    <button
                      type="button"
                      className="ml-auto rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      onClick={() => { if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl); setDraft(null); }}
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={openFilePicker} className="rounded-full">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input ref={fileInputRef} type="file" hidden accept="image/*,audio/*" onChange={onPickFile} />
                    <Button type="button" variant="ghost" size="icon" onClick={takePhoto} className="rounded-full">
                      <Camera className="h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={toggleRecord} className={`rounded-full ${recording ? "animate-pulse" : ""}`}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>

                  <Textarea
                    ref={textareaRef}
                    placeholder="Type your message…"
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    className="min-h-[44px] max-h-[140px] flex-1 rounded-2xl bg-slate-50 px-4 py-3 shadow-inner ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-zinc-800 dark:ring-zinc-700"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  />
                  <Button onClick={send} disabled={!canSend} className="shrink-0 rounded-2xl h-11 px-4 shadow-md">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
