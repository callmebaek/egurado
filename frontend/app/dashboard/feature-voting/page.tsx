'use client';

/**
 * 신규 기능 투표 페이지
 * 사용자들이 원하는 기능에 투표할 수 있는 페이지
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  ThemeIcon,
  Grid,
  Alert,
  Loader,
  Center,
} from '@mantine/core';
import {
  Vote,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ArrowLeft,
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
  Users,
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';

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
    icon: <BarChart3 size={20} />,
  },
  {
    key: 'naver-index-analysis',
    name: '지수 분석 및 전략',
    description: '주요 KPI현황을 토대로 이동평균 및 경쟁사 분석등을 통해 분석 후 이에 맞는 전략을 수립합니다.',
    category: 'naver',
    icon: <TrendingUp size={20} />,
  },
  {
    key: 'naver-search-ad-analysis',
    name: '검색광고 분석',
    description: '검색광고를 통해 진행하고 있는 캠페인들의 일/주/월 단위로 분석하여 결과를 도출합니다. 해당 분석결과는 앞으로 검색광고 운영에 즉각 참고할 수 있는 핵심적인 기능입니다.',
    category: 'naver',
    icon: <Search size={20} />,
  },
  {
    key: 'naver-notice',
    name: '네이버 공지',
    description: '네이버 플레이스 관련 최신 공지사항과 업데이트 내용을 실시간으로 확인할 수 있는 기능입니다.',
    category: 'naver',
    icon: <Bell size={20} />,
  },

  // 카카오 비즈니스
  {
    key: 'kakao-business-diagnosis',
    name: 'K사 비즈니스 매장진단',
    description: '카카오 비즈니스 매장의 현재 상태를 종합적으로 진단하고 개선점을 제시합니다.',
    category: 'kakao',
    icon: <Star size={20} />,
  },
  {
    key: 'kakao-review-management',
    name: 'K사 리뷰관리',
    description: '카카오맵 리뷰를 효율적으로 관리하고 분석할 수 있는 기능입니다.',
    category: 'kakao',
    icon: <MessageSquare size={20} />,
  },
  {
    key: 'kakao-map-rank',
    name: 'K사 맵 순위조회',
    description: '카카오맵에서 키워드별 매장 순위를 조회하고 추적할 수 있습니다.',
    category: 'kakao',
    icon: <MapPin size={20} />,
  },
  {
    key: 'kakao-metrics',
    name: 'K사 주요지표관리',
    description: '카카오 비즈니스의 핵심 지표들을 자동으로 수집하고 추적합니다.',
    category: 'kakao',
    icon: <BarChart3 size={20} />,
  },

  // 구글 비즈니스 프로필
  {
    key: 'google-review-analysis',
    name: 'GBP 리뷰 통계/현황 분석',
    description: 'Google Business Profile의 리뷰 분석을 통해 고객들의 언어별 분포, 리뷰온도, 리뷰 추이를 확인합니다.',
    category: 'google',
    icon: <MessageSquare size={20} />,
  },
  {
    key: 'google-ai-reply',
    name: 'GBP AI 리뷰답글 달기',
    description: '리뷰 답글을 AI 답글을 통해 손쉽게 올릴 수 있는 기능입니다.',
    category: 'google',
    icon: <Sparkles size={20} />,
  },
  {
    key: 'google-gbp-diagnosis',
    name: 'GBP 진단',
    description: '현재 GBP 업체정보가 로컬 노출과 키워드에 맞게 구성되었는지 진단합니다.',
    category: 'google',
    icon: <Star size={20} />,
  },
  {
    key: 'google-map-rank',
    name: 'G사 맵 순위조회',
    description: '키워드 및 지역별 구글맵에서 순위를 알려주는 기능입니다.',
    category: 'google',
    icon: <MapPin size={20} />,
  },
  {
    key: 'google-citation-boost',
    name: 'Citation Boost',
    description: 'Local citation을 쉽게 도와주는 기능입니다. 지역 비즈니스의 온라인 가시성을 높입니다.',
    category: 'google',
    icon: <Award size={20} />,
  },
  {
    key: 'google-keyword-volume',
    name: '구글 키워드 검색량 조회',
    description: '구글에서 언어별, 국가별 키워드 검색량을 알려주는 기능입니다.',
    category: 'google',
    icon: <Globe size={20} />,
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
        return 'green';
      case 'kakao':
        return 'yellow';
      case 'google':
        return 'blue';
      default:
        return 'gray';
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
      <Center style={{ minHeight: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="brand" />
          <Text c="dimmed">투표 현황을 불러오는 중...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Container size="xl" px="md" py="xl" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <Paper shadow="sm" p="xl" mb="xl" style={{ borderLeft: '6px solid #635bff' }}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Vote size={32} color="#635bff" />
              <Title order={1} style={{ color: '#212529' }}>
                추가 기능 요청
              </Title>
            </Group>
            <Text size="lg" c="dimmed">
              원하는 기능에 투표하고 개발 우선순위를 결정하세요
            </Text>
          </div>
          <Button variant="outline" color="gray" leftSection={<ArrowLeft size={16} />} onClick={handleGoBack}>
            대시보드로
          </Button>
        </Group>
      </Paper>

      {/* 투표 현황 */}
      {totalUserVotes > 0 && (
        <Alert color="green" mb="xl" icon={<CheckCircle2 size={20} />}>
          <Text size="sm" fw={600}>
            🎉 감사합니다! {totalUserVotes}개 기능에 투표하셨습니다
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            투표한 기능의 개발이 완료되면 가장 먼저 알려드릴게요
          </Text>
        </Alert>
      )}

      {/* 안내 */}
      <Paper p="md" radius="md" withBorder mb="xl" style={{ borderColor: '#ffc078', backgroundColor: '#fff9e6' }}>
        <Group gap="sm" align="flex-start">
          <Lightbulb size={20} color="#fd7e14" style={{ flexShrink: 0, marginTop: 2 }} />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Text size="sm" fw={600}>
              투표 참여 안내
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
              • 원하는 기능에 투표하면 해당 기능의 개발 우선순위가 높아집니다
              <br />
              • 각 기능당 1번만 투표할 수 있습니다
              <br />• 투표 결과는 실시간으로 모든 사용자에게 공개됩니다
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* 카테고리 필터 */}
      <Group gap="sm" mb="xl">
        <Button
          onClick={() => setSelectedCategory('all')}
          variant={selectedCategory === 'all' ? 'filled' : 'light'}
          color="brand"
        >
          전체
        </Button>
        <Button
          onClick={() => setSelectedCategory('naver')}
          variant={selectedCategory === 'naver' ? 'filled' : 'light'}
          color="green"
        >
          네이버 플레이스
        </Button>
        <Button
          onClick={() => setSelectedCategory('kakao')}
          variant={selectedCategory === 'kakao' ? 'filled' : 'light'}
          color="yellow"
        >
          카카오 비즈니스
        </Button>
        <Button
          onClick={() => setSelectedCategory('google')}
          variant={selectedCategory === 'google' ? 'filled' : 'light'}
          color="blue"
        >
          구글 비즈니스 프로필
        </Button>
      </Group>

      {/* 기능 목록 */}
      <Grid gutter="md">
        {filteredFeatures.map((feature) => {
          const summary = voteSummaries[feature.key];
          const wantCount = summary?.want_count || 0;
          const notNeededCount = summary?.not_needed_count || 0;
          const totalVotes = summary?.total_votes || 0;
          const userVoted = summary?.user_voted;
          const wantPercentage = totalVotes > 0 ? (wantCount / totalVotes) * 100 : 0;

          return (
            <Grid.Col key={feature.key} span={{ base: 12, md: 6 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{
                  height: '100%',
                  border: userVoted ? '2px solid #635bff' : '1px solid #e0e7ff',
                  background: userVoted ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <Stack gap="md">
                  {/* 헤더 */}
                  <Group justify="space-between">
                    <Badge color={getCategoryColor(feature.category)} variant="light" size="sm">
                      {getCategoryName(feature.category)}
                    </Badge>
                    <ThemeIcon size={32} radius="md" variant="light" color={getCategoryColor(feature.category)}>
                      {feature.icon}
                    </ThemeIcon>
                  </Group>

                  {/* 제목 */}
                  <div>
                    <Group gap="sm" mb="xs">
                      <Text fw={700} size="lg">
                        {feature.name}
                      </Text>
                      {userVoted && (
                        <ThemeIcon size={24} radius="xl" color="brand">
                          <CheckCircle2 size={16} />
                        </ThemeIcon>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                      {feature.description}
                    </Text>
                  </div>

                  {/* 투표 현황 */}
                  {totalVotes > 0 && (
                    <div>
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <ThumbsUp size={14} color="#51cf66" />
                          <Text size="xs" c="dimmed">
                            {wantCount}명
                          </Text>
                        </Group>
                        <Text size="xs" fw={600} c="dimmed">
                          {totalVotes}명 참여
                        </Text>
                        <Group gap="xs">
                          <ThumbsDown size={14} color="#adb5bd" />
                          <Text size="xs" c="dimmed">
                            {notNeededCount}명
                          </Text>
                        </Group>
                      </Group>

                      {/* 프로그레스 바 */}
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${wantPercentage}%`,
                            height: '100%',
                            background: 'linear-gradient(to right, #51cf66, #40c057)',
                            transition: 'width 0.5s',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 투표 버튼 */}
                  {userVoted ? (
                    <Paper p="md" radius="md" withBorder style={{ borderColor: '#635bff', backgroundColor: '#f0f4ff' }}>
                      <Group justify="center" gap="xs">
                        <CheckCircle2 size={18} color="#635bff" />
                        <Text size="sm" fw={600} c="brand">
                          {userVoted === 'want' ? '빨리 만들어주세요 투표함' : '별로 필요없다고 투표함'}
                        </Text>
                      </Group>
                    </Paper>
                  ) : (
                    <Group gap="xs">
                      <Button
                        flex={1}
                        onClick={() => handleVote(feature.key, 'want')}
                        disabled={votingFeature === feature.key}
                        loading={votingFeature === feature.key}
                        leftSection={<ThumbsUp size={16} />}
                        variant="gradient"
                        gradient={{ from: 'green', to: 'teal', deg: 135 }}
                      >
                        빨리 만들어주세요
                      </Button>
                      <Button
                        onClick={() => handleVote(feature.key, 'not_needed')}
                        disabled={votingFeature === feature.key}
                        loading={votingFeature === feature.key}
                        variant="light"
                        color="gray"
                      >
                        <ThumbsDown size={16} />
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>

      {/* Footer */}
      <Paper p="md" mt="xl" style={{ backgroundColor: '#f8f9fa', textAlign: 'center' }}>
        <Text size="xs" c="dimmed">
          💡 더 추가하고 싶은 기능이 있나요? "윕플로 문의하기"를 통해 알려주세요!
        </Text>
      </Paper>
    </Container>
  );
}
