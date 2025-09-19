"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, Search, Phone, Video, MoreVertical } from "lucide-react"

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState("dr-smith")
  const [newMessage, setNewMessage] = useState("")

  const conversations = [
    {
      id: "dr-smith",
      name: "Dr. Sarah Smith",
      role: "Primary Physician",
      avatar: "/caring-doctor.png",
      lastMessage: "How are you feeling today?",
      time: "2 min ago",
      unread: 2,
      online: true,
    },
    {
      id: "nurse-johnson",
      name: "Nurse Johnson",
      role: "Care Coordinator",
      avatar: "/diverse-nurses-team.png",
      lastMessage: "Medication reminder set",
      time: "1 hour ago",
      unread: 0,
      online: true,
    },
    {
      id: "counselor-mike",
      name: "Mike Wilson",
      role: "Counselor",
      avatar: "/counselor.png",
      lastMessage: "Great progress in today's session",
      time: "3 hours ago",
      unread: 1,
      online: false,
    },
  ]

  const messages = [
    {
      id: 1,
      sender: "dr-smith",
      content: "Good morning! How are you feeling today?",
      time: "9:30 AM",
      isOwn: false,
    },
    {
      id: 2,
      sender: "patient",
      content: "Good morning Dr. Smith. I'm feeling much better today, thank you.",
      time: "9:32 AM",
      isOwn: true,
    },
    {
      id: 3,
      sender: "dr-smith",
      content: "That's wonderful to hear! Have you been taking your medication as prescribed?",
      time: "9:33 AM",
      isOwn: false,
    },
    {
      id: 4,
      sender: "patient",
      content: "Yes, I've been following the schedule exactly. The app reminders really help.",
      time: "9:35 AM",
      isOwn: true,
    },
  ]

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add message logic here
      setNewMessage("")
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-2">Communicate with your healthcare team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedChat(conversation.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-l-4 ${
                    selectedChat === conversation.id ? "border-cyan-500 bg-cyan-50" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conversation.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {conversation.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">{conversation.name}</p>
                        <span className="text-xs text-gray-500">{conversation.time}</span>
                      </div>
                      <p className="text-sm text-gray-600">{conversation.role}</p>
                      <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {conversation.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={conversations.find((c) => c.id === selectedChat)?.avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {conversations
                          .find((c) => c.id === selectedChat)
                          ?.name.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{conversations.find((c) => c.id === selectedChat)?.name}</h3>
                      <p className="text-sm text-gray-600">{conversations.find((c) => c.id === selectedChat)?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isOwn ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${message.isOwn ? "text-cyan-100" : "text-gray-500"}`}>
                          {message.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 min-h-[40px] max-h-[120px]"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} className="self-end">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a healthcare provider to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
