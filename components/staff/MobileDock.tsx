"use client";
import { useRouter, usePathname } from "next/navigation";
import { 
  Home, 
  MessageSquare, 
  Users, 
  TestTube2, 
  Video, 
  Bell,
  Settings,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileDock() {
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path.includes('?view=tests')) {
      return pathname?.startsWith('/staff/dashboard') && pathname?.includes('view=tests');
    }
    return pathname?.startsWith(path);
  };
  
  const navItems = [
    { icon: Home, path: "/staff/dashboard", label: "Dashboard", id: "dashboard" },
    { icon: Users, path: "/staff/patient-inbox", label: "Patients", id: "patients" },
    { icon: MessageSquare, path: "/staff/messages", label: "Messages", id: "messages" },
    { icon: TestTube2, path: "/staff/dashboard?view=tests", label: "Tests", id: "tests" },
    { icon: Video, path: "/staff/broadcasts", label: "Calls", id: "calls" },
    { icon: Bell, path: "/staff/notifications", label: "Alerts", id: "alerts" },
    { icon: Settings, path: "/staff/profile", label: "Settings", id: "settings" },
  ];

  return (
    <nav className="fixed bottom-4 inset-x-4 mx-auto max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 px-2 py-3">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.id}
              type="button"
              variant={active ? "default" : "ghost"}
              size="sm"
              className={`h-12 w-12 rounded-xl transition-all duration-200 ${
                active 
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              onClick={() => router.push(item.path)}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
