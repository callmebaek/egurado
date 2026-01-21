"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"

interface Store {
  id: string
  place_id: string
  store_name: string
  category: string
  address: string
  platform: string
  status: string
  created_at: string
}

export function useStores() {
  const { user, getToken } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // 1. 사용자 인증 확인
        const token = getToken()
        if (!user || !token) {
          console.log("[DEBUG] useStores - No user or token")
          setIsLoading(false)
          return
        }

        // 디버깅: user 정보 로깅
        console.log("[DEBUG] useStores - user:", user)
        console.log("[DEBUG] useStores - user.id:", user.id)
        console.log("[DEBUG] useStores - token exists:", !!token)

        // 2. 등록된 매장 목록 가져오기 (Authorization 헤더 포함)
        const response = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          console.error("[DEBUG] useStores - API 실패:", response.status, response.statusText)
          throw new Error("Failed to fetch stores")
        }

        const data = await response.json()
        console.log("[DEBUG] useStores - API 응답:", data)
        console.log("[DEBUG] useStores - 매장 개수:", data.stores?.length || 0)
        setStores(data.stores || [])
      } catch (error) {
        console.error("Error fetching stores:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [user]) // getToken은 함수이므로 의존성에서 제거

  return {
    stores,
    hasStores: stores.length > 0,
    storeCount: stores.length,
    isLoading,
    userId: user?.id || null,
  }
}
