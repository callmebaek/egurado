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
import { Search, TrendingUp, Star } from 'lucide-react'
import { api } from '@/lib/config'

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
            const error = await response.json()
            throw new Error(error.detail || "분석에 실패했습니다")
          }
          
          const data: AnalysisResult = await response.json()
          setResult(data)
          
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
  
  const handleAnalyzeWithQuery = async (query: string) => {
    if (!query.trim()) {
      toast({
        title: "검색 키워드 입력",
        description: "분석할 검색 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
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
        const error = await response.json()
        throw new Error(error.detail || "분석에 실패했습니다")
      }
      
      const data: AnalysisResult = await response.json()
      setResult(data)
      
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
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-olive-900 flex items-center gap-3">
          <Star className="w-8 h-8 text-primary" />
          대표키워드 분석
        </h1>
        <p className="text-muted-foreground mt-2">
          검색 키워드를 입력하면 상위 15개 매장의 대표 키워드를 분석합니다.
        </p>
      </div>
      
      {/* 검색 입력 */}
      <Card className="p-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="분석할 검색 키워드를 입력하세요 (예: 혜화맛집, 성수카페)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAnalyze()
                }
              }}
              className="text-base"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={loading || !searchQuery.trim()}
            size="lg"
            className="px-8"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                분석 중...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                분석하기
              </>
            )}
          </Button>
        </div>
      </Card>
      
      {/* 분석 결과 */}
      {result && result.stores_analyzed.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              분석 결과
            </h2>
            <div className="text-sm text-muted-foreground">
              검색 키워드: <span className="font-semibold text-foreground">"{result.query}"</span>
              {' '}| 총 {result.stores_analyzed.length}개 매장
            </div>
          </div>
          
          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-olive-800 bg-olive-50/50">
                    순위
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-olive-800 bg-olive-50/50">
                    매장명
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-olive-800 bg-olive-50/50">
                    카테고리
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-olive-800 bg-olive-50/50">
                    평점/리뷰
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-olive-800 bg-olive-50/50 min-w-[300px]">
                    대표 키워드 (최대 5개)
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.stores_analyzed.map((store) => (
                  <tr 
                    key={store.place_id}
                    className="border-b border-gray-200 hover:bg-olive-50/30 transition-colors"
                  >
                    {/* 순위 */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {store.rank}
                      </div>
                    </td>
                    
                    {/* 매장명 */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {store.thumbnail && (
                          <img 
                            src={store.thumbnail} 
                            alt={store.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="font-semibold text-olive-900">
                            {store.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {store.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* 카테고리 */}
                    <td className="py-4 px-4">
                      <div className="text-sm text-muted-foreground">
                        {store.category}
                      </div>
                    </td>
                    
                    {/* 평점/리뷰 */}
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {store.rating && store.rating > 0 ? (
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{store.rating.toFixed(1)}</span>
                          </div>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          리뷰 {parseInt(store.review_count || "0").toLocaleString()}개
                        </div>
                      </div>
                    </td>
                    
                    {/* 대표 키워드 */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-2">
                        {store.keywords && store.keywords.length > 0 ? (
                          store.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                isKeywordHighlighted(keyword)
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
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
          
          {/* 범례 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  예시
                </span>
                <span>검색 키워드와 일치하는 키워드</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  예시
                </span>
                <span>일반 키워드</span>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* 결과 없음 */}
      {result && result.stores_analyzed.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">검색 결과가 없습니다.</p>
            <p className="text-sm mt-2">다른 키워드로 검색해보세요.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
