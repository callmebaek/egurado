"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // 1. 현재 사용자 ID 가져오기
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setIsLoading(false)
          return
        }

        setUserId(session.user.id)

        // 2. 등록된 매장 목록 가져오기
        const response = await fetch(api.stores.list(session.user.id))

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
  }, [])

  return {
    stores,
    hasStores: stores.length > 0,
    storeCount: stores.length,
    isLoading,
    userId,
  }
}
