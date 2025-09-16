"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Send, Phone, Video, Clock, CheckCircle2, Circle, Mic, Paperclip, Smile } from "lucide-react"

interface Message {
  id: string
  senderId: string
  senderName: string
  senderRole: "patient" | "doctor" | "nurse" | "counselor"
  content: string
  timestamp: string
  read: boolean
  urgent: boolean
  typing?: boolean
}

interface Conversation {
  id: string
  providerId: string
  providerName: string
  providerRole: "doctor" | "nurse" | "counselor"
  providerAvatar?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  online: boolean
  typing: boolean
  messages: Message[]
}

export function HealthcareMessaging() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      providerId: "dr-smith",
      providerName: "Dr. Sarah Smith",
      providerRole: "doctor",
      providerAvatar: "/caring-doctor.png",
      lastMessage: "How are you feeling after the medication adjustment?",
      lastMessageTime: "2024-01-15T14:30:00",
      unreadCount: 2,
      online: true,
      typing: false,
      messages: [
        {
          id: "1",
          senderId: "dr-smith",
          senderName: "Dr. Sarah Smith",
          senderRole: "doctor",
          content: "Good morning! I wanted to check in about your progress this week.",
          timestamp: "2024-01-15T09:00:00",
          read: true,
          urgent: false,
        },
        {
          id: "2",
          senderId: "patient",
          senderName: "You",
          senderRole: "patient",
          content: "Good morning Dr. Smith! I've been feeling much better. The new dosage seems to be working well.",
          timestamp: "2024-01-15T09:15:00",
          read: true,
          urgent: false,
        },
        {
          id: "3",
          senderId: "dr-smith",
          senderName: "Dr. Sarah Smith",
          senderRole: "doctor",
          content: "That's wonderful to hear! Any side effects or concerns?",
          timestamp: "2024-01-15T14:00:00",
          read: true,
          urgent: false,
        },
        {
          id: "4",
          senderId: "dr-smith",
          senderName: "Dr. Sarah Smith",
          senderRole: "doctor",
          content: "How are you feeling after the medication adjustment?",
          timestamp: "2024-01-15T14:30:00",
          read: false,
          urgent: false,
        },
      ],
    },
    {
      id: "2",
      providerId: "nurse-johnson",
      providerName: "Nurse Maria Johnson",
      providerRole: "nurse",
      providerAvatar: "/diverse-nurses-team.png",
      lastMessage: "Please remember to take your vitals tomorrow morning",
      lastMessageTime: "2024-01-15T16:45:00",
      unreadCount: 0,
      online: true,
      typing: false,
      messages: [
        {
          id: "5",
          senderId: "nurse-johnson",
          senderName: "Nurse Maria Johnson",
          senderRole: "nurse",
          content: "Hi! Just a reminder about your appointment tomorrow at 10 AM.",
          timestamp: "2024-01-15T16:00:00",
          read: true,
          urgent: false,
        },
        {
          id: "6",
          senderId: "nurse-johnson",
          senderName: "Nurse Maria Johnson",
          senderRole: "nurse",
          content: "Please remember to take your vitals tomorrow morning",
          timestamp: "2024-01-15T16:45:00",
          read: true,
          urgent: false,
        },
      ],
    },
    {
      id: "3",
      providerId: "counselor-brown",
      providerName: "Lisa Brown, LCSW",
      providerRole: "counselor",
      providerAvatar: "/counselor.png",
      lastMessage: "Great progress in today's session!",
      lastMessageTime: "2024-01-14T15:30:00",
      unreadCount: 1,
      online: false,
      typing: false,
      messages: [
        {
          id: "7",
          senderId: "counselor-brown",
          senderName: "Lisa Brown, LCSW",
          senderRole: "counselor",
          content: "Great progress in today's session!",
          timestamp: "2024-01-14T15:30:00",
          read: false,
          urgent: false,
        },
      ],
    },
  ])

  const [selectedConversation, setSelectedConversation] = useState<string | null>("1")
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)


  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving new messages
      if (Math.random() < 0.1) {
        // 10% chance every 5 seconds
        const randomConv = conversations[Math.floor(Math.random() * conversations.length)]
        const responses = [
          "Thanks for the update!",
          "How are you feeling today?",
          "Please let me know if you have any concerns.",
          "Your progress looks great!",
          "Don't forget your next appointment.",
        ]

        const newMsg: Message = {
          id: Date.now().toString(),
          senderId: randomConv.providerId,
          senderName: randomConv.providerName,
          senderRole: randomConv.providerRole,
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
          read: false,
          urgent: false,
        }

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === randomConv.id
              ? {
                  ...conv,
                  messages: [...conv.messages, newMsg],
                  lastMessage: newMsg.content,
                  lastMessageTime: newMsg.timestamp,
                  unreadCount: conv.id === selectedConversation ? 0 : conv.unreadCount + 1,
                  typing: false,
                }
              : conv,
          ),
        )
      }

      // Simulate typing indicators
      if (Math.random() < 0.05) {
        // 5% chance
        const randomConv = conversations[Math.floor(Math.random() * conversations.length)]
        setConversations((prev) => prev.map((conv) => (conv.id === randomConv.id ? { ...conv, typing: true } : conv)))

        setTimeout(() => {
          setConversations((prev) =>
            prev.map((conv) => (conv.id === randomConv.id ? { ...conv, typing: false } : conv)),
          )
        }, 3000)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [conversations, selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversations, selectedConversation])

  useEffect(() => {
    if (newMessage.trim()) {
      setIsTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)
    } else {
      setIsTyping(false)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [newMessage])

  const getRoleColor = (role: "doctor" | "nurse" | "counselor") => {
    switch (role) {
      case "doctor":
        return "bg-blue-100 text-blue-800"
      case "nurse":
        return "bg-green-100 text-green-800"
      case "counselor":
        return "bg-purple-100 text-purple-800"
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString()
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return

    const conversation = conversations.find((c) => c.id === selectedConversation)
    if (!conversation) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: "patient",
      senderName: "You",
      senderRole: "patient",
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: true,
      urgent: false,
    }

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
            }
          : conv,
      ),
    )

    setNewMessage("")
    setIsTyping(false)

    setTimeout(
      () => {
        const responses = [
          "Thank you for letting me know.",
          "I'll review this information.",
          "That sounds good. Keep up the great work!",
          "Please continue with your current plan.",
          "I'll follow up with you soon.",
        ]

        const responseMsg: Message = {
          id: (Date.now() + 1).toString(),
          senderId: conversation.providerId,
          senderName: conversation.providerName,
          senderRole: conversation.providerRole,
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
          read: false,
          urgent: false,
        }

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  messages: [...conv.messages, responseMsg],
                  lastMessage: responseMsg.content,
                  lastMessageTime: responseMsg.timestamp,
                }
              : conv,
          ),
        )
      },
      2000 + Math.random() * 3000,
    ) // Random delay between 2-5 seconds
  }

  const markAsRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              unreadCount: 0,
              messages: conv.messages.map((msg) => ({ ...msg, read: true })),
            }
          : conv,
      ),
    )
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Healthcare Team
          </CardTitle>
          <CardDescription>Real-time messages from your care providers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversations.map((conversation, index) => (
              <div key={conversation.id}>
                <div
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation.id)
                    markAsRead(conversation.id)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.providerAvatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {conversation.providerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{conversation.providerName}</h4>
                        <span className="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getRoleColor(conversation.providerRole)} variant="secondary">
                          {conversation.providerRole}
                        </Badge>
                        {conversation.online && (
                          <Badge variant="outline" className="text-xs">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      {conversation.typing ? (
                        <p className="text-sm text-blue-600 italic flex items-center gap-1">
                          <Circle className="h-2 w-2 animate-pulse" />
                          typing...
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                {index < conversations.length - 1 && <Separator />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2">
        {selectedConv ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedConv.providerAvatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedConv.providerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedConv.providerName}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(selectedConv.providerRole)} variant="secondary">
                        {selectedConv.providerRole}
                      </Badge>
                      {selectedConv.typing ? (
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 animate-pulse" />
                          typing...
                        </span>
                      ) : selectedConv.online ? (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Online
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={!selectedConv.online}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={!selectedConv.online}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px] p-4">
                <div className="space-y-4">
                  {selectedConv.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderRole === "patient" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderRole === "patient" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                        } ${!message.read && message.senderRole !== "patient" ? "ring-2 ring-blue-200" : ""}`}
                      >
                        {message.senderRole !== "patient" && (
                          <div className="text-xs font-medium mb-1 opacity-70">{message.senderName}</div>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                          {message.senderRole === "patient" && (
                            <div className="ml-2">
                              {message.read ? (
                                <CheckCircle2 className="h-3 w-3 opacity-70" />
                              ) : (
                                <Clock className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedConv.typing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedConv.online ? "Type your message..." : "Provider is offline"}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                    disabled={!selectedConv.online}
                  />
                  <Button size="sm" variant="outline" className="px-2 bg-transparent">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button onClick={sendMessage} disabled={!newMessage.trim() || !selectedConv.online}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {isTyping && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Circle className="w-2 h-2 animate-pulse" />
                    You are typing...
                  </div>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
              <p className="text-sm mt-2">Real-time chat with your healthcare team</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
