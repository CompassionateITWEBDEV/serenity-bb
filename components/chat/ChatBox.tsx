"use client";
import { useEffect, useState } from "react";

export default function ChatBox(props: {
  mode: "staff" | "patient";
  patientId: string;
  providerId: string;
  providerName?: string;
  providerRole?: "doctor" | "nurse" | "counselor";
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    // mark read on mount/open
    fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: new URLSearchParams(location.search).get("open") })
    }).catch(() => {});
  }, []);

  async function ensureConv(): Promise<string> {
    const res = await fetch("/api/chat/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: props.patientId,
        providerId: props.providerId,
        providerName: props.providerName,
        providerRole: props.providerRole
      })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "ensure failed");
    return j.id as string;
  }

  async function send() {
    const convId = await ensureConv();
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, content: text })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "send failed");
    setText("");
  }

  return (
    <div className="flex h-[540px] flex-col rounded-lg border">
      <div className="mt-auto flex gap-2 p-3 border-t">
        <input
          className="flex-1 rounded border px-3 py-2"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          className="rounded bg-cyan-600 px-4 py-2 text-white"
          onClick={send}
          disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
