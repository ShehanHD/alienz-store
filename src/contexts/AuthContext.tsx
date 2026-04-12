import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { initApiClient } from '../api/client'
import {
  refreshToken as doRefreshToken,
  login as doLogin,
  register as doRegister,
  logout as doLogout,
} from '../api/auth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => Promise<void>
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Use a ref so the token getter passed to initApiClient is always stable
  // and always reads the latest token without re-initializing the client.
  const accessTokenRef = useRef<string | null>(null)

  // Keep the ref in sync with state
  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  const refresh = useCallback(async (): Promise<string | null> => {
    const token = await doRefreshToken()
    if (token) setAccessToken(token)
    return token
  }, [])

  // Initialize the API client once with a stable getter and the refresh fn.
  // Only re-initialize if `refresh` changes (it shouldn't after mount).
  useEffect(() => {
    initApiClient(() => accessTokenRef.current, refresh)
  }, [refresh])

  useEffect(() => {
    // On mount, attempt to restore session via refresh token cookie
    setIsLoading(true)
    doRefreshToken()
      .then((token) => {
        if (token) {
          setAccessToken(token)
          // Fetch user info after token refresh
          import('../api/auth').then(({ getMe }) =>
            getMe()
              .then(setUser)
              .catch(() => {
                setUser(null)
                setAccessToken(null)
              }),
          )
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await doLogin(email, password)
    setAccessToken(result.access_token)
    setUser(result.user)
  }, [])

  const register = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      const result = await doRegister(email, password, firstName, lastName)
      setAccessToken(result.access_token)
      setUser(result.user)
    },
    [],
  )

  const logout = useCallback(async () => {
    await doLogout()
    setAccessToken(null)
    setUser(null)
  }, [])

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
