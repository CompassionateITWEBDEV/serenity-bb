"use client";
import { useEffect } from "react";
import { formatTime } from "@/lib/time";

export default function FormatTimeShim() {
  useEffect(() => {
    // why: expose global for legacy calls until you migrate imports
    (window as any).formatTime = formatTime;
  }, []);
  return null;
}
