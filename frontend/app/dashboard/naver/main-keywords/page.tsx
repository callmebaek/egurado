"use client"

/**
 * 대표키워드 분석 페이지
 * 검색 키워드 입력 시 상위 15개 매장의 대표 키워드를 분석하여 표시
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { Search, TrendingUp, Star, ChevronRight } from 'lucide-react'
import { api } from '@/lib/config'
import { notifyCreditUsed } from '@/lib/credit-utils'
import { useCreditConfirm } from '@/lib/hooks/useCreditConfirm'
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal'

interface StoreKeywordInfo {
  rank: number
  place_id: string
  name: string
  category: string
  address: string
  thumbnail?: string
  rating?: number
  review_count: string
  keywords: string[]
}

interface AnalysisResult {
  status: string
  query: string
  total_stores: number
  stores_analyzed: StoreKeywordInfo[]
}

export default function MainKeywordsAnalysisPage() {
  const { toast } = useToast()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()
  
  // URL 파라미터에서 query가 있으면 자동으로 분석 시작
  useEffect(() => {
    const queryFromUrl = searchParams.get('query')
    if (queryFromUrl && queryFromUrl.trim()) {
      const trimmedQuery = queryFromUrl.trim()
      setSearchQuery(trimmedQuery)
      
      // 자동 분석 실행
      const autoAnalyze = async () => {
        // 🆕 캐시 확인 (2분 = 120000ms 이내)
        const cacheKey = `main_keywords_cache_${trimmedQuery.toLowerCase()}`
        const CACHE_DURATION = 120000 // 2분
        let cachedData: AnalysisResult | null = null
        
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsedCache = JSON.parse(cached)
            const age = Date.now() - parsedCache.timestamp
            if (age < CACHE_DURATION && parsedCache.query === trimmedQuery) {
              cachedData = parsedCache.data
              console.log('[대표키워드] ✅ 캐시 데이터 사용 (중복 API 호출 방지):', Math.round(age / 1000), '초 전')
            } else {
              console.log('[대표키워드] ⏰ 캐시 만료:', Math.round(age / 1000), '초 전')
              localStorage.removeItem(cacheKey)
            }
          }
        } catch (err) {
          console.warn('[대표키워드] 캐시 읽기 실패:', err)
        }

        // 캐시가 있으면 API 호출 스킵
        if (cachedData) {
          setResult(cachedData)
          toast({
            title: "분석 완료 (캐시)",
            description: `${cachedData.stores_analyzed.length}개 매장의 대표 키워드를 불러왔습니다.`,
          })
          return
        }

        // 캐시가 없으면 API 호출
        console.log('[대표키워드] 📡 API 호출 (캐시 없음)')
        setLoading(true)
        
        try {
          const token = await getToken()
          const response = await fetch(api.naver.analyzeMainKeywords(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              query: trimmedQuery
            })
          })
          
          if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            // 403/402 에러 → 업그레이드 모달 표시
            if (handleLimitError(response.status, error.detail)) return
            throw new Error(error.detail || "분석에 실패했습니다")
          }
          
          const data: AnalysisResult = await response.json()
          setResult(data)

          // ✨ 크레딧 실시간 차감 알림 (대표 키워드 분석 10 크레딧)
          notifyCreditUsed(10, token)
          
          // 🆕 캐시에 저장
          try {
            const cacheData = {
              data: data,
              timestamp: Date.now(),
              query: trimmedQuery
            }
            localStorage.setItem(cacheKey, JSON.stringify(cacheData))
            console.log('[대표키워드] 💾 캐시 저장 완료')
          } catch (err) {
            console.warn('[대표키워드] 캐시 저장 실패:', err)
          }
          
          toast({
            title: "분석 완료",
            description: `${data.stores_analyzed.length}개 매장의 대표 키워드를 분석했습니다.`,
          })
          
        } catch (error) {
          console.error("분석 오류:", error)
          toast({
            title: "분석 실패",
            description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }
      
      // 약간의 딜레이 후 실행
      setTimeout(() => {
        autoAnalyze()
      }, 100)
    }
  }, [searchParams, toast])
  
  const handleAnalyzeWithQuery = (query: string) => {
    if (!query.trim()) {
      toast({
        title: "검색 키워드 입력",
        description: "분석할 검색 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    showCreditConfirm({
      featureName: "대표 키워드 분석",
      creditAmount: 10,
      onConfirm: () => executeAnalyzeWithQuery(query),
    })
  }

  const executeAnalyzeWithQuery = async (query: string) => {
    setLoading(true)
    
    try {
      const token = await getToken()
      const response = await fetch(api.naver.analyzeMainKeywords(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: query.trim()
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        // 403/402 에러 → 업그레이드 모달 표시
        if (handleLimitError(response.status, error.detail)) return
        throw new Error(error.detail || "분석에 실패했습니다")
      }
      
      const data: AnalysisResult = await response.json()
      setResult(data)

      // ✨ 크레딧 실시간 차감 알림 (대표 키워드 분석 10 크레딧)
      notifyCreditUsed(10, token)
      
      toast({
        title: "분석 완료",
        description: `${data.stores_analyzed.length}개 매장의 대표 키워드를 분석했습니다.`,
      })
      
    } catch (error) {
      console.error("분석 오류:", error)
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleAnalyze = async () => {
    await handleAnalyzeWithQuery(searchQuery)
  }
  
  const isKeywordHighlighted = (keyword: string): boolean => {
    if (!searchQuery || !keyword) return false
    
    const searchLower = searchQuery.toLowerCase().replace(/\s+/g, '')
    const keywordLower = keyword.toLowerCase().replace(/\s+/g, '')
    
    // 1. 완전 일치
    if (searchLower === keywordLower) return true
    
    // 2. 대표 키워드가 검색어에 포함 (예: "취업사진" in "성수취업사진")
    if (searchLower.includes(keywordLower) && keywordLower.length >= 2) return true
    
    // 3. 검색어가 대표 키워드에 포함 (예: "성수" in "성수카페")
    if (keywordLower.includes(searchLower) && searchLower.length >= 2) return true
    
    // 4. 검색어의 2글자 이상 부분 문자열이 대표 키워드와 매칭
    // 예: "성수취업사진" → ["성수", "수취", "취업", "업사", "사진", "취업사진" ...] 중 매칭
    const minMatchLength = 2
    
    for (let len = minMatchLength; len <= searchLower.length; len++) {
      for (let i = 0; i <= searchLower.length - len; i++) {
        const substring = searchLower.substring(i, i + len)
        
        // 부분 문자열이 대표 키워드에 포함되는지 확인
        if (keywordLower.includes(substring)) {
          return true
        }
        
        // 대표 키워드가 부분 문자열에 포함되는지 확인 (짧은 키워드 처리)
        if (substring.includes(keywordLower) && keywordLower.length >= minMatchLength) {
          return true
        }
      }
    }
    
    return false
  }
  
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-lime-500 rounded-xl flex items-center justify-center shadow-lg">
            <Star className="w-6 h-6 md:w-7 md:h-7 text-white fill-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            대표키워드 분석
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
          검색 키워드를 입력하면 상위 15개 매장의 <br className="md:hidden" />
          <span className="hidden md:inline"> </span>대표 키워드를 한눈에 분석합니다
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-full inline-flex mx-auto border border-green-200">
          <span className="font-semibold">💡 10 크레딧</span>
          <span className="text-neutral-500">·</span>
          <span>2분간 캐시 저장</span>
        </div>
      </header>

      <div className="space-y-8 md:space-y-10">
      
      {/* 검색 입력 섹션 */}
      <section>
        <div className="mb-4 md:mb-5">
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
            검색 키워드 입력
          </h2>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            분석하고 싶은 검색 키워드를 입력하세요 (예: 혜화맛집, 성수카페)
          </p>
        </div>
        
        <Card className="rounded-xl border-2 border-neutral-300 shadow-md hover:shadow-lg transition-all duration-200">
          <div className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5 md:h-6 md:w-6 pointer-events-none" />
                <Input
                  placeholder="예: 혜화맛집, 성수카페, 강남헤어샵"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && searchQuery.trim()) {
                      handleAnalyze()
                    }
                  }}
                  className="pl-12 md:pl-14 pr-4 h-14 md:h-16 text-base md:text-lg border-2 border-neutral-300 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all duration-200 font-medium placeholder:text-neutral-400 placeholder:font-normal"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={loading || !searchQuery.trim()}
                className="h-14 md:h-16 px-8 md:px-10 text-base md:text-lg rounded-xl shadow-button hover:shadow-button-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold whitespace-nowrap w-full sm:w-auto touch-target-minimum"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-2 border-white border-t-transparent mr-2"></div>
                    분석 중...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 md:w-6 md:w-6 mr-2" />
                    분석하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
        
        {/* 안내 정보 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold text-green-900 mb-0.5">상위 15개 매장</p>
              <p className="text-xs text-green-700">검색 결과 분석</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-lime-50 border border-lime-200 rounded-lg">
            <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">2</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold text-lime-900 mb-0.5">대표 키워드</p>
              <p className="text-xs text-lime-700">최대 5개 추출</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">3</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-semibold text-emerald-900 mb-0.5">일치 키워드 강조</p>
              <p className="text-xs text-emerald-700">검색어 하이라이트</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* 분석 결과 섹션 */}
      {result && result.stores_analyzed.length > 0 && (
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            {/* 결과 헤더 */}
            <div className="bg-gradient-to-r from-green-50 to-lime-50 border-b-2 border-green-200 p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                      분석 결과
                    </h2>
                    <p className="text-sm text-green-700 mt-0.5">
                      총 {result.stores_analyzed.length}개 매장 분석 완료
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border-2 border-green-200 shadow-sm">
                  <Search className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm md:text-base font-bold text-neutral-900">"{result.query}"</span>
                </div>
              </div>
            </div>
            
            {/* 테이블 컨테이너 - 모바일 스크롤 힌트 */}
            <div className="relative">
              {/* 모바일 우측 스크롤 힌트 그라데이션 */}
              <div className="md:hidden absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 flex items-center justify-end pr-2">
                <div className="animate-pulse">
                  <ChevronRight className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-green-50 border-b-2 border-green-200">
                    <th className="text-left py-4 px-4 md:px-5 font-bold text-sm md:text-base text-green-900">
                      순위
                    </th>
                    <th className="text-left py-4 px-4 md:px-5 font-bold text-sm md:text-base text-green-900 min-w-[250px]">
                      매장 정보
                    </th>
                    <th className="text-left py-4 px-4 md:px-5 font-bold text-sm md:text-base text-green-900 min-w-[100px]">
                      카테고리
                    </th>
                    <th className="text-left py-4 px-4 md:px-5 font-bold text-sm md:text-base text-green-900 min-w-[90px]">
                      평점/리뷰
                    </th>
                    <th className="text-left py-4 px-4 md:px-5 font-bold text-sm md:text-base text-green-900 min-w-[300px]">
                      대표 키워드 (최대 5개)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.stores_analyzed.map((store, index) => (
                    <tr 
                      key={store.place_id}
                      className={`border-b border-neutral-200 hover:bg-lime-50/40 transition-all duration-200 ${
                        index < 3 ? 'bg-lime-50/30' : ''
                      }`}
                    >
                      {/* 순위 */}
                      <td className="py-5 px-4 md:px-5">
                        <div className={`flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl font-extrabold text-xl md:text-2xl ${
                          store.rank === 1 
                            ? 'bg-yellow-400 text-yellow-900' 
                            : store.rank === 2
                            ? 'bg-gray-300 text-gray-800'
                            : store.rank === 3
                            ? 'bg-orange-300 text-orange-900'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {store.rank === 1 && '🥇'}
                          {store.rank === 2 && '🥈'}
                          {store.rank === 3 && '🥉'}
                          {store.rank > 3 && store.rank}
                        </div>
                      </td>
                      
                      {/* 매장 정보 */}
                      <td className="py-5 px-4 md:px-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          {store.thumbnail ? (
                            <img 
                              src={store.thumbnail} 
                              alt={store.name}
                              className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover ring-2 ring-neutral-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-neutral-200 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Search className="w-6 h-6 md:w-8 md:h-8 text-neutral-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm md:text-base text-neutral-900 leading-tight mb-1">
                              {store.name}
                            </div>
                            <div className="text-xs md:text-sm text-neutral-500 leading-relaxed line-clamp-1">
                              {store.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* 카테고리 */}
                      <td className="py-5 px-4 md:px-5">
                        <span className="inline-block px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs md:text-sm font-medium max-w-[120px] truncate" title={store.category}>
                          {store.category}
                        </span>
                      </td>
                      
                      {/* 평점/리뷰 */}
                      <td className="py-5 px-4 md:px-5">
                        <div className="text-sm md:text-base">
                          {store.rating && store.rating > 0 ? (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                              <span className="font-bold text-neutral-900">{store.rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-400 mb-1.5">평점 없음</div>
                          )}
                          <div className="text-xs md:text-sm text-neutral-600">
                            리뷰 <span className="font-semibold">{parseInt(store.review_count || "0").toLocaleString()}</span>개
                          </div>
                        </div>
                      </td>
                      
                      {/* 대표 키워드 */}
                      <td className="py-5 px-4 md:px-5">
                        <div className="flex flex-wrap gap-2">
                          {store.keywords && store.keywords.length > 0 ? (
                            store.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                                  isKeywordHighlighted(keyword)
                                    ? 'bg-green-500 text-white shadow-md ring-2 ring-green-300'
                                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                }`}
                              >
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-neutral-400 italic">
                              키워드 없음
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            </div>
            </div>
            
            {/* 범례 */}
            <div className="bg-green-50 border-t-2 border-green-200 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                <div className="font-semibold text-sm md:text-base text-green-900">
                  💡 범례:
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs md:text-sm font-semibold shadow-sm">
                      예시
                    </span>
                    <span className="text-xs md:text-sm text-neutral-600">검색어 일치</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-xs md:text-sm font-semibold">
                      예시
                    </span>
                    <span className="text-xs md:text-sm text-neutral-600">일반 키워드</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-8 h-8 bg-lime-50 border-2 border-lime-200 rounded"></span>
                    <span className="text-xs md:text-sm text-neutral-600">상위 3위 강조</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}
      
      {/* 결과 없음 섹션 */}
      {result && result.stores_analyzed.length === 0 && (
        <section>
          <Card className="rounded-xl border-2 border-dashed border-green-300 bg-gradient-to-br from-green-50 to-lime-50 shadow-sm">
            <div className="p-10 md:p-14 text-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <Search className="w-10 h-10 md:w-12 md:h-12 text-green-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3 leading-tight">
                검색 결과가 없습니다
              </h3>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                다른 키워드로 다시 검색해보세요.<br />
                더 구체적인 검색어를 사용하면 정확한 결과를 얻을 수 있습니다.
              </p>
            </div>
          </Card>
        </section>
      )}
      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
      </div>
    </div>
  )
}
