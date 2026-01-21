'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { signIn as mongoSignIn, signUp as mongoSignUp, getUserProfile, generateToken, verifyToken } from '@/lib/db/auth'

export interface AuthUser {
  userId: string
  email: string
  role: 'student' | 'faculty' | 'hod' | 'principal' | 'admin'
}

export interface UserProfile {
  _id: string
  userId: string
  email: string
  fullName: string
  role: 'student' | 'faculty' | 'hod' | 'principal' | 'admin'
  department: string | null
  departmentName?: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, role: string, department?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/profile/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.userId)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          // Verify token on client side (basic verification)
          const response = await fetch('/api/auth/verify', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
            await fetchProfile(userData.userId)
          } else {
            localStorage.removeItem('authToken')
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: new Error(data.error || 'Sign in failed') }
      }

      localStorage.setItem('authToken', data.token)
      setUser(data.user)
      await fetchProfile(data.user.userId)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: string, department?: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role, department }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: new Error(data.error || 'Sign up failed') }
      }

      localStorage.setItem('authToken', data.token)
      setUser(data.user)
      await fetchProfile(data.user.userId)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('authToken')
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
