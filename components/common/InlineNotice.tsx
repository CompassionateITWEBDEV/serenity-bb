// ./components/common/InlineNotice.tsx
// Quiet banner that shows only in development or when you opt-in.
"use client";
import { Info } from "lucide-react";

export default function InlineNotice({
  text,
  show = process.env.NODE_ENV !== "production",
}: { text: string; show?: boolean }) {
  if (!show) return null;
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
      <Info className="h-4 w-4 mt-0.5" />
      <div>{text}</div>
    </div>
  );
}
