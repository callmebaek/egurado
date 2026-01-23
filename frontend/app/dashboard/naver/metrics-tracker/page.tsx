"use client"

import { useAuth } from "@/lib/auth-context"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, TrendingUp, Plus, Trash2, Bell, Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { api } from "@/lib/config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Store {
  id: string
  name: string
  place_id: string
  platform: string
}

interface TrackedKeyword {
  id: string
  keyword: string
  store_id: string
  store_name?: string
  current_rank: number | null
  previous_rank: number | null
  rank_change: number | null
  last_collected_at: string | null
  is_tracked: boolean
  notification_settings?: {
    email: boolean
    sms: boolean
    kakao: boolean
  }
}

interface SearchedKeyword {
  id: string
  keyword: string
  store_id: string
  last_searched_at: string
}

export default function MetricsTrackerPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const { stores, selectedStore: selectedStoreId, setSelectedStore, loading: storesLoading } = useStores()

  const [loading, setLoading] = useState(false)
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([])
  const [searchedKeywords, setSearchedKeywords] = useState<SearchedKeyword[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")

  useEffect(() => {
    loadData()
  }, [selectedStoreId])

  const loadData = async () => {
    if (!selectedStoreId) return
    
    try {
      setLoading(true)
      const token = getToken()
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        return
      }

      // 매장의 추적 중인 키워드 로드
      const keywordsResponse = await fetch(api.naver.keywords(selectedStoreId), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (keywordsResponse.ok) {
        const data = await keywordsResponse.json()
        const tracked = (data.keywords || []).filter((k: any) => k.is_tracked)
        setTrackedKeywords(tracked)
        
        // 조회된 키워드 목록 (추적 추가용)
        const searched = (data.keywords || [])
          .filter((k: any) => !k.is_tracked)
          .slice(0, 10)
        setSearchedKeywords(searched)
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "로드 실패",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTracking = async () => {
    if (!newKeyword.trim()) {
      toast({
        title: "입력 오류",
        description: "키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    // 여기서는 기존 키워드에서 선택하거나 새로 추가하는 로직 구현
    toast({
      title: "준비 중",
      description: "추적 추가 기능은 플레이스 순위조회에서 이용해주세요.",
    })
    setShowAddDialog(false)
  }

  const handleSelectSearchedKeyword = async (keywordId: string) => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.naver.trackKeyword(keywordId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "추적 시작",
          description: "키워드 추적이 시작되었습니다. 데이터를 수집 중입니다.",
        })
        setShowAddDialog(false)
        loadData()
      } else {
        throw new Error("추적 시작 실패")
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "키워드 추적을 시작할 수 없습니다.",
        variant: "destructive",
      })
    }
  }

  const getRankBadgeColor = (rank: number | null) => {
    if (!rank) return "bg-gray-100 text-gray-600"
    if (rank <= 3) return "bg-green-100 text-green-700"
    if (rank <= 10) return "bg-blue-100 text-blue-700"
    if (rank <= 30) return "bg-yellow-100 text-yellow-700"
    return "bg-red-100 text-red-700"
  }

  const getRankChangeIcon = (change: number | null) => {
    if (!change || change === 0) return null
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    return <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
  }

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (stores.length === 0) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주요지표 추적</h1>
          <p className="text-muted-foreground mt-2">
            중요한 키워드의 순위 변화를 추적하고 알림을 받으세요
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          추적 추가
        </Button>
      </div>

      {/* 매장 선택 */}
      {stores.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {stores.map((store) => (
            <Button
              key={store.id}
              variant={selectedStoreId === store.id ? "default" : "outline"}
              onClick={() => setSelectedStore(store.id)}
            >
              {store.name}
            </Button>
          ))}
        </div>
      )}

      {/* 추적 중인 키워드 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : trackedKeywords.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            추적 중인 키워드가 없습니다.
            <br />
            플레이스 순위조회에서 키워드를 조회한 후 추적을 시작하세요.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trackedKeywords.map((keyword) => (
            <Card key={keyword.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* 키워드 제목 */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{keyword.keyword}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stores.find((s) => s.id === keyword.store_id)?.name}
                    </p>
                  </div>
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>

                {/* 현재 순위 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-4 py-2 rounded-full text-2xl font-bold ${getRankBadgeColor(
                      keyword.current_rank
                    )}`}
                  >
                    {keyword.current_rank || "-"}위
                  </span>
                  {getRankChangeIcon(keyword.rank_change)}
                  {keyword.rank_change && keyword.rank_change !== 0 && (
                    <span
                      className={`text-sm font-medium ${
                        keyword.rank_change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {Math.abs(keyword.rank_change)}
                    </span>
                  )}
                </div>

                {/* 마지막 수집 시간 */}
                <div className="text-sm text-muted-foreground">
                  {keyword.last_collected_at
                    ? `마지막 수집: ${new Date(keyword.last_collected_at).toLocaleString("ko-KR")}`
                    : "데이터 수집 중..."}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    설정
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 추적 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>키워드 추적 추가</DialogTitle>
            <DialogDescription>
              플레이스 순위조회에서 조회한 키워드를 추적할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 조회된 키워드 목록 */}
            {searchedKeywords.length > 0 && (
              <div>
                <Label>최근 조회한 키워드</Label>
                <div className="grid gap-2 mt-2">
                  {searchedKeywords.map((keyword) => (
                    <Button
                      key={keyword.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleSelectSearchedKeyword(keyword.id)}
                    >
                      {keyword.keyword}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(keyword.last_searched_at).toLocaleDateString("ko-KR")}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 새 키워드 입력 */}
            <div>
              <Label htmlFor="new-keyword">또는 직접 입력</Label>
              <Input
                id="new-keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="추적할 키워드를 입력하세요"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                * 먼저 플레이스 순위조회에서 키워드를 조회해주세요
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAddTracking}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
