// FILE: components/dashboard/dashboard-header.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { usePatientStatus } from "@/hooks/use-patient-status";
import { Settings, LogOut, User, Heart, Menu, X } from "lucide-react"; // Bell removed
import type { Patient } from "@/lib/auth";
import { useProfileAvatar } from "@/hooks/use-profile-avatar";
// import { useUnreadCount } from "@/hooks/use-unread-count"; // not needed with dropdown
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";

interface DashboardHeaderProps { patient: Patient; }

export function DashboardHeader({ patient }: DashboardHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isNew } = usePatientStatus();

  const userId = (patient as any)?.id ?? null;
  const { avatarUrl, initials } = useProfileAvatar({
    userId,
    fallbackUrl: (patient as any)?.avatar ?? null,
    initialPath: (patient as any)?.avatar_path ?? null,
  });
  // const { unreadCount } = useUnreadCount(userId); // replaced by NotificationsDropdown

  const handleLogout = () => { logout(); router.push("/"); };

  const navigation = useMemo(
    () => [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Games", href: "/dashboard/games" },
      { name: "Progress", href: "/dashboard/progress" },
      { name: "Appointments", href: "/dashboard/appointments" },
      { name: "Resources", href: "/dashboard/resources" },
      { name: "Messages", href: "/dashboard/messages" },
      { name: "Settings", href: "/dashboard/settings" },
      { name: "Automation", href: "/dashboard/automation" },
    ],
    []
  );

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="bg-cyan-100 p-2 rounded-lg"><Heart className="h-6 w-6 text-cyan-600" /></div>
              <span className="text-xl font-serif font-bold text-gray-900">Serenity Connect</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Notifications dropdown (real data, small rectangles) */}
            <NotificationsDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={`${patient.firstName} ${patient.lastName}`} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${isNew ? "bg-blue-500" : "bg-emerald-500"}`}
                    aria-hidden
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">{patient.firstName} {patient.lastName}</p>
                      <Badge className={isNew ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}>
                        {isNew ? "New" : "Existing"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-none text-muted-foreground">{patient.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/profile"><User className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /><span>Log out</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileMenuOpen(v => !v)}>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(v => !v)} className="mt-2">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} className="text-gray-600 hover:text-gray-900 block px-3 py-2 text-base font-medium" onClick={() => setMobileMenuOpen(false)}>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
