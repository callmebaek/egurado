'use client';

/**
 * 신규 기능 투표 페이지
 * 사용자들이 원하는 기능에 투표할 수 있는 페이지
 * TurboTax 스타일로 리팩토링됨
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Search,
  Bell,
  MessageSquare,
  Star,
  MapPin,
  Award,
  Globe,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ================================
// 타입 정의
// ================================

interface Feature {
  key: string;
  name: string;
  description: string;
  category: 'naver' | 'kakao' | 'google';
  icon: React.ReactNode;
}

interface VoteSummary {
  feature_key: string;
  want_count: number;
  not_needed_count: number;
  total_votes: number;
  user_voted: 'want' | 'not_needed' | null;
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
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    key: 'naver-index-analysis',
    name: '지수 분석 및 전략',
    description: '주요 KPI현황을 토대로 이동평균 및 경쟁사 분석등을 통해 분석 후 이에 맞는 전략을 수립합니다.',
    category: 'naver',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    key: 'naver-search-ad-analysis',
    name: '검색광고 분석',
    description: '검색광고를 통해 진행하고 있는 캠페인들의 일/주/월 단위로 분석하여 결과를 도출합니다. 해당 분석결과는 앞으로 검색광고 운영에 즉각 참고할 수 있는 핵심적인 기능입니다.',
    category: 'naver',
    icon: <Search className="w-5 h-5" />,
  },
  {
    key: 'naver-notice',
    name: '네이버 공지',
    description: '네이버 플레이스 관련 최신 공지사항과 업데이트 내용을 실시간으로 확인할 수 있는 기능입니다.',
    category: 'naver',
    icon: <Bell className="w-5 h-5" />,
  },

  // 카카오 비즈니스
  {
    key: 'kakao-business-diagnosis',
    name: 'K사 비즈니스 매장진단',
    description: '카카오 비즈니스 매장의 현재 상태를 종합적으로 진단하고 개선점을 제시합니다.',
    category: 'kakao',
    icon: <Star className="w-5 h-5" />,
  },
  {
    key: 'kakao-review-management',
    name: 'K사 리뷰관리',
    description: '카카오맵 리뷰를 효율적으로 관리하고 분석할 수 있는 기능입니다.',
    category: 'kakao',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    key: 'kakao-map-rank',
    name: 'K사 맵 순위조회',
    description: '카카오맵에서 키워드별 매장 순위를 조회하고 추적할 수 있습니다.',
    category: 'kakao',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    key: 'kakao-metrics',
    name: 'K사 주요지표관리',
    description: '카카오 비즈니스의 핵심 지표들을 자동으로 수집하고 추적합니다.',
    category: 'kakao',
    icon: <BarChart3 className="w-5 h-5" />,
  },

  // 구글 비즈니스 프로필
  {
    key: 'google-review-analysis',
    name: 'GBP 리뷰 통계/현황 분석',
    description: 'Google Business Profile의 리뷰 분석을 통해 고객들의 언어별 분포, 리뷰온도, 리뷰 추이를 확인합니다.',
    category: 'google',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    key: 'google-ai-reply',
    name: 'GBP AI 리뷰답글 달기',
    description: '리뷰 답글을 AI 답글을 통해 손쉽게 올릴 수 있는 기능입니다.',
    category: 'google',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    key: 'google-gbp-diagnosis',
    name: 'GBP 진단',
    description: '현재 GBP 업체정보가 로컬 노출과 키워드에 맞게 구성되었는지 진단합니다.',
    category: 'google',
    icon: <Star className="w-5 h-5" />,
  },
  {
    key: 'google-map-rank',
    name: 'G사 맵 순위조회',
    description: '키워드 및 지역별 구글맵에서 순위를 알려주는 기능입니다.',
    category: 'google',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    key: 'google-citation-boost',
    name: 'Citation Boost',
    description: 'Local citation을 쉽게 도와주는 기능입니다. 지역 비즈니스의 온라인 가시성을 높입니다.',
    category: 'google',
    icon: <Award className="w-5 h-5" />,
  },
  {
    key: 'google-keyword-volume',
    name: '구글 키워드 검색량 조회',
    description: '구글에서 언어별, 국가별 키워드 검색량을 알려주는 기능입니다.',
    category: 'google',
    icon: <Globe className="w-5 h-5" />,
  },
];

// ================================
// 메인 컴포넌트
// ================================

export default function FeatureVotingPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();

  const [voteSummaries, setVoteSummaries] = useState<Record<string, VoteSummary>>({});
  const [loading, setLoading] = useState(true);
  const [votingFeature, setVotingFeature] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'naver' | 'kakao' | 'google'>('all');

  // ================================
  // 데이터 로드
  // ================================

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadVoteSummaries();
  }, [user]);

  const loadVoteSummaries = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const response = await fetch(api.votes.features(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error('투표 현황 조회 실패');
      }

      const data: VoteSummary[] = await response.json();

      // 배열을 객체로 변환 (feature_key를 키로)
      const summaryMap: Record<string, VoteSummary> = {};
      data.forEach((summary) => {
        summaryMap[summary.feature_key] = summary;
      });

      setVoteSummaries(summaryMap);

      // 1개 이상 투표했는지 체크
      const hasVoted = data.some((summary) => summary.user_voted !== null);
      if (hasVoted) {
        localStorage.setItem('feature_vote_completed', 'true');
      }
    } catch (error) {
      console.error('투표 현황 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // 투표 처리
  // ================================

  const handleVote = async (featureKey: string, voteType: 'want' | 'not_needed') => {
    try {
      setVotingFeature(featureKey);
      const token = getToken();

      const response = await fetch(api.votes.vote(featureKey), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: voteType }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert('이미 투표하신 기능입니다.');
        } else {
          throw new Error(error.detail || '투표 실패');
        }
        return;
      }

      // 투표 성공 - 완료 처리
      localStorage.setItem('feature_vote_completed', 'true');

      // 데이터 새로고침
      await loadVoteSummaries();
    } catch (error) {
      console.error('투표 실패:', error);
      alert('투표 중 오류가 발생했습니다.');
    } finally {
      setVotingFeature(null);
    }
  };

  // ================================
  // 필터링
  // ================================

  const filteredFeatures = selectedCategory === 'all' ? FEATURES : FEATURES.filter((f) => f.category === selectedCategory);

  // ================================
  // 카테고리별 색상
  // ================================

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'naver':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'kakao':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'google':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getCategoryButtonColor = (category: string, isActive: boolean) => {
    if (!isActive) return '';
    
    switch (category) {
      case 'naver':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'kakao':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'google':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      default:
        return 'bg-primary-500 hover:bg-primary-600 text-white';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'naver':
        return '네이버 플레이스';
      case 'kakao':
        return '카카오 비즈니스';
      case 'google':
        return '구글 비즈니스 프로필';
      default:
        return '';
    }
  };

  // ================================
  // 렌더링
  // ================================

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  // 투표 현황 집계
  const totalUserVotes = Object.values(voteSummaries).filter((s) => s.user_voted !== null).length;

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-neutral-50/20 to-slate-50/20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-neutral-400 to-slate-400 rounded-2xl flex items-center justify-center shadow-lg">
            <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-white" />
          </div>
          <p className="text-base md:text-lg font-semibold text-neutral-700">투표 현황을 불러오는 중...</p>
          <p className="text-sm md:text-base text-neutral-500">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50/30 via-neutral-50/20 to-slate-50/20">
      {/* 헤더 */}
      <div className="mb-8 md:mb-12 text-center">
        <div className="flex justify-center mb-4 md:mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-neutral-400 to-slate-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Lightbulb className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-3 md:mb-4 leading-tight">
          추가 기능 요청
        </h1>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto mb-4">
          원하는 기능에 투표하고 개발 우선순위를 결정하세요
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border-neutral-300 text-xs md:text-sm px-3 py-1">
            <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
            실시간 투표
          </Badge>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300 text-xs md:text-sm px-3 py-1">
            <Award className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
            우선순위 반영
          </Badge>
        </div>
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="h-12 md:h-14 px-6 text-base font-semibold border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-xl transition-all"
          >
            대시보드로 돌아가기
          </Button>
        </div>
      </div>

      {/* 투표 완료 알림 */}
      {totalUserVotes > 0 && (
        <div className="mb-6 p-5 md:p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl shadow-lg">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-base md:text-lg font-bold text-emerald-900 mb-1">
                🎉 감사합니다! {totalUserVotes}개 기능에 투표하셨습니다
              </p>
              <p className="text-sm md:text-base text-emerald-700">
                투표한 기능의 개발이 완료되면 가장 먼저 알려드릴게요
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="mb-6 p-5 md:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-xl shadow-md">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <Lightbulb className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base md:text-lg font-bold text-amber-900 mb-3">💡 투표 참여 안내</p>
            <ul className="space-y-2 text-sm md:text-base text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">•</span>
                <span>원하는 기능에 투표하면 해당 기능의 <strong>개발 우선순위</strong>가 높아집니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">•</span>
                <span>각 기능당 <strong>1번만 투표</strong>할 수 있습니다</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">•</span>
                <span>투표 결과는 <strong>실시간</strong>으로 모든 사용자에게 공개됩니다</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-8">
        <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-4 text-center md:text-left">
          카테고리별 기능 보기
        </h2>
        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          <Button
            onClick={() => setSelectedCategory('all')}
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className={`h-12 md:h-14 px-6 text-base font-semibold rounded-xl shadow-md transition-all ${
              selectedCategory === 'all' 
                ? 'bg-gradient-to-r from-neutral-600 to-slate-600 hover:from-neutral-700 hover:to-slate-700 text-white shadow-lg'
                : 'border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
            }`}
          >
            전체 ({FEATURES.length})
          </Button>
          <Button
            onClick={() => setSelectedCategory('naver')}
            variant={selectedCategory === 'naver' ? 'default' : 'outline'}
            className={`h-12 md:h-14 px-6 text-base font-semibold rounded-xl shadow-md transition-all ${
              selectedCategory === 'naver'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg'
                : 'border-2 border-neutral-300 hover:border-green-400 hover:bg-green-50'
            }`}
          >
            네이버 플레이스 ({FEATURES.filter(f => f.category === 'naver').length})
          </Button>
          <Button
            onClick={() => setSelectedCategory('kakao')}
            variant={selectedCategory === 'kakao' ? 'default' : 'outline'}
            className={`h-12 md:h-14 px-6 text-base font-semibold rounded-xl shadow-md transition-all ${
              selectedCategory === 'kakao'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg'
                : 'border-2 border-neutral-300 hover:border-yellow-400 hover:bg-yellow-50'
            }`}
          >
            카카오 비즈니스 ({FEATURES.filter(f => f.category === 'kakao').length})
          </Button>
          <Button
            onClick={() => setSelectedCategory('google')}
            variant={selectedCategory === 'google' ? 'default' : 'outline'}
            className={`h-12 md:h-14 px-6 text-base font-semibold rounded-xl shadow-md transition-all ${
              selectedCategory === 'google'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg'
                : 'border-2 border-neutral-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            구글 비즈니스 프로필 ({FEATURES.filter(f => f.category === 'google').length})
          </Button>
        </div>
      </div>

      {/* 기능 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {filteredFeatures.map((feature) => {
          const summary = voteSummaries[feature.key];
          const wantCount = summary?.want_count || 0;
          const notNeededCount = summary?.not_needed_count || 0;
          const totalVotes = summary?.total_votes || 0;
          const userVoted = summary?.user_voted;
          const wantPercentage = totalVotes > 0 ? (wantCount / totalVotes) * 100 : 0;

          return (
            <Card
              key={feature.key}
              className={`p-5 md:p-6 shadow-lg rounded-xl transition-all duration-200 ${
                userVoted
                  ? 'bg-gradient-to-br from-neutral-50/80 to-slate-50/80 border-2 border-neutral-300 shadow-xl'
                  : 'bg-white/95 backdrop-blur-sm border-2 border-neutral-200 hover:shadow-xl hover:border-neutral-300 hover:scale-[1.01]'
              }`}
            >
              <div className="space-y-4">
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline" className={`text-xs md:text-sm font-semibold px-3 py-1 ${getCategoryColor(feature.category)}`}>
                    {getCategoryName(feature.category)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {userVoted && (
                      <div className="w-6 h-6 md:w-7 md:h-7 bg-gradient-to-br from-neutral-500 to-slate-600 rounded-lg flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-4 h-4 md:w-4.5 md:h-4.5 text-white" />
                      </div>
                    )}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shadow-md">
                      <div className="text-neutral-600">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 제목 & 설명 */}
                <div>
                  <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* 투표 현황 */}
                {totalVotes > 0 && (
                  <div className="p-3 md:p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-xl border border-neutral-200">
                    <div className="flex items-center justify-between mb-2 text-xs md:text-sm">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                        <span className="font-semibold text-neutral-700">{wantCount}명</span>
                      </div>
                      <Badge variant="secondary" className="bg-neutral-200 text-neutral-700 font-bold">
                        {totalVotes}명 참여
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-700">{notNeededCount}명</span>
                        <ThumbsDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400" />
                      </div>
                    </div>

                    {/* 프로그레스 바 */}
                    <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                        style={{ width: `${wantPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-neutral-600">
                      <span>원해요</span>
                      <span className="font-bold">{wantPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                {/* 투표 버튼 */}
                {userVoted ? (
                  <div className="px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-r from-neutral-100 to-slate-100 border-2 border-neutral-300 rounded-lg text-center">
                    <p className="text-xs md:text-sm font-semibold text-neutral-700">
                      {userVoted === 'want' ? '✅ 빨리 만들어주세요 투표함' : '❌ 별로 필요없다고 투표함'}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVote(feature.key, 'want')}
                      disabled={votingFeature === feature.key}
                      className="flex-1 h-12 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      {votingFeature === feature.key ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin mr-2" />
                      ) : (
                        <ThumbsUp className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      )}
                      빨리 만들어주세요
                    </Button>
                    <Button
                      onClick={() => handleVote(feature.key, 'not_needed')}
                      disabled={votingFeature === feature.key}
                      variant="outline"
                      className="h-12 md:h-14 w-12 md:w-14 p-0 border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-xl transition-all"
                    >
                      {votingFeature === feature.key ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 p-5 md:p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-dashed border-cyan-300 rounded-xl shadow-md text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center shadow-md">
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <p className="text-sm md:text-base text-cyan-900 font-semibold max-w-2xl">
            💡 더 추가하고 싶은 기능이 있나요?<br/>
            <span className="font-bold">"윕플로 문의하기"</span>를 통해 알려주세요!
          </p>
        </div>
      </div>
    </div>
  );
}
