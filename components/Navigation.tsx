"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Video, Home } from "lucide-react";

export default function Navigation() {
  return (
    <nav className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Serenity
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/conversations">
            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </Link>
          <Link href="/video-call/test?role=caller&mode=video&peer=test&peerName=Test">
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Test Video Call
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

