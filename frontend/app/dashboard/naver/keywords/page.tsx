"use client"

// Force rebuild: 2026-01-30 16:00 KST
import { useState, useEffect, useCallback } from "react"
import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { KeywordCombinator } from "@/components/KeywordCombinator"
import { Loader2, Search, Sparkles, Trash2, TrendingUp, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal"

interface SearchVolumeData {
  id: string
  keyword: string
  monthly_pc_qc_cnt: number | string
  monthly_mobile_qc_cnt: number | string
  monthly_ave_pc_clk_cnt: number
  monthly_ave_mobile_clk_cnt: number
  monthly_ave_pc_ctr: number
  monthly_ave_mobile_ctr: number
  comp_idx: string
  created_at: string
}

export default function NaverKeywordsPage() {
  const { hasStores, isLoading, userId } = useStores()
  const { getToken } = useAuth()
  const { toast } = useToast()
  
  const [keywordInput, setKeywordInput] = useState("")
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()
  const [isSearching, setIsSearching] = useState(false)
  const [isCombinatorOpen, setIsCombinatorOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchVolumeData[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [currentResults, setCurrentResults] = useState<SearchVolumeData[]>([])
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set())

  // 검색 이력 불러오기
  const loadSearchHistory = useCallback(async () => {
    if (!userId) return
    
    try {
      setIsLoadingHistory(true)
      const response = await fetch(
        `${api.baseUrl}/api/v1/keyword-search-volume/search-volume/history/${userId}?limit=100`
      )
      
      if (!response.ok) throw new Error("검색 이력 불러오기 실패")
      
      const data = await response.json()
      setSearchHistory(data.data || [])
    } catch (error) {
      console.error("검색 이력 불러오기 실패:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [userId])

  useEffect(() => {
    if (hasStores && userId) {
      loadSearchHistory()
    }
  }, [hasStores, userId, loadSearchHistory])

  // 키워드 검색
  const handleSearch = (keywords?: string[]) => {
    if (!userId) {
      toast({
        title: "오류",
        description: "사용자 정보를 불러올 수 없습니다.",
        variant: "destructive",
      })
      return
    }

    const keywordsToSearch = keywords || keywordInput.split(",").map(k => k.trim()).filter(k => k)
    
    if (keywordsToSearch.length === 0) {
      toast({
        title: "오류",
        description: "최소 1개 이상의 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    // 100개 제한 확인
    if (searchHistory.length >= 100) {
      toast({
        title: "검색 이력 한도 초과",
        description: "검색 이력이 100개를 초과했습니다. 일부 이력을 삭제한 후 다시 시도해주세요.",
        variant: "destructive",
      })
      return
    }

    // 추가될 키워드 수를 고려한 검증
    if (searchHistory.length + keywordsToSearch.length > 100) {
      toast({
        title: "검색 이력 한도 초과 예상",
        description: `현재 ${searchHistory.length}개의 이력이 있습니다. ${keywordsToSearch.length}개를 추가하면 100개를 초과합니다. 일부 이력을 삭제해주세요.`,
        variant: "destructive",
      })
      return
    }

    const estimatedCredits = keywordsToSearch.length * 2
    showCreditConfirm({
      featureName: "키워드 검색량 조회",
      creditAmount: estimatedCredits,
      creditDetail: `${keywordsToSearch.length}개 키워드 × 2 크레딧`,
      onConfirm: () => executeSearch(keywordsToSearch),
    })
  }

  const executeSearch = async (keywordsToSearch: string[]) => {
    setIsSearching(true)
    try {
      const token = await getToken()
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsSearching(false)
        return
      }
      
      // 🆕 크레딧 사전 체크 (검색 전) - 백엔드와 동일: 키워드 수 × 2
      const requiredCredits = keywordsToSearch.length * 2
      try {
        const creditsResponse = await fetch(`${api.baseUrl}/api/v1/credits/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json()
          const currentCredits = creditsData.total_remaining || 0
          
          if (currentCredits < requiredCredits) {
            toast({
              title: "크레딧 부족",
              description: `크레딧이 부족합니다. (필요: ${requiredCredits} 크레딧, 보유: ${currentCredits} 크레딧)`,
              variant: "destructive",
            })
            setIsSearching(false)
            return
          }
        }
      } catch (error) {
        console.error('크레딧 체크 오류:', error)
        // 크레딧 체크 실패 시에도 계속 진행 (기존 동작 유지)
      }
      
      // 🆕 키워드를 5개씩 분할 (API 제한)
      const chunkSize = 5
      const chunks: string[][] = []
      for (let i = 0; i < keywordsToSearch.length; i += chunkSize) {
        chunks.push(keywordsToSearch.slice(i, i + chunkSize))
      }

      console.log(`[키워드 검색] ${keywordsToSearch.length}개 키워드를 ${chunks.length}개 그룹으로 분할`)

      // 🆕 각 chunk를 순차적으로 처리
      const allResults: any[] = []
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`[키워드 검색] ${i + 1}/${chunks.length} 그룹 처리 중... (${chunk.length}개)`)

        try {
          const response = await fetch(
            `${api.baseUrl}/api/v1/keyword-search-volume/search-volume`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                keywords: chunk,
              }),
            }
          )

          if (!response.ok) {
            // 403 에러 (Tier 제한) → 업그레이드 모달 표시
            if (response.status === 403) {
              const errorData = await response.json().catch(() => ({}))
              if (handleLimitError(response.status, errorData.detail)) {
                setIsSearching(false)
                return
              }
            }
            // 402 에러 (크레딧 부족)를 명시적으로 처리
            if (response.status === 402) {
              const errorData = await response.json().catch(() => ({}))
              toast({
                title: "크레딧 부족",
                description: errorData.detail || "크레딧이 부족합니다.",
                variant: "destructive",
              })
              setIsSearching(false)
              return // 전체 검색 중단
            }
            
            console.warn(`[키워드 검색] ${i + 1}/${chunks.length} 그룹 실패`)
            failCount++
            continue
          }

          const result = await response.json()
          allResults.push(result)
          successCount++
          console.log(`[키워드 검색] ${i + 1}/${chunks.length} 그룹 성공`)
        } catch (error) {
          console.error(`[키워드 검색] ${i + 1}/${chunks.length} 그룹 오류:`, error)
          failCount++
        }
      }

      // 🆕 모든 결과 합치기
      const result = {
        data: { keywordList: [] },
        saved_history: []
      }

      allResults.forEach(r => {
        if (r.data?.keywordList) {
          result.data.keywordList.push(...r.data.keywordList)
        }
        if (r.saved_history) {
          result.saved_history.push(...r.saved_history)
        }
      })
      
      // API 응답에서 키워드 데이터 추출 및 변환
      const keywordList = result.data?.keywordList || []
      const displayResults: SearchVolumeData[] = []
      
      // saved_history가 있으면 우선 사용
      if (result.saved_history && result.saved_history.length > 0) {
        displayResults.push(...result.saved_history)
      } 
      // saved_history가 없어도 keywordList가 있으면 임시로 표시
      else if (keywordList.length > 0) {
        keywordList.forEach((item: any, index: number) => {
          displayResults.push({
            id: `temp-${Date.now()}-${index}`,
            keyword: item.relKeyword,
            monthly_pc_qc_cnt: typeof item.monthlyPcQcCnt === 'string' && item.monthlyPcQcCnt.includes('<') ? 5 : item.monthlyPcQcCnt,
            monthly_mobile_qc_cnt: typeof item.monthlyMobileQcCnt === 'string' && item.monthlyMobileQcCnt.includes('<') ? 5 : item.monthlyMobileQcCnt,
            monthly_ave_pc_clk_cnt: item.monthlyAvePcClkCnt || 0,
            monthly_ave_mobile_clk_cnt: item.monthlyAveMobileClkCnt || 0,
            monthly_ave_pc_ctr: item.monthlyAvePcCtr || 0,
            monthly_ave_mobile_ctr: item.monthlyAveMobileCtr || 0,
            comp_idx: item.compIdx || '-',
            created_at: new Date().toISOString(),
          })
        })
      }
      
      // 🆕 결과 메시지
      if (successCount > 0) {
        toast({
          title: "검색 완료",
          description: failCount > 0 
            ? `${displayResults.length}개 키워드 조회 완료 (${successCount}/${successCount + failCount} 그룹 성공)`
            : `${displayResults.length}개 키워드의 검색량을 조회했습니다.`,
        })

        // ✨ 크레딧 실시간 차감 알림 (키워드 수 × 2 크레딧 - 백엔드와 동일)
        const creditsUsed = keywordsToSearch.length * 2
        notifyCreditUsed(creditsUsed, token)
      } else {
        throw new Error("모든 검색이 실패했습니다")
      }

      // 검색 결과 표시
      setCurrentResults(displayResults)
      
      // 검색 이력 새로고침
      loadSearchHistory()
      
      // 입력창 초기화
      setKeywordInput("")
    } catch (error) {
      console.error("검색 실패:", error)
      toast({
        title: "검색 실패",
        description: "키워드 검색량 조회에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // 검색 이력 삭제
  const handleDeleteHistory = async (historyId: string) => {
    if (!userId) return

    try {
      const response = await fetch(
        `${api.baseUrl}/api/v1/keyword-search-volume/search-volume/history`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            history_id: historyId,
          }),
        }
      )

      if (!response.ok) throw new Error("삭제 실패")

      toast({
        title: "삭제 완료",
        description: "검색 이력이 삭제되었습니다.",
      })

      // 검색 이력 새로고침
      loadSearchHistory()
    } catch (error) {
      console.error("삭제 실패:", error)
      toast({
        title: "삭제 실패",
        description: "검색 이력 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 선택한 이력 일괄 삭제
  const handleDeleteSelected = async () => {
    if (!userId || selectedHistoryIds.size === 0) return

    if (!confirm(`선택한 ${selectedHistoryIds.size}개의 이력을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedHistoryIds).map(historyId =>
        fetch(`${api.baseUrl}/api/v1/keyword-search-volume/search-volume/history`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            history_id: historyId,
          }),
        })
      )

      await Promise.all(deletePromises)

      toast({
        title: "일괄 삭제 완료",
        description: `${selectedHistoryIds.size}개의 검색 이력이 삭제되었습니다.`,
      })

      setSelectedHistoryIds(new Set())
      loadSearchHistory()
    } catch (error) {
      console.error("일괄 삭제 실패:", error)
      toast({
        title: "일괄 삭제 실패",
        description: "일부 이력 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 전체 선택/해제
  const handleToggleSelectAll = () => {
    if (selectedHistoryIds.size === searchHistory.length) {
      setSelectedHistoryIds(new Set())
    } else {
      setSelectedHistoryIds(new Set(searchHistory.map(item => item.id)))
    }
  }

  // 개별 선택/해제
  const handleToggleSelect = (historyId: string) => {
    const newSelected = new Set(selectedHistoryIds)
    if (newSelected.has(historyId)) {
      newSelected.delete(historyId)
    } else {
      newSelected.add(historyId)
    }
    setSelectedHistoryIds(newSelected)
  }

  // 키워드 조합기에서 선택한 키워드로 검색
  const handleApplyCombinations = (keywords: string[]) => {
    handleSearch(keywords)
  }

  // 숫자 포맷팅 (< 10 같은 문자열도 처리)
  const formatNumber = (num: number | string | null | undefined) => {
    if (num === null || num === undefined) return "-"
    if (typeof num === 'string') {
      if (num.includes('<')) return num
      return num
    }
    return num.toLocaleString()
  }

  // 총 검색량 계산
  const getTotalSearchVolume = (pcCount: number | string | null | undefined, mobileCount: number | string | null | undefined) => {
    const pc = typeof pcCount === 'string' ? 0 : (pcCount || 0)
    const mobile = typeof mobileCount === 'string' ? 0 : (mobileCount || 0)
    return pc + mobile
  }

  // 경쟁도 표시
  const getCompIdxBadge = (compIdx: string) => {
    const colors: Record<string, string> = {
      "낮음": "bg-success/10 text-success border border-success/20",
      "중간": "bg-warning/10 text-warning border border-warning/20",
      "높음": "bg-error/10 text-error border border-error/20",
    }
    return (
      <span 
        className={`px-1 py-0.5 rounded text-[10px] md:text-xs font-semibold leading-none flex-shrink-0 w-fit ${colors[compIdx] || "bg-neutral-100 text-neutral-600 border border-neutral-200"}`}
        style={{ display: 'inline-block', width: 'fit-content', maxWidth: 'fit-content' }}
      >
        {compIdx || "-"}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm md:text-base text-neutral-600">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            키워드 검색량 분석
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          네이버 검색도구 API를 활용하여<br className="md:hidden" />
          <span className="hidden md:inline"> </span>키워드의 월간 검색량과 경쟁도를 분석하세요
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge 
            variant="secondary"
            className="bg-teal-100 text-teal-700 border-teal-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Monitor className="w-4 h-4" />
            PC 검색량
          </Badge>
          <Badge 
            variant="secondary"
            className="bg-cyan-100 text-cyan-700 border-cyan-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" />
            모바일 검색량
          </Badge>
        </div>
      </header>

      <div className="space-y-6 md:space-y-8">

      {/* 검색 영역 */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder="키워드를 입력하세요 (쉼표로 구분)"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-11 md:h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="flex-1 sm:flex-initial gap-2 h-11 md:h-10"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    검색 중
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    검색
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsCombinatorOpen(true)}
                variant="outline"
                className="flex-1 sm:flex-initial gap-2 h-11 md:h-10"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">키워드 조합기</span>
                <span className="sm:hidden">조합기</span>
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">
              💡 예시: 성수맛집, 성수동카페, 종로한식
            </p>
            <p className="text-xs text-amber-700">
              ⚠️ 띄어쓰기는 자동으로 제거되며, 키워드는 최대 15자까지 지원됩니다 (네이버 API 제한)
            </p>
          </div>
        </div>
      </Card>

      {/* 현재 검색 결과 */}
      {currentResults.length > 0 && (
        <Card className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-neutral-900 mb-3 md:mb-4">
            검색 결과 ({currentResults.length}개)
          </h2>
          <div className="space-y-3">
            {currentResults.map((item) => (
              <div 
                key={item.id} 
                className="border border-neutral-200 rounded-xl p-3 md:p-4 bg-gradient-to-br from-primary/5 via-white to-white hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="text-base md:text-lg font-bold text-neutral-900 break-words flex-1">
                    {item.keyword}
                  </h3>
                  <div className="flex-shrink-0">
                    {getCompIdxBadge(item.comp_idx)}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 text-sm">
                  <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <Search className="w-3.5 h-3.5" />
                      <span className="font-semibold text-xs">총 검색량</span>
                    </div>
                    <p className="font-bold text-lg md:text-xl text-primary">
                      {(typeof item.monthly_pc_qc_cnt === 'string' || typeof item.monthly_mobile_qc_cnt === 'string')
                        ? '< 10'
                        : formatNumber(getTotalSearchVolume(item.monthly_pc_qc_cnt, item.monthly_mobile_qc_cnt))}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="text-xs">PC 검색</span>
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {formatNumber(item.monthly_pc_qc_cnt)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="text-xs">모바일 검색</span>
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {formatNumber(item.monthly_mobile_qc_cnt)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs">PC 클릭률</span>
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {item.monthly_ave_pc_ctr ? `${item.monthly_ave_pc_ctr}%` : "-"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-neutral-600 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs">모바일 클릭률</span>
                    </div>
                    <p className="font-semibold text-neutral-900">
                      {item.monthly_ave_mobile_ctr ? `${item.monthly_ave_mobile_ctr}%` : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 검색 이력 */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base md:text-lg font-semibold text-neutral-900">
            검색 이력 <span className="text-neutral-500">({searchHistory.length}/100)</span>
          </h2>
          {searchHistory.length >= 90 && (
            <div className={`text-xs px-3 py-1 rounded-full font-semibold self-start sm:self-auto ${
              searchHistory.length >= 100 
                ? 'bg-error/10 text-error border border-error/20' 
                : 'bg-warning/10 text-warning border border-warning/20'
            }`}>
              {searchHistory.length >= 100 
                ? '⚠️ 저장 한도 도달' 
                : '⚠️ 저장 한도 임박'}
            </div>
          )}
        </div>
        
        {searchHistory.length >= 90 && (
          <div className={`mb-4 p-3 rounded-lg border ${
            searchHistory.length >= 100
              ? 'bg-error/5 border-error/20'
              : 'bg-warning/5 border-warning/20'
          }`}>
            <p className={`text-sm ${
              searchHistory.length >= 100 
                ? 'text-error' 
                : 'text-warning'
            }`}>
              {searchHistory.length >= 100 
                ? '🚫 검색 이력이 100개에 도달했습니다. 새로운 검색을 위해서는 일부 이력을 삭제해주세요.'
                : `⚠️ 검색 이력이 ${searchHistory.length}개입니다. 곧 100개 제한에 도달합니다.`}
            </p>
          </div>
        )}
        
        {isLoadingHistory ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-neutral-600">검색 이력을 불러오는 중...</p>
          </div>
        ) : searchHistory.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">검색 이력이 없습니다</p>
            <p className="text-sm mt-1">키워드를 검색하면 이곳에 이력이 표시됩니다</p>
          </div>
        ) : (
          <>
            {searchHistory.length > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={selectedHistoryIds.size === searchHistory.length && searchHistory.length > 0}
                    onChange={handleToggleSelectAll}
                    className="text-primary rounded border-neutral-300 focus:ring-primary focus:ring-1 cursor-pointer"
                    style={{ width: '13px', height: '13px', minWidth: '13px', minHeight: '13px', maxWidth: '13px', maxHeight: '13px' }}
                  />
                  <span className="text-sm text-neutral-700 font-medium">
                    전체 선택 
                    {selectedHistoryIds.size > 0 && (
                      <span className="text-primary ml-1">({selectedHistoryIds.size}개)</span>
                    )}
                  </span>
                </label>
                {selectedHistoryIds.size > 0 && (
                  <Button
                    onClick={handleDeleteSelected}
                    variant="outline"
                    size="sm"
                    className="text-error hover:text-error hover:bg-error/5 border-error/20 h-7 px-2.5 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">선택 삭제</span>
                    <span className="sm:hidden">삭제</span>
                    <span className="ml-0.5">({selectedHistoryIds.size})</span>
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {searchHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="border border-neutral-200 rounded-lg p-3 md:p-4 hover:bg-neutral-50 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <label className="cursor-pointer flex items-start pt-0.5">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.has(item.id)}
                          onChange={() => handleToggleSelect(item.id)}
                          className="flex-shrink-0 text-primary rounded border-neutral-300 focus:ring-primary focus:ring-1 cursor-pointer"
                          style={{ width: '13px', height: '13px', minWidth: '13px', minHeight: '13px', maxWidth: '13px', maxHeight: '13px' }}
                        />
                      </label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 break-words text-sm">{item.keyword}</h3>
                        <div className="self-start">
                          {getCompIdxBadge(item.comp_idx)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="text-error hover:text-error hover:bg-error/5 flex-shrink-0 rounded-md transition-colors p-1"
                      style={{ width: '24px', height: '24px' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm ml-5">
                    <div>
                      <span className="text-neutral-600 font-medium">총 검색량: </span>
                      <span className="font-bold text-primary">
                        {(typeof item.monthly_pc_qc_cnt === 'string' || typeof item.monthly_mobile_qc_cnt === 'string')
                          ? '< 10'
                          : formatNumber(getTotalSearchVolume(item.monthly_pc_qc_cnt, item.monthly_mobile_qc_cnt))}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-600">PC: </span>
                      <span className="font-medium text-neutral-900">{formatNumber(item.monthly_pc_qc_cnt)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">모바일: </span>
                      <span className="font-medium text-neutral-900">{formatNumber(item.monthly_mobile_qc_cnt)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">PC CTR: </span>
                      <span className="font-medium text-neutral-900">
                        {item.monthly_ave_pc_ctr ? `${item.monthly_ave_pc_ctr}%` : "-"}
                      </span>
                    </div>
                    <div className="text-neutral-500 text-xs">
                      {new Date(item.created_at).toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

        {/* 키워드 조합기 모달 */}
        <KeywordCombinator
          isOpen={isCombinatorOpen}
          onClose={() => setIsCombinatorOpen(false)}
          onApplyCombinations={handleApplyCombinations}
        />
      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
      </div>
    </div>
  )
}
