"use client"

import { createContext, useContext, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"

// Derive the type from the instance so we don't need a named type export
type ApiClientType = typeof apiClient

const ApiContext = createContext<ApiClientType | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>
}

export function useApi(): ApiClientType {
  const ctx = useContext(ApiContext)
  if (!ctx) {
    throw new Error("useApi must be used within an ApiProvider")
  }
  return ctx
}
