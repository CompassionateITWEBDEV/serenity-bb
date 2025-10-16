"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Calendar, 
  Video, 
  Phone, 
  MessageSquare, 
  FileText,
  Clock,
  Bell
} from "lucide-react";

interface QuickActionsProps {
  onBookAppointment?: () => void;
  onScheduleCall?: () => void;
  onSendMessage?: () => void;
  onViewNotes?: () => void;
  onSetReminder?: () => void;
  onEmergencyContact?: () => void;
}

export function QuickActions({
  onBookAppointment,
  onScheduleCall,
  onSendMessage,
  onViewNotes,
  onSetReminder,
  onEmergencyContact
}: QuickActionsProps) {
  const actions = [
    {
      id: "book",
      title: "Book Appointment",
      description: "Schedule a new therapy session",
      icon: Calendar,
      bgColor: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      iconColor: "text-white",
      onClick: onBookAppointment
    },
    {
      id: "call",
      title: "Schedule Call",
      description: "Set up a phone consultation",
      icon: Phone,
      bgColor: "bg-green-600",
      hoverColor: "hover:bg-green-700",
      iconColor: "text-white",
      onClick: onScheduleCall
    },
    {
      id: "video",
      title: "Video Session",
      description: "Start a virtual meeting",
      icon: Video,
      bgColor: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      iconColor: "text-white",
      onClick: onScheduleCall
    },
    {
      id: "message",
      title: "Send Message",
      description: "Contact your therapist",
      icon: MessageSquare,
      bgColor: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
      iconColor: "text-white",
      onClick: onSendMessage
    },
    {
      id: "notes",
      title: "View Notes",
      description: "Check your progress",
      icon: FileText,
      bgColor: "bg-violet-600",
      hoverColor: "hover:bg-violet-700",
      iconColor: "text-white",
      onClick: onViewNotes
    },
    {
      id: "reminder",
      title: "Set Reminder",
      description: "Create a medication reminder",
      icon: Bell,
      bgColor: "bg-pink-600",
      hoverColor: "hover:bg-pink-700",
      iconColor: "text-white",
      onClick: onSetReminder
    }
  ];

  return (
    <Card className="w-full shadow-sm border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`${action.bgColor} ${action.hoverColor} ${action.iconColor} rounded-lg p-6 text-left transition-all duration-200 hover:shadow-lg hover:scale-105 group`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg group-hover:bg-opacity-30 transition-all duration-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-sm leading-tight">
                      {action.title}
                    </div>
                    <div className="text-xs opacity-90 leading-tight">
                      {action.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}