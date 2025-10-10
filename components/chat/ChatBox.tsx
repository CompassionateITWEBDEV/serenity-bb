import IncomingCallBanner from "@/components/call/IncomingCallBanner";
import CallDialog, { type CallMode, type CallRole } from "@/components/call/CallDialog";
import { userRingChannel, sendRing, sendHangupToUser } from "@/lib/webrtc/signaling";

// 2) NEW state inside ChatBoxInner:
const [callOpen, setCallOpen] = useState(false);
const [callRole, setCallRole] = useState<CallRole>("caller");
const [callMode, setCallMode] = useState<CallMode>("audio");
const [incoming, setIncoming] = useState<{ conversationId: string; fromId: string; fromName: string; mode: CallMode } | null>(null);

// 3) Subscribe to my user ring channel once `me` exists:
useEffect(() => {
  if (!me?.id) return;
  const ch = userRingChannel(me.id);
  ch.on("broadcast", { event: "ring" }, (p) => {
    const { conversationId, fromId, fromName, mode } = (p.payload || {}) as any;
    if (!conversationId || !fromId) return;
    setIncoming({ conversationId, fromId, fromName: fromName || "Caller", mode: mode || "audio" });
  });
  ch.on("broadcast", { event: "hangup" }, () => setIncoming(null));
  ch.subscribe();
  return () => { try { supabase.removeChannel(ch); } catch {} };
}, [me?.id]);

// 4) Helpers to start/accept/decline:
const startCall = useCallback(async (mode: CallMode) => {
  if (!conversationId || !me?.id) return;
  const peerId = mode === "staff" ? patientId : providerId; // NOTE: this `mode` is ChatBox prop; disambiguate
}, [conversationId, me?.id]);

// Fix the above confusion by aliasing ChatBox prop:
const chatMode = mode; // "staff" | "patient"

const onStartCall = useCallback(async (m: CallMode) => {
  if (!conversationId || !me?.id) return;
  const peerId = chatMode === "staff" ? patientId : (providerId || "");
  if (!peerId) return;
  await sendRing(peerId, { conversationId, fromId: me.id, fromName: me.name, mode: m });
  setCallRole("caller");
  setCallMode(m);
  setCallOpen(true);
}, [conversationId, me?.id, me?.name, chatMode, patientId, providerId]);

const onAcceptIncoming = useCallback(() => {
  if (!incoming || !me) return;
  setCallRole("callee");
  setCallMode(incoming.mode);
  setCallOpen(true);
  setIncoming(null);
}, [incoming, me]);

const onDeclineIncoming = useCallback(async () => {
  if (!incoming) return;
  await sendHangupToUser(incoming.fromId, incoming.conversationId);
  setIncoming(null);
}, [incoming]);

// 5) Replace call buttons:
//   Old:
//     <IconButton aria="Voice call" onClick={() => phoneHref ? window.open(phoneHref, "_blank") : setShowCall(true)}>
//   New:
<IconButton aria="Voice call" onClick={() => onStartCall("audio")}>
  <Phone className="h-5 w-5" />
</IconButton>
<IconButton aria="Video call" onClick={() => onStartCall("video")}>
  <Video className="h-5 w-5" />
</IconButton>

// 6) Render incoming banner just before closing </CardContent> or at root:
{incoming && (
  <IncomingCallBanner
    callerName={incoming.fromName}
    mode={incoming.mode}
    onAccept={onAcceptIncoming}
    onDecline={onDeclineIncoming}
  />
)}

// 7) Render CallDialog at bottom of ChatBox (replacing your previous inline modal):
{conversationId && me && (
  <CallDialog
    open={callOpen}
    onOpenChange={(v) => setCallOpen(v)}
    conversationId={conversationId}
    role={callRole}
    mode={callMode}
    meId={me.id}
    meName={me.name}
  />
)}
