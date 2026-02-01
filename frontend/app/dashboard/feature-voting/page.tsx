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
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin text-primary-500" />
          <p className="text-sm md:text-base text-neutral-600">투표 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen bg-neutral-50">
      {/* 헤더 - TurboTax Style */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1.5 leading-tight">
              추가 기능 요청
            </h1>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              원하는 기능에 투표하고 개발 우선순위를 결정하세요
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="ml-4 h-10 md:h-11"
          >
            대시보드로
          </Button>
        </div>
      </div>

      {/* 투표 완료 알림 */}
      {totalUserVotes > 0 && (
        <Alert className="mb-6 md:mb-8 bg-success-bg border-success">
          <CheckCircle2 className="w-5 h-5 text-success" />
          <AlertTitle className="text-sm md:text-base font-bold text-success-dark">
            🎉 감사합니다! {totalUserVotes}개 기능에 투표하셨습니다
          </AlertTitle>
          <AlertDescription className="text-xs md:text-sm text-success-dark mt-1">
            투표한 기능의 개발이 완료되면 가장 먼저 알려드릴게요
          </AlertDescription>
        </Alert>
      )}

      {/* 안내 */}
      <Card className="mb-6 md:mb-8 bg-warning-bg border-warning">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-2">투표 참여 안내</p>
              <ul className="text-xs md:text-sm text-neutral-700 space-y-1 leading-relaxed">
                <li>• 원하는 기능에 투표하면 해당 기능의 개발 우선순위가 높아집니다</li>
                <li>• 각 기능당 1번만 투표할 수 있습니다</li>
                <li>• 투표 결과는 실시간으로 모든 사용자에게 공개됩니다</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
        <Button
          onClick={() => setSelectedCategory('all')}
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className={`h-10 md:h-11 ${selectedCategory === 'all' ? 'bg-primary-500 hover:bg-primary-600 text-white' : ''}`}
        >
          전체
        </Button>
        <Button
          onClick={() => setSelectedCategory('naver')}
          variant={selectedCategory === 'naver' ? 'default' : 'outline'}
          className={`h-10 md:h-11 ${getCategoryButtonColor('naver', selectedCategory === 'naver')}`}
        >
          네이버 플레이스
        </Button>
        <Button
          onClick={() => setSelectedCategory('kakao')}
          variant={selectedCategory === 'kakao' ? 'default' : 'outline'}
          className={`h-10 md:h-11 ${getCategoryButtonColor('kakao', selectedCategory === 'kakao')}`}
        >
          카카오 비즈니스
        </Button>
        <Button
          onClick={() => setSelectedCategory('google')}
          variant={selectedCategory === 'google' ? 'default' : 'outline'}
          className={`h-10 md:h-11 ${getCategoryButtonColor('google', selectedCategory === 'google')}`}
        >
          구글 비즈니스 프로필
        </Button>
      </div>

      {/* 기능 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
              className={`rounded-card shadow-card transition-all duration-200 ${
                userVoted
                  ? 'bg-primary-50 border-2 border-primary-300'
                  : 'border-neutral-300 hover:shadow-card-hover hover:border-primary-200'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(feature.category)}`}>
                    {getCategoryName(feature.category)}
                  </Badge>
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                    {feature.icon}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CardTitle className="text-base md:text-lg font-bold text-neutral-900 leading-tight flex-1">
                    {feature.name}
                  </CardTitle>
                  {userVoted && (
                    <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  )}
                </div>
                <CardDescription className="text-xs md:text-sm text-neutral-600 leading-relaxed mt-2">
                  {feature.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                {/* 투표 현황 */}
                {totalVotes > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs text-neutral-600">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-success" />
                        <span>{wantCount}명</span>
                      </div>
                      <span className="font-bold">{totalVotes}명 참여</span>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-neutral-400" />
                        <span>{notNeededCount}명</span>
                      </div>
                    </div>

                    {/* 프로그레스 바 */}
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-success to-green-500 transition-all duration-500"
                        style={{ width: `${wantPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 투표 버튼 */}
                {userVoted ? (
                  <div className="bg-primary-100 border border-primary-300 rounded-lg p-3 text-center">
                    <p className="text-sm font-bold text-primary-700">
                      {userVoted === 'want' ? '✅ 빨리 만들어주세요 투표함' : '❌ 별로 필요없다고 투표함'}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVote(feature.key, 'want')}
                      disabled={votingFeature === feature.key}
                      className="flex-1 h-11 md:h-10 bg-gradient-to-r from-success to-green-500 hover:from-green-600 hover:to-green-600 text-white font-bold"
                    >
                      {votingFeature === feature.key ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsUp className="w-4 h-4 mr-2" />
                      )}
                      빨리 만들어주세요
                    </Button>
                    <Button
                      onClick={() => handleVote(feature.key, 'not_needed')}
                      disabled={votingFeature === feature.key}
                      variant="outline"
                      className="h-11 md:h-10 w-11 md:w-10 p-0 border-neutral-300"
                    >
                      {votingFeature === feature.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <Card className="mt-6 md:mt-8 bg-neutral-100 border-neutral-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-neutral-600">
            💡 더 추가하고 싶은 기능이 있나요? "윕플로 문의하기"를 통해 알려주세요!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
