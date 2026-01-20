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
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // 1. 사용자 인증 확인
        if (!user) {
          setIsLoading(false)
          return
        }

        // 2. 등록된 매장 목록 가져오기
        const response = await fetch(api.stores.list(user.id))

        if (!response.ok) {
          throw new Error("Failed to fetch stores")
        }

        const data = await response.json()
        setStores(data.stores || [])
      } catch (error) {
        console.error("Error fetching stores:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [user])

  return {
    stores,
    hasStores: stores.length > 0,
    storeCount: stores.length,
    isLoading,
    userId: user?.id || null,
  }
}
