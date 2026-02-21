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
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal"

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

  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()

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
        // 매장 등록 제한 초과 시 업그레이드 모달 표시
        if (handleLimitError(response.status, errorData.detail)) {
          return
        }
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-3 leading-tight">
          내 매장 등록
        </h1>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
          네이버 지도에서 내 매장을 검색하고<br className="md:hidden" />
          <span className="hidden md:inline"> </span>연결하여 관리를 시작하세요
        </p>
      </header>

      {/* 등록된 매장 목록 섹션 */}
      <section className="mb-8 md:mb-10">
        {isLoadingStores ? (
          <Card className="rounded-card border-neutral-300 shadow-card hover:shadow-card-hover transition-all duration-200">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary-500" />
                <p className="text-sm md:text-base text-neutral-600 font-medium">등록된 매장을 불러오는 중...</p>
              </div>
            </CardContent>
          </Card>
        ) : registeredStores.length > 0 ? (
          <Card className="rounded-card border-neutral-300 shadow-card hover:shadow-card-hover transition-all duration-200">
            <CardHeader className="pb-4 px-5 md:px-6 pt-5 md:pt-6 border-b border-neutral-200">
              <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 md:h-6 md:w-6 text-primary-500 flex-shrink-0" />
                  <span className="text-lg md:text-xl font-bold text-neutral-900">
                    등록된 매장 <span className="text-primary-500">({registeredStores.length})</span>
                  </span>
                </div>
                <span className="text-xs md:text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full">
                  Free 1개 · Basic 1개 · Basic+ 2개 · Pro 5개
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 md:p-6">
              {registeredStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-start justify-between gap-3 md:gap-4 p-4 md:p-5 bg-white border-2 border-neutral-200 rounded-xl hover:bg-neutral-50 hover:border-primary-400 hover:shadow-md transition-all duration-200 group"
                >
                  {/* 매장 정보 영역 */}
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    {/* 썸네일 */}
                    {store.thumbnail ? (
                      <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                        <div className="absolute inset-0 bg-neutral-200 rounded-xl animate-pulse" />
                        <img
                          src={store.thumbnail}
                          alt={store.name}
                          className="relative w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl ring-2 ring-neutral-200 group-hover:ring-primary-300 transition-all duration-200"
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
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-primary-200 group-hover:ring-primary-300 transition-all duration-200">
                        <Store className="h-8 w-8 md:h-10 md:w-10 text-primary-500" />
                      </div>
                    )}

                    {/* 매장 정보 */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      {/* 매장명 - 최대 2줄 */}
                      <h3 className="font-bold text-base md:text-lg text-neutral-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
                        {store.name}
                      </h3>
                      {/* 카테고리와 배지 */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {store.category && (
                          <p className="text-xs md:text-sm text-neutral-600 truncate">
                            {store.category}
                          </p>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                          store.status === 'active' 
                            ? 'bg-success text-white shadow-sm' 
                            : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {store.status === 'active' ? '✓ 활성' : store.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 - 우측 정렬 */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://m.place.naver.com/place/${store.place_id}`, '_blank')}
                      className="h-10 w-10 md:h-11 md:w-11 p-0 border-2 border-neutral-300 hover:bg-primary-50 hover:border-primary-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                      title="네이버 지도에서 보기"
                    >
                      <ExternalLink className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStore(store.id, store.name)}
                      disabled={deletingStoreId === store.id}
                      className="h-10 w-10 md:h-11 md:w-11 p-0 shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200 touch-target-minimum"
                      title="매장 삭제"
                    >
                      {deletingStoreId === store.id ? (
                        <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-card bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200 shadow-card hover:shadow-card-hover transition-all duration-200">
            <CardContent className="p-6 md:p-8 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Store className="h-8 w-8 md:h-10 md:w-10 text-primary-500" />
              </div>
              <p className="text-sm md:text-base text-primary-800 font-medium leading-relaxed">
                아직 등록된 매장이 없습니다.<br />
                아래에서 매장을 검색하여 등록해보세요! 🎯
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 검색 폼 섹션 */}
      <section className="mb-8 md:mb-10">
        <div className="mb-4 md:mb-5">
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
            매장 검색하기
          </h2>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            네이버 지도에 등록된 매장명을 정확히 입력해주세요
          </p>
        </div>
        
        <form onSubmit={handleSearch}>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5 md:h-6 md:w-6 pointer-events-none" />
              <Input
                type="text"
                placeholder="매장명을 입력하세요 (예: 스타벅스 강남점)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 md:pl-14 pr-4 h-14 md:h-16 text-base md:text-lg border-2 border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 font-medium placeholder:text-neutral-400 placeholder:font-normal"
                disabled={isSearching}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSearching || !searchQuery.trim()}
              className="h-14 md:h-16 px-8 md:px-10 text-base md:text-lg rounded-xl shadow-button hover:shadow-button-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold whitespace-nowrap touch-target-minimum"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-6 md:w-6 animate-spin" />
                  검색중...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  검색하기
                </>
              )}
            </Button>
          </div>
        </form>
        
        {/* 검색 팁 */}
        <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            💡 <span className="font-semibold">검색 팁:</span> 매장명이 정확하지 않으면 검색 결과가 나오지 않을 수 있습니다. 
            네이버 지도에서 확인한 정확한 매장명을 입력해주세요.
          </p>
        </div>
      </section>

      {/* 상태 메시지 섹션 */}
      <section className="mb-6 md:mb-8">
        {/* 로딩 상태 */}
        {isSearching && (
          <div className="bg-gradient-to-r from-blue-50 to-primary-50 border-2 border-primary-300 rounded-xl p-5 md:p-6 shadow-md animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 className="h-6 w-6 md:h-7 md:w-7 animate-spin text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base md:text-lg text-primary-900 mb-1 leading-tight">
                  매장을 검색하고 있습니다...
                </p>
                <p className="text-sm md:text-base text-primary-700 leading-relaxed">
                  네이버 지도에서 <span className="font-semibold">"{searchQuery}"</span> 매장을 찾는 중입니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5 md:p-6 shadow-md animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-error rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl md:text-3xl">❌</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="font-bold text-base md:text-lg text-red-900 mb-1 leading-tight">
                  검색 중 오류가 발생했습니다
                </p>
                <p className="text-sm md:text-base text-red-700 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 성공 메시지 */}
        {selectedStore && !connectingPlaceId && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-success rounded-xl p-5 md:p-6 shadow-md animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-success rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base md:text-lg text-green-900 mb-1 leading-tight">
                  매장이 성공적으로 등록되었습니다! 🎉
                </p>
                <p className="text-sm md:text-base text-green-700 leading-relaxed">
                  <span className="font-semibold">"{selectedStore.name}"</span>이(가) 추가되었습니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 검색 결과 섹션 */}
      {searchCompleted && searchResults.length > 0 && (
        <section className="mb-8 md:mb-10">
          <div className="mb-5 md:mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                검색 결과
              </h2>
              <span className="text-sm md:text-base font-semibold text-primary-600 bg-primary-100 px-4 py-1.5 rounded-full">
                {searchResults.length}개 매장 발견
              </span>
            </div>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              아래 매장 중 연결하고 싶은 매장을 선택하세요
            </p>
          </div>

          <div className="grid gap-4 md:gap-5">
            {searchResults.map((store) => {
              const isAlreadyRegistered = registeredStores.some(
                (registered) => registered.place_id === store.place_id
              )
              
              return (
                <Card
                  key={store.place_id}
                  className={`rounded-xl shadow-md transition-all duration-200 ${
                    isAlreadyRegistered 
                      ? 'bg-neutral-50 border-2 border-neutral-300 opacity-70' 
                      : 'border-2 border-neutral-300 hover:shadow-xl hover:border-primary-500 hover:scale-[1.01]'
                  }`}
                >
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3 md:gap-5 flex-wrap md:flex-nowrap">
                      {/* 썸네일 이미지 */}
                      {store.thumbnail ? (
                        <div className="flex-shrink-0 relative w-20 h-20 md:w-24 md:h-24">
                          <div className="absolute inset-0 bg-neutral-200 rounded-xl animate-pulse" />
                          <img
                            src={store.thumbnail}
                            alt={store.name}
                            className="relative w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl ring-2 ring-neutral-200"
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
                        <div className="flex-shrink-0 bg-primary-100 p-4 rounded-xl ring-2 ring-primary-200">
                          <Store className="h-12 w-12 md:h-16 md:w-16 text-primary-500" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 pt-1">
                        <div className="mb-3">
                          <h3 className="font-bold text-base md:text-lg text-neutral-900 leading-snug line-clamp-2 mb-2">
                            {store.name}
                          </h3>
                          {store.category && (
                            <span className="inline-block text-xs md:text-sm text-primary-700 bg-primary-100 px-3 py-1 rounded-full font-medium">
                              {store.category}
                            </span>
                          )}
                        </div>

                        {store.address && (
                          <div className="flex items-start gap-2 text-sm md:text-base text-neutral-600">
                            <MapPin className="h-4 w-4 md:h-5 md:w-5 mt-0.5 flex-shrink-0 text-neutral-400" />
                            <p className="leading-relaxed line-clamp-2">{store.address}</p>
                          </div>
                        )}
                      </div>

                      {isAlreadyRegistered ? (
                        <div className="flex-shrink-0 flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-neutral-200 text-neutral-700 rounded-xl font-bold text-sm md:text-base whitespace-nowrap">
                          <CheckCircle2 className="h-5 w-5" />
                          등록 완료
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleConnectStore(store)}
                          disabled={connectingPlaceId !== null || selectedStore !== null}
                          size="lg"
                          className="flex-shrink-0 h-12 md:h-14 px-6 md:px-8 rounded-xl shadow-button hover:shadow-button-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold whitespace-nowrap text-sm md:text-base touch-target-minimum"
                        >
                          {connectingPlaceId === store.place_id ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              연결중...
                            </>
                          ) : (
                            <>
                              연결하기
                              <ChevronRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* 안내 메시지 섹션 (검색 전) */}
      {!isSearching && !searchCompleted && searchResults.length === 0 && (
        <section className="mb-8 md:mb-10">
          <Card className="rounded-xl border-2 border-dashed border-neutral-300 bg-gradient-to-br from-neutral-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="relative mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary-100 to-blue-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Search className="h-10 w-10 md:h-12 md:w-12 text-primary-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-lg">✨</span>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl md:text-2xl text-neutral-900 mb-3 leading-tight">
                  매장을 검색해보세요
                </h3>
                
                <p className="text-sm md:text-base text-neutral-600 leading-relaxed mb-6">
                  위 검색창에 매장명을 입력하면<br />
                  네이버 지도에서 매장을 찾아드립니다
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center text-xs md:text-sm text-neutral-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span>정확한 매장명 입력</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>빠른 검색 결과</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <span>간편한 연결</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
    </div>
  )
}
