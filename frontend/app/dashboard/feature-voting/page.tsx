'use client'

/**
 * 신규 기능 투표 페이지
 * 사용자들이 원하는 기능에 투표할 수 있는 페이지
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  BarChart3, 
  Search, 
  Bell, 
  MessageSquare,
  Star,
  MapPin,
  Award,
  Globe,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Users,
  Sparkles
} from 'lucide-react'
import { api } from '@/lib/config'
import { useAuth } from '@/lib/auth-context'

// ================================
// 타입 정의
// ================================

interface Feature {
  key: string
  name: string
  description: string
  category: 'naver' | 'kakao' | 'google'
  icon: React.ReactNode
}

interface VoteSummary {
  feature_key: string
  want_count: number
  not_needed_count: number
  total_votes: number
  user_voted: 'want' | 'not_needed' | null
}

// ================================
// 기능 목록 정의
// ================================

const FEATURES: Feature[] = [
  // 네이버 플레이스
  {
    key: 'naver-kpi-dashboard',
    name: '주요 KPI현황',
    description: '우리매장의 유입, 고객전환지수 그리고 파생변수들을 일별 확인하여 기록할 수 있는 최상위의 플레이스 지표 관리 기능입니다.',
    category: 'naver',
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    key: 'naver-index-analysis',
    name: '지수 분석 및 전략',
    description: '주요 KPI현황을 토대로 이동평균 및 경쟁사 분석등을 통해 분석 후 이에 맞는 전략을 수립합니다.',
    category: 'naver',
    icon: <TrendingUp className="w-5 h-5" />
  },
  {
    key: 'naver-search-ad-analysis',
    name: '검색광고 분석',
    description: '검색광고를 통해 진행하고 있는 캠페인들의 일/주/월 단위로 분석하여 결과를 도출합니다. 해당 분석결과는 앞으로 검색광고 운영에 즉각 참고할 수 있는 핵심적인 기능입니다.',
    category: 'naver',
    icon: <Search className="w-5 h-5" />
  },
  {
    key: 'naver-notice',
    name: '네이버 공지',
    description: '네이버 플레이스 관련 최신 공지사항과 업데이트 내용을 실시간으로 확인할 수 있는 기능입니다.',
    category: 'naver',
    icon: <Bell className="w-5 h-5" />
  },
  
  // 카카오 비즈니스
  {
    key: 'kakao-business-diagnosis',
    name: 'K사 비즈니스 매장진단',
    description: '카카오 비즈니스 매장의 현재 상태를 종합적으로 진단하고 개선점을 제시합니다.',
    category: 'kakao',
    icon: <Star className="w-5 h-5" />
  },
  {
    key: 'kakao-review-management',
    name: 'K사 리뷰관리',
    description: '카카오맵 리뷰를 효율적으로 관리하고 분석할 수 있는 기능입니다.',
    category: 'kakao',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    key: 'kakao-map-rank',
    name: 'K사 맵 순위조회',
    description: '카카오맵에서 키워드별 매장 순위를 조회하고 추적할 수 있습니다.',
    category: 'kakao',
    icon: <MapPin className="w-5 h-5" />
  },
  {
    key: 'kakao-metrics',
    name: 'K사 주요지표관리',
    description: '카카오 비즈니스의 핵심 지표들을 자동으로 수집하고 추적합니다.',
    category: 'kakao',
    icon: <BarChart3 className="w-5 h-5" />
  },
  
  // 구글 비즈니스 프로필
  {
    key: 'google-review-analysis',
    name: 'GBP 리뷰 통계/현황 분석',
    description: 'Google Business Profile의 리뷰 분석을 통해 고객들의 언어별 분포, 리뷰온도, 리뷰 추이를 확인합니다.',
    category: 'google',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    key: 'google-ai-reply',
    name: 'GBP AI 리뷰답글 달기',
    description: '리뷰 답글을 AI 답글을 통해 손쉽게 올릴 수 있는 기능입니다.',
    category: 'google',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    key: 'google-gbp-diagnosis',
    name: 'GBP 진단',
    description: '현재 GBP 업체정보가 로컬 노출과 키워드에 맞게 구성되었는지 진단합니다.',
    category: 'google',
    icon: <Star className="w-5 h-5" />
  },
  {
    key: 'google-map-rank',
    name: 'G사 맵 순위조회',
    description: '키워드 및 지역별 구글맵에서 순위를 알려주는 기능입니다.',
    category: 'google',
    icon: <MapPin className="w-5 h-5" />
  },
  {
    key: 'google-citation-boost',
    name: 'Citation Boost',
    description: 'Local citation을 쉽게 도와주는 기능입니다. 지역 비즈니스의 온라인 가시성을 높입니다.',
    category: 'google',
    icon: <Award className="w-5 h-5" />
  },
  {
    key: 'google-keyword-volume',
    name: '구글 키워드 검색량 조회',
    description: '구글에서 언어별, 국가별 키워드 검색량을 알려주는 기능입니다.',
    category: 'google',
    icon: <Globe className="w-5 h-5" />
  },
]

// ================================
// 메인 컴포넌트
// ================================

export default function FeatureVotingPage() {
  const router = useRouter()
  const { user, getToken } = useAuth()
  
  const [voteSummaries, setVoteSummaries] = useState<Record<string, VoteSummary>>({})
  const [loading, setLoading] = useState(true)
  const [votingFeature, setVotingFeature] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'naver' | 'kakao' | 'google'>('all')
  
  // ================================
  // 데이터 로드
  // ================================
  
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    loadVoteSummaries()
  }, [user])
  
  const loadVoteSummaries = async () => {
    try {
      setLoading(true)
      const token = getToken()
      
      const response = await fetch(api.votes.features(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('투표 현황 조회 실패')
      }
      
      const data: VoteSummary[] = await response.json()
      
      // 배열을 객체로 변환 (feature_key를 키로)
      const summaryMap: Record<string, VoteSummary> = {}
      data.forEach(summary => {
        summaryMap[summary.feature_key] = summary
      })
      
      setVoteSummaries(summaryMap)
    } catch (error) {
      console.error('투표 현황 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // ================================
  // 투표 처리
  // ================================
  
  const handleVote = async (featureKey: string, voteType: 'want' | 'not_needed') => {
    try {
      setVotingFeature(featureKey)
      const token = getToken()
      
      const response = await fetch(api.votes.vote(featureKey), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote_type: voteType })
      })
      
      if (!response.ok) {
        const error = await response.json()
        if (response.status === 409) {
          alert('이미 투표하신 기능입니다.')
        } else {
          throw new Error(error.detail || '투표 실패')
        }
        return
      }
      
      // 투표 성공 - 데이터 새로고침
      await loadVoteSummaries()
      
    } catch (error) {
      console.error('투표 실패:', error)
      alert('투표 중 오류가 발생했습니다.')
    } finally {
      setVotingFeature(null)
    }
  }
  
  // ================================
  // 필터링
  // ================================
  
  const filteredFeatures = selectedCategory === 'all' 
    ? FEATURES 
    : FEATURES.filter(f => f.category === selectedCategory)
  
  // ================================
  // 카테고리별 색상
  // ================================
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'naver': return 'bg-green-50 border-green-200 text-green-700'
      case 'kakao': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'google': return 'bg-blue-50 border-blue-200 text-blue-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }
  
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'naver': return '네이버 플레이스'
      case 'kakao': return '카카오 비즈니스'
      case 'google': return '구글 비즈니스 프로필'
      default: return ''
    }
  }
  
  // ================================
  // 렌더링
  // ================================
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">투표 현황을 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">신규 기능 투표</h1>
          </div>
          <p className="text-gray-600 text-lg">
            어떤 기능이 가장 필요하신가요? 여러분의 의견을 들려주세요! 🗳️
          </p>
          <p className="text-sm text-gray-500 mt-2">
            투표 결과는 실시간으로 모든 사용자에게 공개되며, 개발 우선순위에 반영됩니다.
          </p>
        </div>
        
        {/* 카테고리 필터 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedCategory('naver')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'naver'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            네이버 플레이스
          </button>
          <button
            onClick={() => setSelectedCategory('kakao')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'kakao'
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            카카오 비즈니스
          </button>
          <button
            onClick={() => setSelectedCategory('google')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === 'google'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            구글 비즈니스 프로필
          </button>
        </div>
        
        {/* 기능 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => {
            const summary = voteSummaries[feature.key]
            const wantCount = summary?.want_count || 0
            const notNeededCount = summary?.not_needed_count || 0
            const totalVotes = summary?.total_votes || 0
            const userVoted = summary?.user_voted
            const wantPercentage = totalVotes > 0 ? (wantCount / totalVotes) * 100 : 0
            
            return (
              <div
                key={feature.key}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-all duration-300"
              >
                {/* 카테고리 배지 */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getCategoryColor(feature.category)}`}>
                    {getCategoryName(feature.category)}
                  </span>
                  {feature.icon}
                </div>
                
                {/* 기능명 */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {feature.name}
                </h3>
                
                {/* 설명 */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {feature.description}
                </p>
                
                {/* 투표 현황 */}
                {totalVotes > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-green-600" />
                        {wantCount}명
                      </span>
                      <span className="font-semibold">{totalVotes}명 참여</span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-gray-400" />
                        {notNeededCount}명
                      </span>
                    </div>
                    
                    {/* 프로그레스 바 */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 transition-all duration-500"
                        style={{ width: `${wantPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* 투표 버튼 */}
                {userVoted ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">
                      {userVoted === 'want' ? '빨리 만들어주세요 투표함' : '별로 필요없다고 투표함'}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVote(feature.key, 'want')}
                      disabled={votingFeature === feature.key}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">빨리 만들어주세요</span>
                    </button>
                    <button
                      onClick={() => handleVote(feature.key, 'not_needed')}
                      disabled={votingFeature === feature.key}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* 안내 메시지 */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">💡 투표 안내</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• 각 기능당 1번만 투표할 수 있습니다.</li>
            <li>• 투표 결과는 실시간으로 모든 사용자에게 공개됩니다.</li>
            <li>• 투표가 많은 기능일수록 우선적으로 개발됩니다.</li>
            <li>• 투표 후에는 변경할 수 없으니 신중하게 선택해주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
