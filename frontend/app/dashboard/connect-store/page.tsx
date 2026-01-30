"use client"

import { useState, useEffect } from "react"
import { Search, Store, MapPin, ChevronRight, CheckCircle2, Loader2, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
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
  const { user, getToken } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<StoreSearchResult[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null)
  const [connectingPlaceId, setConnectingPlaceId] = useState<string | null>(null)
  const [searchCompleted, setSearchCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null)

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchRegisteredStores()
    }
  }, [user])

  const fetchRegisteredStores = async () => {
    const token = getToken()
    if (!user || !token) return

    setIsLoadingStores(true)
    try {
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

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
    const token = getToken()
    if (!user || !token) return

    if (!confirm(`"${storeName}" 매장을 삭제하시겠습니까?`)) {
      return
    }

    setDeletingStoreId(storeId)
    try {
      const response = await fetch(
        api.stores.delete(storeId),
        {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
    if (!user) {
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
      const token = getToken()
      if (!token) {
        toast({
          variant: "destructive",
          title: "❌ 오류",
          description: "인증 토큰이 없습니다. 다시 로그인해주세요.",
        })
        return
      }

      const response = await fetch(api.stores.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
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
      {/* 헤더 - TurboTax Style */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1.5 leading-tight">
          내 매장 등록
        </h1>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          연결하고 싶은 매장을 검색하여 등록하세요
        </p>
      </div>

      {/* 등록된 매장 목록 - TurboTax Style */}
      {isLoadingStores ? (
        <Card className="mb-6 md:mb-8 rounded-card border-neutral-300 shadow-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              <p className="text-sm text-neutral-600">등록된 매장을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : registeredStores.length > 0 ? (
        <Card className="mb-6 md:mb-8 rounded-card border-neutral-300 shadow-card">
          <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-base md:text-lg font-bold text-neutral-900">등록된 매장 ({registeredStores.length}개)</span>
              <span className="text-xs font-medium text-neutral-500 hidden sm:inline">
                최대: Free 1개 / Basic 3개 / Pro 10개
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 md:px-6 pb-4 md:pb-6">
            {registeredStores.map((store) => (
              <div
                key={store.id}
                className="flex items-start justify-between gap-2 p-3 md:p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-primary-300 transition-all duration-200"
              >
                {/* 매장 정보 영역 */}
                <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                  {/* 썸네일 */}
                  {store.thumbnail ? (
                    <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                      <div className="absolute inset-0 bg-neutral-200 rounded-lg animate-pulse" />
                      <img
                        src={store.thumbnail}
                        alt={store.name}
                        className="relative w-14 h-14 md:w-16 md:h-16 object-cover rounded-lg"
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
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Store className="h-7 w-7 text-primary-500" />
                    </div>
                  )}

                  {/* 매장 정보 */}
                  <div className="flex-1 min-w-0 pr-2">
                    {/* 매장명 - 최대 2줄 */}
                    <h3 className="font-bold text-sm md:text-base text-neutral-900 leading-tight mb-1 line-clamp-2">
                      {store.name}
                    </h3>
                    {/* 카테고리와 배지 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {store.category && (
                        <p className="text-xs md:text-sm text-neutral-500 truncate">
                          {store.category}
                        </p>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        store.status === 'active' 
                          ? 'bg-success text-white' 
                          : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {store.status === 'active' ? '활성' : store.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 - 우측 정렬, 약간 아래로 */}
                <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://m.place.naver.com/place/${store.place_id}`, '_blank')}
                    className="h-9 w-9 p-0 border-neutral-300 hover:bg-neutral-50 hover:border-primary-500 active:scale-95 transition-all duration-200"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id, store.name)}
                    disabled={deletingStoreId === store.id}
                    className="h-9 w-9 p-0 shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200"
                  >
                    {deletingStoreId === store.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 md:mb-8 bg-info border-primary-200 rounded-card shadow-card">
          <CardContent className="p-4 md:p-6">
            <p className="text-center text-sm md:text-base text-primary-700">
              아직 등록된 매장이 없습니다. 아래에서 매장을 검색하여 등록해보세요!
            </p>
          </CardContent>
        </Card>
      )}

      {/* 검색 폼 - TurboTax Style */}
      <form onSubmit={handleSearch} className="mb-6 md:mb-8">
        <div className="flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="매장명을 입력하세요 (예: 스타벅스 강남점)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-12 h-12 md:h-11 text-base border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
              disabled={isSearching}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isSearching || !searchQuery.trim()}
            className="h-12 md:h-11 px-5 md:px-6 shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200 font-bold"
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

      {/* 로딩 상태 - TurboTax Style */}
      {isSearching && (
        <div className="bg-info border border-primary-200 rounded-card p-4 md:p-6 mb-4 md:mb-6 shadow-card">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 md:h-6 md:h-6 animate-spin text-primary-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm md:text-base text-primary-900">매장을 검색하고 있습니다...</p>
              <p className="text-xs md:text-sm text-primary-700 mt-1 leading-relaxed">
                네이버 지도에서 "{searchQuery}" 매장을 찾는 중입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 - TurboTax Style */}
      {error && (
        <div className="bg-error border border-error-dark rounded-card p-4 md:p-5 mb-4 md:mb-6 shadow-card">
          <p className="text-sm md:text-base text-error-dark font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* 성공 메시지 - TurboTax Style */}
      {selectedStore && !connectingPlaceId && (
        <div className="bg-success-light border border-success rounded-card p-4 md:p-6 mb-4 md:mb-6 shadow-card">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 md:h-6 md:h-6 text-success flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm md:text-base text-success-dark">
                매장이 성공적으로 등록되었습니다!
              </p>
              <p className="text-xs md:text-sm text-success-dark mt-1 leading-relaxed">
                잠시 후 대시보드로 이동합니다...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 검색 결과 - TurboTax Style */}
      {searchCompleted && searchResults.length > 0 && (
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3 md:mb-4 leading-tight">
            검색 결과 ({searchResults.length}개)
          </h2>
          <div className="grid gap-3 md:gap-4">
            {searchResults.map((store) => {
              const isAlreadyRegistered = registeredStores.some(
                (registered) => registered.place_id === store.place_id
              )
              
              return (
                <Card
                  key={store.place_id}
                  className={`rounded-card shadow-card transition-all duration-200 ${
                    isAlreadyRegistered 
                      ? 'bg-neutral-50 border-neutral-300' 
                      : 'border-neutral-300 hover:shadow-card-hover hover:border-primary-400'
                  }`}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2 md:gap-4 flex-wrap md:flex-nowrap">
                    {/* 썸네일 이미지 */}
                    {store.thumbnail ? (
                      <div className="flex-shrink-0 relative w-16 h-16 md:w-20 md:h-20">
                        <div className="absolute inset-0 bg-neutral-200 rounded-lg animate-pulse" />
                        <img
                          src={store.thumbnail}
                          alt={store.name}
                          className="relative w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg"
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
                      <div className="flex-shrink-0 bg-primary-100 p-3 rounded-lg">
                        <Store className="h-10 w-10 md:h-14 md:w-14 text-primary-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="mb-1.5 md:mb-2">
                        <h3 className="font-bold text-sm md:text-base text-neutral-900 leading-tight line-clamp-2 mb-1">{store.name}</h3>
                        {store.category && (
                          <p className="text-xs md:text-sm text-neutral-500 leading-relaxed truncate">
                            {store.category}
                          </p>
                        )}
                      </div>

                      {store.address && (
                        <div className="flex items-start gap-1.5 text-xs md:text-sm text-neutral-600 mb-1.5">
                          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 flex-shrink-0 text-neutral-400" />
                          <p className="leading-relaxed line-clamp-2">{store.address}</p>
                        </div>
                      )}

                      <p className="text-xs text-neutral-400 leading-relaxed truncate">
                        플레이스 ID: {store.place_id}
                      </p>
                    </div>

                    {isAlreadyRegistered ? (
                      <div className="flex-shrink-0 px-3 md:px-4 py-1.5 md:py-2 bg-neutral-200 text-neutral-600 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap mt-0.5">
                        등록됨
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnectStore(store)}
                        disabled={connectingPlaceId !== null || selectedStore !== null}
                        size="lg"
                        className="flex-shrink-0 h-9 md:h-10 px-4 md:px-5 shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200 font-bold whitespace-nowrap text-sm md:text-base mt-0.5"
                      >
                        {connectingPlaceId === store.place_id ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                            연결중...
                          </>
                        ) : (
                          <>
                            연결
                            <ChevronRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
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

      {/* 안내 메시지 (검색 전) - TurboTax Style */}
      {!isSearching && !searchCompleted && searchResults.length === 0 && (
        <div className="bg-neutral-50 rounded-card border border-neutral-200 p-6 md:p-8 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="h-8 w-8 md:h-10 md:w-10 text-neutral-400" />
          </div>
          <h3 className="font-bold text-base md:text-lg text-neutral-900 mb-2 leading-tight">
            매장을 검색해보세요
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            위 검색창에 매장명을 입력하면
            <br />
            네이버 지도에서 매장을 찾아드립니다
          </p>
        </div>
      )}
    </div>
  )
}
