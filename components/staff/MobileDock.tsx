"use client";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileDock() {
  const router = useRouter();
  const pathname = usePathname();
  const isMessages = pathname?.startsWith("/staff/messages");

  return (
    <nav className="fixed bottom-3 inset-x-0 mx-auto max-w-md bg-white/90 rounded-2xl shadow border px-4 py-2 flex justify-between">
      {/* ...other buttons... */}

      <Button
        type="button"
        variant={isMessages ? "secondary" : "ghost"}
        className="h-10 w-10 rounded-full"
        onClick={() => router.push("/staff/messages")}
        aria-label="Messages"
        title="Messages"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* ...other buttons... */}
    </nav>
  );
}
