"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, MessageCircle, Phone, Gamepad2, BookOpen, Video, Users, Activity } from "lucide-react"

export function QuickActions() {
  const actions = [
    {
      title: "Record Video",
      description: "Daily check-in recording",
      icon: Video,
      href: "#",
      onClick: () => {
        // Switch to recording tab
        const recordingTab = document.querySelector('[data-value="recording"]') as HTMLElement
        recordingTab?.click()
      },
      color: "bg-red-100 text-red-600",
    },
    {
      title: "Track Progress",
      description: "View recovery progress & goals",
      icon: Activity,
      href: "/dashboard/progress", // Updated to link to progress page instead of tab switching
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Message Team",
      description: "Chat with healthcare providers",
      icon: MessageCircle,
      href: "#",
      onClick: () => {
        // Switch to messages tab
        const messagesTab = document.querySelector('[data-value="messages"]') as HTMLElement
        messagesTab?.click()
      },
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Join Groups",
      description: "Connect with peer support",
      icon: Users,
      href: "#",
      onClick: () => {
        // Switch to groups tab
        const groupsTab = document.querySelector('[data-value="groups"]') as HTMLElement
        groupsTab?.click()
      },
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Play Games",
      description: "Interactive recovery activities",
      icon: Gamepad2,
      href: "/dashboard/games",
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Schedule Appointment",
      description: "Book your next session",
      icon: Calendar,
      href: "/dashboard/appointments",
      color: "bg-cyan-100 text-cyan-600",
    },
    {
      title: "View Resources",
      description: "Educational materials",
      icon: BookOpen,
      href: "/dashboard/resources",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      title: "Crisis Support",
      description: "24/7 emergency help",
      icon: Phone,
      href: "tel:+1-800-273-8255",
      color: "bg-red-100 text-red-600",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => {
            const Icon = action.icon

            if (action.onClick) {
              return (
                <Button
                  key={action.title}
                  variant="ghost"
                  className="w-full justify-start h-auto p-4 hover:bg-gray-50"
                  onClick={action.onClick}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{action.title}</div>
                      <div className="text-sm text-gray-600">{action.description}</div>
                    </div>
                  </div>
                </Button>
              )
            }

            return (
              <Link key={action.title} href={action.href}>
                <Button variant="ghost" className="w-full justify-start h-auto p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{action.title}</div>
                      <div className="text-sm text-gray-600">{action.description}</div>
                    </div>
                  </div>
                </Button>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
