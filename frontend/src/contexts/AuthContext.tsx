import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { initApiClient } from '../api/client'
import {
  refreshToken as doRefreshToken,
  login as doLogin,
  register as doRegister,
  logout as doLogout,
  getMe,
} from '../api/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<{ detail: string }>
  logout: () => Promise<void>
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Use a ref so the token getter passed to initApiClient is always stable
  // and always reads the latest token without re-initializing the client.
  const accessTokenRef = useRef<string | null>(null)

  // Stable ref for the refresh function — lets us initialize the API client
  // synchronously (before children mount) without a chicken-and-egg problem.
  const refreshRef = useRef<() => Promise<string | null>>(async () => null)

  // Initialize the API client synchronously during render so it is ready
  // before any child component's useEffect fires (children run effects first).
  const clientInitialized = useRef(false)
  if (!clientInitialized.current) {
    initApiClient(
      () => accessTokenRef.current,
      () => refreshRef.current(),
    )
    clientInitialized.current = true
  }

  // Wrapper that keeps state and ref in sync atomically
  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token
    setAccessTokenState(token)
  }, [])

  const refresh = useCallback(async (): Promise<string | null> => {
    const token = await doRefreshToken()
    if (token) setAccessToken(token)
    return token
  }, [setAccessToken])

  // Keep refreshRef pointing at the latest refresh function every render
  refreshRef.current = refresh

  useEffect(() => {
    // On mount, attempt to restore session via refresh token cookie
    const restore = async () => {
      try {
        const token = await doRefreshToken()
        if (token) {
          setAccessToken(token)
          try {
            const me = await getMe()
            setUser(me)
          } catch {
            setUser(null)
            setAccessToken(null)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    void restore()
  }, [setAccessToken])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await doLogin(email, password)
      setAccessToken(result.access_token)
      setUser(result.user)
    },
    [setAccessToken],
  )

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
      return await doRegister(email, password, firstName, lastName, phone)
    },
    [],
  )

  const logout = useCallback(async () => {
    // Clear local state first so the client is logged out even if the server call fails
    setAccessToken(null)
    setUser(null)
    try {
      await doLogout()
    } catch {
      // Server-side logout failed; local state already cleared
    }
  }, [setAccessToken])

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
