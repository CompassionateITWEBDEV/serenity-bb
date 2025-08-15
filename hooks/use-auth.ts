"use client"

import { useState, useEffect } from "react"
import { AuthService, type AuthState } from "@/lib/auth"

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    patient: null,
    loading: true,
  })

  useEffect(() => {
    const authService = AuthService.getInstance()

    const initAuth = async () => {
      await authService.checkAuth()
      setAuthState(authService.getAuthState())
    }

    initAuth()

    // Subscribe to auth changes
    const unsubscribe = authService.subscribe(setAuthState)

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    const authService = AuthService.getInstance()
    return await authService.login(email, password)
  }

  const signup = async (patientData: any) => {
    const authService = AuthService.getInstance()
    return await authService.signup(patientData)
  }

  const logout = () => {
    const authService = AuthService.getInstance()
    authService.logout()
  }

  return {
    ...authState,
    login,
    signup,
    logout,
  }
}
