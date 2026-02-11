'use client'

/**
 * 인증 컨텍스트
 * 사용자 인증 상태 관리
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  display_name: string | null
  subscription_tier: string
  auth_provider: string
  user_position: string | null
  marketing_experience: string | null
  agency_experience: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName?: string) => Promise<void>
  confirmEmail: (userId: string, email: string, displayName?: string) => Promise<void>
  loginWithKakao: (code: string) => Promise<void>
  loginWithNaver: (code: string, state: string) => Promise<void>
  sendOtp: (phoneNumber: string) => Promise<{ success: boolean; message: string; expires_in?: number }>
  verifyOtpAndLogin: (phoneNumber: string, code: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // 토큰 저장/조회/삭제
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token')
    }
    return null
  }

  const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
    }
  }

  const removeToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
    }
  }

  // 현재 사용자 정보 가져오기
  const refreshUser = async () => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        removeToken()
        setUser(null)
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      removeToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드 시 사용자 정보 가져오기
  useEffect(() => {
    refreshUser()
  }, [])

  // 이메일 로그인
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '로그인에 실패했습니다')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 필요 시 온보딩 페이지로 이동
    if (data.onboarding_required) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  // 이메일 회원가입
  const signup = async (email: string, password: string, displayName?: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, display_name: displayName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '회원가입에 실패했습니다')
    }

    const data = await response.json()
    
    // 이메일 인증 필요 시 인증 대기 페이지로 이동
    if (data.requires_email_confirmation) {
      router.push('/auth/verify-email?email=' + encodeURIComponent(email))
      return
    }
    
    // 이메일 인증 불필요 (예: 소셜 로그인) - 바로 로그인
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 페이지로 이동
    router.push('/onboarding')
  }

  // 이메일 확인 후 프로필 생성 및 로그인
  const confirmEmail = async (userId: string, email: string, displayName?: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/confirm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        user_id: userId, 
        email, 
        display_name: displayName 
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '이메일 인증에 실패했습니다')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 페이지로 이동
    router.push('/onboarding')
  }

  // 카카오 로그인
  const loginWithKakao = async (code: string) => {
    // 디버깅: 실제 사용되는 값 확인
    console.log('=== KAKAO API CALL DEBUG ===')
    console.log('API_URL:', API_URL)
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
    console.log('Full URL:', `${API_URL}/api/v1/auth/kakao`)
    console.log('Code:', code.substring(0, 50) + '...')
    console.log('===========================')
    
    const response = await fetch(`${API_URL}/api/v1/auth/kakao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('=== KAKAO LOGIN ERROR ===')
      console.error('Status:', response.status)
      console.error('Error:', error)
      console.error('========================')
      throw new Error(error.detail || '카카오 로그인에 실패했습니다')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 필요 시 온보딩 페이지로 이동
    if (data.onboarding_required) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  // 네이버 로그인
  const loginWithNaver = async (code: string, state: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/naver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '네이버 로그인에 실패했습니다')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 필요 시 온보딩 페이지로 이동
    if (data.onboarding_required) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  // OTP 인증코드 발송
  const sendOtp = async (phoneNumber: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'OTP 발송에 실패했습니다')
    }

    return await response.json()
  }

  // OTP 인증 후 로그인
  const verifyOtpAndLogin = async (phoneNumber: string, code: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber, code, purpose: 'login' }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '인증에 실패했습니다')
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)

    // 온보딩 필요 시 온보딩 페이지로 이동
    if (data.onboarding_required) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
  }

  // 로그아웃
  const logout = () => {
    removeToken()
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        confirmEmail,
        loginWithKakao,
        loginWithNaver,
        sendOtp,
        verifyOtpAndLogin,
        logout,
        refreshUser,
        getToken,
      }}
    >
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
