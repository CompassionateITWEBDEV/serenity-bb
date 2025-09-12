"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Zap } from "lucide-react"

interface RealtimeStatusProps {
  isOnline: boolean
  isRealtimeEnabled: boolean
}

export function RealtimeStatusIndicator({ isOnline, isRealtimeEnabled }: RealtimeStatusProps) {
  if (!isOnline) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    )
  }

  if (isRealtimeEnabled) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
        <Zap className="h-3 w-3" />
        Live
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Wifi className="h-3 w-3" />
      Connected
    </Badge>
  )
}
