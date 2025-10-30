"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

type QA = { q: string; a: string };

export default function HelpFaqClient({ data }: { data: QA[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const open = openIdx === idx;
        return (
          <Card key={idx} className="border rounded-xl">
            <CardContent className="p-0">
              <button
                className="w-full flex items-center justify-between px-3 py-3 text-left"
                onClick={() => setOpenIdx(open ? null : idx)}
                aria-expanded={open}
              >
                <span className="text-sm text-slate-800">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="px-3 pb-3 -mt-1">
                  <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


