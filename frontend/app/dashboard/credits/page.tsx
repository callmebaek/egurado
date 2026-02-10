"use client"

/**
 * 크레딧 내역 페이지
 * 크레딧 현황, 사용 내역, 기능별 소모량 안내, 추가 구매
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { 
  CreditCard, 
  TrendingDown,
  Clock,
  Calendar,
  Zap,
  Info,
  Loader2,
  Crown
} from 'lucide-react'
import { api } from '@/lib/config'
import Link from 'next/link'

interface CreditInfo {
  monthly_credits: number
  monthly_used: number
  monthly_remaining: number
  manual_credits: number
  total_remaining: number
  tier: string
  next_reset: string
  percentage_used: number
}

interface CreditHistory {
  id: string
  created_at: string
  feature: string
  amount: number
  remaining: number
  description: string
}

// 기능명 매핑 테이블 (백엔드 feature 코드 → 사용자 친화적 이름)
const FEATURE_NAME_MAP: Record<string, string> = {
  // 순위 관련
  'rank_check': '키워드 순위 조회',
  'keyword_rank': '키워드 순위 조회',
  'rank_tracking': '키워드 순위 추적',
  
  // 분석 관련
  'main_keyword_analysis': '대표키워드 분석',
  'keyword_analysis': '대표키워드 분석',
  'place_diagnosis': '플레이스 진단',
  'place_activation': '플레이스 활성화',
  'place_diagnosis_detail': '플레이스 진단 (상세)',
  'place_diagnosis_simple': '플레이스 진단 (간편)',
  'competitor_analysis': '경쟁사 분석',
  'review_analysis': '리뷰 분석',
  'review_analysis_full': '리뷰 분석 (전체)',
  'review_analysis_sample': '리뷰 분석 (샘플)',
  'target_keyword_extraction': '타겟키워드 추출',
  'target_keywords': '타겟키워드 추출',
  
  // AI 관련
  'ai_reply_generate': 'AI 답글 생성',
  'ai_reply_post': 'AI 답글 게시',
  'business_description': '사업자 설명 생성',
  'ai_description': '사업자 설명 생성',
  'directions': '찾아오는 길 생성',
  'ai_directions': '찾아오는 길 생성',
  
  // 검색량 관련
  'keyword_search_volume': '키워드 검색량 조회',
  'search_volume': '키워드 검색량 조회',
  
  // 시스템 관련
  'deduct': '크레딧 사용',
  'charge': '크레딧 충전',
  'refund': '크레딧 환불',
  'reset': '월간 크레딧 리셋',
  'manual_charge': '수동 충전',
  'subscription_charge': '구독 충전',
}

const FEATURE_COSTS = [
  { name: '키워드 순위 조회', cost: 5, icon: '📊', description: '키워드 1개당 순위 조회' },
  { name: '대표키워드 분석', cost: 10, icon: '⭐', description: '검색어 1개 분석 (상위 15개 매장)' },
  { name: '플레이스 진단', cost: 5, icon: '🏥', description: '매장 1개 종합 진단' },
  { name: '플레이스 활성화', cost: 10, icon: '⚡', description: '매장 1개 활성화 분석' },
  { name: '경쟁사 분석', cost: 30, icon: '🎯', description: '경쟁사 1개 심층 분석' },
  { name: '리뷰 분석 (전체)', cost: 30, icon: '💬', description: '매장 1개 전체 리뷰 분석' },
  { name: '리뷰 분석 (샘플)', cost: 10, icon: '💬', description: '매장 1개 샘플 리뷰 분석' },
  { name: 'AI 답글 생성', cost: 1, icon: '✨', description: '리뷰 1개당 AI 답글 생성' },
  { name: 'AI 답글 게시', cost: 2, icon: '📤', description: '리뷰 1개당 답글 게시' },
  { name: '타겟키워드 추출', cost: 20, icon: '🔍', description: '매장 1개 타겟키워드 추출' },
  { name: '키워드 검색량 조회', cost: 1, icon: '📈', description: '키워드 1개당 검색량' },
  { name: '사업자 설명 생성', cost: 5, icon: '📝', description: '매장 1개 설명 생성' },
  { name: '찾아오는 길 생성', cost: 3, icon: '🗺️', description: '매장 1개 길찾기 정보' },
]

export default function CreditsPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null)
  const [history, setHistory] = useState<CreditHistory[]>([])
  const [isLoadingInfo, setIsLoadingInfo] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // 크레딧 정보 로드
  useEffect(() => {
    const loadCreditInfo = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/credits/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setCreditInfo(data)
        }
      } catch (error) {
        console.error('크레딧 정보 로드 실패:', error)
      } finally {
        setIsLoadingInfo(false)
      }
    }
    
    loadCreditInfo()
  }, [user, getToken])

  // 크레딧 사용 내역 로드
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/credits/transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // 디버깅: 원본 데이터 확인
          if (data && data.length > 0) {
            console.log('[Credits] 첫 번째 트랜잭션 원본:', data[0])
          }
          
          // 백엔드 응답을 프론트엔드 형식으로 변환
          const formattedHistory = data.map((transaction: any) => {
            const featureCode = transaction.feature || transaction.transaction_type
            const featureName = FEATURE_NAME_MAP[featureCode] || featureCode
            
            // credits_amount 처리 (음수는 차감, 양수는 충전)
            // from_monthly와 from_manual의 합계 사용
            const amount = transaction.credits_amount || 
                          (transaction.from_monthly || 0) + (transaction.from_manual || 0)
            
            // metadata에서 상세 설명 가져오기
            let description = transaction.metadata?.description || ''
            if (!description) {
              // 트랜잭션 타입별 기본 설명
              if (transaction.transaction_type === 'deduct') {
                description = transaction.metadata?.keyword ? 
                  `키워드: ${transaction.metadata.keyword}` :
                  transaction.metadata?.store_name ?
                  `매장: ${transaction.metadata.store_name}` :
                  '크레딧 사용'
              } else if (transaction.transaction_type === 'charge') {
                description = '크레딧 충전'
              } else if (transaction.transaction_type === 'refund') {
                description = '크레딧 환불'
              } else if (transaction.transaction_type === 'reset') {
                description = '월간 크레딧 리셋'
              } else {
                description = '기타'
              }
            }
            
            return {
              id: transaction.id,
              created_at: transaction.created_at,
              feature: featureName,
              amount: amount,
              remaining: transaction.balance_after || 0,
              description: description
            }
          })
          
          console.log('[Credits] 변환된 히스토리:', formattedHistory.slice(0, 3))
          setHistory(formattedHistory)
        } else {
          // Mock 데이터 (API 미구현 시)
          const mockHistory: CreditHistory[] = [
            {
              id: '1',
              created_at: new Date().toISOString(),
              feature: '키워드 순위 추적',
              amount: -3,
              remaining: 650,
              description: '강남카페'
            },
            {
              id: '2',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              feature: '리뷰 분석',
              amount: -10,
              remaining: 653,
              description: '홍대맛집'
            },
            {
              id: '3',
              created_at: new Date(Date.now() - 172800000).toISOString(),
              feature: '플레이스 진단',
              amount: -5,
              remaining: 663,
              description: '성수카페'
            },
            {
              id: '4',
              created_at: new Date(Date.now() - 259200000).toISOString(),
              feature: '대표키워드 분석',
              amount: -5,
              remaining: 668,
              description: '혜화맛집'
            },
          ]
          setHistory(mockHistory)
        }
      } catch (error) {
        console.error('크레딧 내역 로드 실패:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    loadHistory()
  }, [user, getToken])

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'god': return 'from-yellow-400 to-orange-500'
      case 'custom': return 'from-purple-500 to-violet-500'
      case 'pro': return 'from-purple-400 to-pink-500'
      case 'basic_plus': return 'from-blue-500 to-cyan-500'
      case 'basic': return 'from-blue-400 to-indigo-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'god': return 'GOD'
      case 'custom': return 'CUSTOM'
      case 'pro': return 'PRO'
      case 'basic_plus': return 'BASIC+'
      case 'basic': return 'BASIC'
      default: return 'FREE'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysUntilReset = (resetDate: string) => {
    const now = new Date()
    const reset = new Date(resetDate)
    const diff = reset.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            크레딧 관리
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
          크레딧 사용 내역을 확인하고 추가 구매하세요
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 크레딧 현황 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-200 shadow-lg overflow-hidden">
            <div className="bg-white p-6 md:p-8">
              {isLoadingInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : creditInfo ? (
                <div>
                  {/* 상단: Tier & 총 크레딧 */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 pb-6 border-b-2 border-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-500">현재 등급</div>
                        <div className="text-2xl font-extrabold text-neutral-900">{getTierLabel(creditInfo.tier)}</div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-sm font-medium text-neutral-500">총 잔여 크레딧</div>
                      <div className="text-4xl md:text-5xl font-extrabold text-blue-600">
                        {creditInfo.total_remaining.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 크레딧 상세 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* 월간 크레딧 */}
                    <div className="bg-white border-2 border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-neutral-900">월간 크레딧</span>
                      </div>
                      <div className="text-2xl font-bold text-neutral-900 mb-1">
                        {creditInfo.monthly_remaining.toLocaleString()} / {creditInfo.monthly_credits.toLocaleString()}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {creditInfo.next_reset && `${getDaysUntilReset(creditInfo.next_reset)}일 후 리셋`}
                      </div>
                    </div>

                    {/* 사용률 */}
                    <div className="bg-white border-2 border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-semibold text-neutral-900">월간 사용률</span>
                      </div>
                      <div className="text-2xl font-bold text-neutral-900 mb-1">
                        {creditInfo.percentage_used.toFixed(1)}%
                      </div>
                      <div className="text-xs text-neutral-500">
                        {creditInfo.monthly_used.toLocaleString()} 크레딧 사용
                      </div>
                    </div>
                  </div>

                  {/* 구독 또는 업그레이드 하기 버튼 */}
                  <div className="mt-6 flex justify-center">
                    <Link href="/dashboard/membership">
                      <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 h-12 px-8 text-base font-bold shadow-lg">
                        <Crown className="w-5 h-5 mr-2" />
                        구독 또는 업그레이드 하기
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg">크레딧 정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 기능별 크레딧 소모량 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <Info className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    기능별 크레딧 소모량
                  </h2>
                  <p className="text-sm text-blue-700 mt-0.5">
                    각 기능 사용 시 차감되는 크레딧
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURE_COSTS.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-neutral-900 mb-1">
                        {feature.name}
                      </h3>
                      <p className="text-sm text-neutral-600 mb-2">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-green-600">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-bold">{feature.cost} 크레딧</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* 크레딧 사용 내역 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    크레딧 사용 내역
                  </h2>
                  <p className="text-sm text-purple-700 mt-0.5">
                    최근 30일 사용 기록
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-sm text-neutral-700">날짜</th>
                        <th className="text-left py-3 px-4 font-bold text-sm text-neutral-700">기능</th>
                        <th className="text-left py-3 px-4 font-bold text-sm text-neutral-700">설명</th>
                        <th className="text-right py-3 px-4 font-bold text-sm text-neutral-700">사용량</th>
                        <th className="text-right py-3 px-4 font-bold text-sm text-neutral-700">잔여량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                          <td className="py-4 px-4 text-sm text-neutral-600">
                            {formatDate(record.created_at)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold">
                              {record.feature || '기타'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-neutral-600">
                            {record.description || '-'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-bold text-sm ${(record.amount || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {(record.amount || 0) > 0 ? '+' : ''}{record.amount || 0}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right text-sm font-semibold text-neutral-900">
                            {(record.remaining || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    사용 내역이 없습니다
                  </h3>
                  <p className="text-sm text-neutral-600">
                    기능을 사용하면 여기에 내역이 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
