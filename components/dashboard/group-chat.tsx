"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Users, Send, Settings, UserPlus, Heart } from "lucide-react"

interface GroupMember {
  id: string
  name: string
  role: "patient" | "facilitator" | "counselor"
  avatar?: string
  online: boolean
  joinDate: string
}

interface GroupMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: "patient" | "facilitator" | "counselor"
  content: string
  timestamp: string
  reactions: { emoji: string; count: number; users: string[] }[]
  supportive: boolean
}

interface GroupChat {
  id: string
  name: string
  description: string
  type: "support" | "therapy" | "recovery" | "social"
  memberCount: number
  members: GroupMember[]
  messages: GroupMessage[]
  facilitator: string
}

export function GroupChat() {
  const [groups, setGroups] = useState<GroupChat[]>([
    {
      id: "1",
      name: "Daily Recovery Support",
      description: "Daily check-ins and peer support for recovery journey",
      type: "support",
      memberCount: 12,
      facilitator: "Lisa Brown, LCSW",
      members: [
        {
          id: "1",
          name: "John D.",
          role: "patient",
          online: true,
          joinDate: "2024-01-01",
        },
        {
          id: "2",
          name: "Sarah M.",
          role: "patient",
          online: false,
          joinDate: "2024-01-03",
        },
        {
          id: "3",
          name: "Lisa Brown",
          role: "facilitator",
          avatar: "/counselor.png",
          online: true,
          joinDate: "2024-01-01",
        },
        {
          id: "4",
          name: "Mike R.",
          role: "patient",
          online: true,
          joinDate: "2024-01-05",
        },
      ],
      messages: [
        {
          id: "1",
          senderId: "3",
          senderName: "Lisa Brown",
          senderRole: "facilitator",
          content: "Good morning everyone! How is everyone feeling today? Remember, this is a safe space to share.",
          timestamp: "2024-01-15T09:00:00",
          reactions: [{ emoji: "❤️", count: 3, users: ["1", "2", "4"] }],
          supportive: true,
        },
        {
          id: "2",
          senderId: "1",
          senderName: "John D.",
          senderRole: "patient",
          content:
            "Morning Lisa! I'm feeling optimistic today. Yesterday was challenging but I made it through without using.",
          timestamp: "2024-01-15T09:15:00",
          reactions: [
            { emoji: "👏", count: 2, users: ["3", "4"] },
            { emoji: "💪", count: 1, users: ["2"] },
          ],
          supportive: false,
        },
        {
          id: "3",
          senderId: "4",
          senderName: "Mike R.",
          senderRole: "patient",
          content: "That's amazing John! You're an inspiration. I'm struggling a bit today but your message helps.",
          timestamp: "2024-01-15T09:30:00",
          reactions: [{ emoji: "❤️", count: 2, users: ["1", "3"] }],
          supportive: true,
        },
        {
          id: "4",
          senderId: "3",
          senderName: "Lisa Brown",
          senderRole: "facilitator",
          content:
            "Mike, thank you for sharing. Remember that struggling is part of the process. What coping strategies have been helpful for you?",
          timestamp: "2024-01-15T09:45:00",
          reactions: [],
          supportive: true,
        },
      ],
    },
    {
      id: "2",
      name: "Mindfulness & Meditation",
      description: "Guided meditation sessions and mindfulness practices",
      type: "therapy",
      memberCount: 8,
      facilitator: "Dr. Sarah Smith",
      members: [
        {
          id: "1",
          name: "John D.",
          role: "patient",
          online: true,
          joinDate: "2024-01-01",
        },
        {
          id: "5",
          name: "Dr. Sarah Smith",
          role: "facilitator",
          avatar: "/caring-doctor.png",
          online: false,
          joinDate: "2024-01-01",
        },
      ],
      messages: [
        {
          id: "5",
          senderId: "5",
          senderName: "Dr. Sarah Smith",
          senderRole: "facilitator",
          content:
            "Today's meditation focus: 'I am worthy of recovery and healing.' Let's practice this affirmation together.",
          timestamp: "2024-01-15T14:00:00",
          reactions: [{ emoji: "🙏", count: 4, users: ["1"] }],
          supportive: true,
        },
      ],
    },
    {
      id: "3",
      name: "Weekend Social Hour",
      description: "Casual conversations and social support",
      type: "social",
      memberCount: 15,
      facilitator: "Nurse Maria Johnson",
      members: [
        {
          id: "1",
          name: "John D.",
          role: "patient",
          online: true,
          joinDate: "2024-01-01",
        },
      ],
      messages: [
        {
          id: "6",
          senderId: "1",
          senderName: "John D.",
          senderRole: "patient",
          content: "Anyone have plans for the weekend? I'm thinking of trying that new hiking trail we talked about.",
          timestamp: "2024-01-14T16:00:00",
          reactions: [{ emoji: "🥾", count: 2, users: [] }],
          supportive: false,
        },
      ],
    },
  ])

  const [selectedGroup, setSelectedGroup] = useState<string | null>("1")
  const [newMessage, setNewMessage] = useState("")

  const getTypeColor = (type: GroupChat["type"]) => {
    switch (type) {
      case "support":
        return "bg-green-100 text-green-800"
      case "therapy":
        return "bg-blue-100 text-blue-800"
      case "recovery":
        return "bg-purple-100 text-purple-800"
      case "social":
        return "bg-orange-100 text-orange-800"
    }
  }

  const getRoleColor = (role: GroupMember["role"]) => {
    switch (role) {
      case "facilitator":
        return "bg-blue-100 text-blue-800"
      case "counselor":
        return "bg-purple-100 text-purple-800"
      case "patient":
        return "bg-gray-100 text-gray-800"
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
    if (!newMessage.trim() || !selectedGroup) return

    const group = groups.find((g) => g.id === selectedGroup)
    if (!group) return

    const message: GroupMessage = {
      id: Date.now().toString(),
      senderId: "1",
      senderName: "John D.",
      senderRole: "patient",
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      reactions: [],
      supportive: false,
    }

    setGroups((prev) => prev.map((g) => (g.id === selectedGroup ? { ...g, messages: [...g.messages, message] } : g)))

    setNewMessage("")
  }

  const addReaction = (messageId: string, emoji: string) => {
    if (!selectedGroup) return

    setGroups((prev) =>
      prev.map((group) =>
        group.id === selectedGroup
          ? {
              ...group,
              messages: group.messages.map((msg) => {
                if (msg.id === messageId) {
                  const existingReaction = msg.reactions.find((r) => r.emoji === emoji)
                  if (existingReaction) {
                    return {
                      ...msg,
                      reactions: msg.reactions.map((r) =>
                        r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, "1"] } : r,
                      ),
                    }
                  } else {
                    return {
                      ...msg,
                      reactions: [...msg.reactions, { emoji, count: 1, users: ["1"] }],
                    }
                  }
                }
                return msg
              }),
            }
          : group,
      ),
    )
  }

  const selectedGroupData = groups.find((g) => g.id === selectedGroup)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
      {/* Groups List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support Groups
          </CardTitle>
          <CardDescription>Join group conversations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {groups.map((group, index) => (
              <div key={group.id}>
                <div
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedGroup === group.id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <Badge className={getTypeColor(group.type)} variant="secondary">
                        {group.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{group.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.memberCount} members
                      </span>
                      <span>Facilitator: {group.facilitator.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
                {index < groups.length - 1 && <Separator />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2">
        {selectedGroupData ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedGroupData.name}</h3>
                  <p className="text-sm text-gray-600">{selectedGroupData.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getTypeColor(selectedGroupData.type)} variant="secondary">
                      {selectedGroupData.type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {selectedGroupData.memberCount} members • Facilitated by {selectedGroupData.facilitator}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px] p-4">
                <div className="space-y-4">
                  {selectedGroupData.messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="text-xs">
                            {message.senderName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{message.senderName}</span>
                            <Badge className={getRoleColor(message.senderRole)} variant="outline">
                              {message.senderRole}
                            </Badge>
                            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                            {message.supportive && <Heart className="h-3 w-3 text-red-500" />}
                          </div>
                          <p className="text-sm text-gray-900 leading-relaxed">{message.content}</p>
                          {message.reactions.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              {message.reactions.map((reaction, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs bg-transparent"
                                  onClick={() => addReaction(message.id, reaction.emoji)}
                                >
                                  {reaction.emoji} {reaction.count}
                                </Button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => addReaction(message.id, "❤️")}
                            >
                              ❤️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => addReaction(message.id, "👏")}
                            >
                              👏
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => addReaction(message.id, "💪")}
                            >
                              💪
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => addReaction(message.id, "🙏")}
                            >
                              🙏
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Share your thoughts with the group..."
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Remember: This is a safe, supportive space. Be kind and respectful to all members.
                </p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a group to join the conversation</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Group Members */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            {selectedGroupData ? `${selectedGroupData.memberCount} members` : "Select a group"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {selectedGroupData && (
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-3">
                {selectedGroupData.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {member.online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{member.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge className={getRoleColor(member.role)} variant="outline">
                          {member.role}
                        </Badge>
                        {member.online ? (
                          <span className="text-xs text-green-600">Online</span>
                        ) : (
                          <span className="text-xs text-gray-500">Offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default GroupChat;          // ← add this
