"use client"

import { useState, useEffect } from "react"
import { Search, Store, MapPin, ChevronRight, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/config"

interface StoreSearchResult {
  place_id: string
  name: string
  category: string
  address: string
  road_address?: string
  thumbnail?: string
}

interface RegisteredStore {
  id: string
  place_id: string
  name: string
  category: string
  address: string
  road_address?: string
  thumbnail?: string
  platform: string
  status: string
  created_at: string
}

interface SearchResponse {
  status: string
  query: string
  results: StoreSearchResult[]
  total_count: number
}

interface StoresListResponse {
  status: string
  stores: RegisteredStore[]
  total_count: number
}

export default function ConnectStorePage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<StoreSearchResult[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null)
  const [connectingPlaceId, setConnectingPlaceId] = useState<string | null>(null)
  const [searchCompleted, setSearchCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null)

  // 현재 로그인한 사용자 ID 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }
    getCurrentUser()
  }, [])

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (userId) {
      fetchRegisteredStores()
    }
  }, [userId])

  const fetchRegisteredStores = async () => {
    if (!userId) return

    setIsLoadingStores(true)
    try {
      const response = await fetch(api.stores.list(userId))

      if (!response.ok) {
        throw new Error("매장 목록 조회에 실패했습니다.")
      }

      const data: StoresListResponse = await response.json()
      setRegisteredStores(data.stores)
    } catch (error) {
      console.error("Error fetching stores:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: "등록된 매장 목록을 불러오는데 실패했습니다.",
      })
    } finally {
      setIsLoadingStores(false)
    }
  }

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!userId) return

    if (!confirm(`"${storeName}" 매장을 삭제하시겠습니까?`)) {
      return
    }

    setDeletingStoreId(storeId)
    try {
      const response = await fetch(
        api.stores.delete(storeId, userId),
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("매장 삭제에 실패했습니다.")
      }

      toast({
        variant: "success",
        title: "✅ 매장 삭제 완료",
        description: `"${storeName}" 매장이 삭제되었습니다.`,
      })

      // 목록 새로고침
      await fetchRegisteredStores()
    } catch (error) {
      console.error("Error deleting store:", error)
      toast({
        variant: "destructive",
        title: "❌ 삭제 실패",
        description: error instanceof Error ? error.message : "매장 삭제에 실패했습니다.",
      })
    } finally {
      setDeletingStoreId(null)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) {
      setError("매장명을 입력해주세요.")
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])
    setSearchCompleted(false)

    try {
      // 백엔드 API 호출 (비공식 API 방식 - 2-3배 빠름) ⭐
      const response = await fetch(api.naver.searchStores(searchQuery))

      if (!response.ok) {
        throw new Error("매장 검색에 실패했습니다.")
      }

      const data: SearchResponse = await response.json()

      if (data.results.length === 0) {
        setError("검색 결과가 없습니다. 다른 매장명으로 시도해주세요.")
      } else {
        setSearchResults(data.results)
        setSearchCompleted(true)
      }
    } catch (err) {
      console.error("Search error:", err)
      setError(err instanceof Error ? err.message : "매장 검색 중 오류가 발생했습니다.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleConnectStore = async (store: StoreSearchResult) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: "사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.",
      })
      return
    }

    setConnectingPlaceId(store.place_id)
    setError(null)

    try {
      // 매장 등록 API 호출
      const response = await fetch(api.stores.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          place_id: store.place_id,
          name: store.name,
          category: store.category,
          address: store.address,
          road_address: store.road_address || "",
          thumbnail: store.thumbnail || "",
          platform: "naver",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "매장 등록에 실패했습니다.")
      }

      const data = await response.json()
      
      // 성공 처리
      setSelectedStore(store)
      
      // 성공 Toast 표시
      toast({
        variant: "success",
        title: "✅ 매장 등록 완료",
        description: `"${store.name}" 매장이 성공적으로 등록되었습니다!`,
      })
      
      // 등록된 매장 목록 새로고침
      await fetchRegisteredStores()
      
      // 검색 결과 초기화
      setSearchResults([])
      setSearchCompleted(false)
      setSearchQuery("")

    } catch (err) {
      console.error("Connect error:", err)
      const errorMessage = err instanceof Error ? err.message : "매장 연결 중 오류가 발생했습니다."
      setError(errorMessage)
      
      // 에러 Toast 표시
      toast({
        variant: "destructive",
        title: "❌ 매장 등록 실패",
        description: errorMessage,
      })
    } finally {
      setConnectingPlaceId(null)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          내 매장 등록
        </h1>
        <p className="text-muted-foreground">
          연결하고 싶은 매장을 검색하여 등록하세요
        </p>
      </div>

      {/* 등록된 매장 목록 */}
      {isLoadingStores ? (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-muted-foreground">등록된 매장을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : registeredStores.length > 0 ? (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>등록된 매장 ({registeredStores.length}개)</span>
              <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                최대: Free 1개 / Basic 3개 / Pro 10개
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {registeredStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 썸네일 */}
                  {store.thumbnail ? (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <div className="absolute inset-0 bg-gray-200 rounded-md animate-pulse" />
                      <img
                        src={store.thumbnail}
                        alt={store.name}
                        className="relative w-12 h-12 object-cover rounded-md"
                        loading="lazy"
                        onLoad={(e) => {
                          const parent = e.currentTarget.previousElementSibling as HTMLElement
                          if (parent) parent.style.display = 'none'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}

                  {/* 매장 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        store.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {store.status === 'active' ? '활성' : store.status}
                      </span>
                    </div>
                    {store.category && (
                      <p className="text-xs text-muted-foreground truncate">
                        {store.category}
                      </p>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://m.place.naver.com/place/${store.place_id}`, '_blank')}
                    className="h-8 px-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id, store.name)}
                    disabled={deletingStoreId === store.id}
                    className="h-8 px-2"
                  >
                    {deletingStoreId === store.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 bg-blue-50/50 border-blue-200">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              아직 등록된 매장이 없습니다. 아래에서 매장을 검색하여 등록해보세요!
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="매장명을 입력하세요 (예: 스타벅스 강남점)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              disabled={isSearching}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isSearching || !searchQuery.trim()}
            className="h-12 px-6"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                검색중...
              </>
            ) : (
              "검색"
            )}
          </Button>
        </div>
      </form>

      {/* 로딩 상태 */}
      {isSearching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">매장을 검색하고 있습니다...</p>
              <p className="text-sm text-blue-700 mt-1">
                네이버 지도에서 "{searchQuery}" 매장을 찾는 중입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 성공 메시지 */}
      {selectedStore && !connectingPlaceId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                매장이 성공적으로 등록되었습니다!
              </p>
              <p className="text-sm text-green-700 mt-1">
                잠시 후 대시보드로 이동합니다...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {searchCompleted && searchResults.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            검색 결과 ({searchResults.length}개)
          </h2>
          <div className="grid gap-4">
            {searchResults.map((store) => {
              const isAlreadyRegistered = registeredStores.some(
                (registered) => registered.place_id === store.place_id
              )
              
              return (
                <Card
                  key={store.place_id}
                  className={`hover:shadow-lg transition-shadow border-2 ${
                    isAlreadyRegistered 
                      ? 'bg-gray-50 border-gray-300' 
                      : 'hover:border-primary'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                    {/* 썸네일 이미지 */}
                    {store.thumbnail ? (
                      <div className="flex-shrink-0 relative w-20 h-20">
                        <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse" />
                        <img
                          src={store.thumbnail}
                          alt={store.name}
                          className="relative w-20 h-20 object-cover rounded-lg"
                          loading="lazy"
                          onLoad={(e) => {
                            const parent = e.currentTarget.previousElementSibling as HTMLElement
                            if (parent) parent.style.display = 'none'
                          }}
                          onError={(e) => {
                            // 이미지 로드 실패 시 아이콘으로 대체
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 bg-primary/10 p-3 rounded-lg">
                        <Store className="h-14 w-14 text-primary" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="font-bold text-lg">{store.name}</h3>
                        {store.category && (
                          <p className="text-sm text-muted-foreground">
                            {store.category}
                          </p>
                        )}
                      </div>

                      {store.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>{store.address}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        플레이스 ID: {store.place_id}
                      </p>
                    </div>

                    {isAlreadyRegistered ? (
                      <div className="flex-shrink-0 px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-semibold">
                        이미 등록됨
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnectStore(store)}
                        disabled={connectingPlaceId !== null || selectedStore !== null}
                        size="lg"
                        className="flex-shrink-0"
                      >
                        {connectingPlaceId === store.place_id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            연결중...
                          </>
                        ) : (
                          <>
                            연결
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        </div>
      )}

      {/* 안내 메시지 (검색 전) */}
      {!isSearching && !searchCompleted && searchResults.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">
            매장을 검색해보세요
          </h3>
          <p className="text-sm text-gray-600">
            위 검색창에 매장명을 입력하면
            <br />
            네이버 지도에서 매장을 찾아드립니다
          </p>
        </div>
      )}
    </div>
  )
}
