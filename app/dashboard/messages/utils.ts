export const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
};

export const toUi = (m: { id: string; roomId: string; senderId: string; content: string; timestamp: number }) => ({
  id: m.id,
  roomId: m.roomId,
  senderId: m.senderId,
  content: m.content,
  timestamp: m.timestamp,
  isOwn: m.senderId === "patient",
});

export const makeClientId = () => `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
