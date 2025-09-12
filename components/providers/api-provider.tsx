"use client"

import { createContext, useContext, type ReactNode } from "react"
import { apiClient, type ApiClient } from "@/lib/api-client"

const ApiContext = createContext<ApiClient | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>
}

export function useApi() {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider")
  }
  return context
}
