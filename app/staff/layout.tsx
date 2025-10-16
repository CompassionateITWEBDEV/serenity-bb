"use client";

import { ReactNode } from "react";
import IncomingCallNotification from "@/components/call/IncomingCallNotification";

interface StaffLayoutProps {
  children: ReactNode;
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <>
      {children}
      <IncomingCallNotification />
    </>
  );
}
