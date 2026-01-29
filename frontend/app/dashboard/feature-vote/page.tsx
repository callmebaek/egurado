'use client';

import { useState, useEffect } from 'react';
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
  Progress,
  ThemeIcon,
  Grid,
  Alert,
} from '@mantine/core';
import {
  Vote,
  ThumbsUp,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Lightbulb,
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'planning' | 'in-progress' | 'beta';
  votes: number;
}

const SAMPLE_FEATURES: Feature[] = [
  {
    id: 'ai-review-reply',
    title: 'AI 자동 리뷰 답변',
    description: '고객 리뷰에 AI가 자동으로 적절한 답변을 작성해드립니다',
    category: '리뷰 관리',
    status: 'planning',
    votes: 0,
  },
  {
    id: 'competitor-monitoring',
    title: '경쟁사 모니터링 알림',
    description: '경쟁사의 새로운 활동을 실시간으로 알려드립니다',
    category: '경쟁 분석',
    status: 'planning',
    votes: 0,
  },
  {
    id: 'keyword-ranking-alert',
    title: '키워드 순위 변동 알림',
    description: '주요 키워드의 순위가 변동되면 즉시 알림을 받아보세요',
    category: '순위 추적',
    status: 'in-progress',
    votes: 0,
  },
  {
    id: 'content-generator',
    title: '콘텐츠 자동 생성',
    description: '블로그 포스트, 공지사항 등을 AI가 자동으로 작성해드립니다',
    category: 'AI 콘텐츠',
    status: 'planning',
    votes: 0,
  },
  {
    id: 'multi-store-dashboard',
    title: '다중 매장 통합 대시보드',
    description: '여러 매장의 데이터를 한 눈에 비교하고 관리하세요',
    category: '대시보드',
    status: 'planning',
    votes: 0,
  },
  {
    id: 'custom-report',
    title: '커스텀 리포트 생성',
    description: '원하는 항목만 선택하여 맞춤형 리포트를 만들어보세요',
    category: '리포트',
    status: 'beta',
    votes: 0,
  },
];

export default function FeatureVotePage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>(SAMPLE_FEATURES);
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());

  // localStorage에서 투표 내역 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('feature_votes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVotedFeatures(new Set(parsed));
      } catch (error) {
        console.error('투표 내역 로드 실패:', error);
      }
    }
  }, []);

  const handleVote = (featureId: string) => {
    const newVoted = new Set(votedFeatures);
    
    if (newVoted.has(featureId)) {
      // 이미 투표한 경우 취소
      newVoted.delete(featureId);
    } else {
      // 새로 투표
      newVoted.add(featureId);
    }
    
    setVotedFeatures(newVoted);
    
    // localStorage에 저장
    localStorage.setItem('feature_votes', JSON.stringify([...newVoted]));
    
    // 1개 이상 투표 시 완료 처리
    if (newVoted.size >= 1) {
      localStorage.setItem('feature_vote_completed', 'true');
    }
    
    // votes 업데이트 (UI 피드백용)
    setFeatures(features.map(f => 
      f.id === featureId 
        ? { ...f, votes: newVoted.has(featureId) ? f.votes + 1 : f.votes - 1 }
        : f
    ));
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  const getStatusBadge = (status: Feature['status']) => {
    switch (status) {
      case 'planning':
        return <Badge color="gray" size="sm">기획 중</Badge>;
      case 'in-progress':
        return <Badge color="blue" size="sm">개발 중</Badge>;
      case 'beta':
        return <Badge color="green" size="sm">베타 테스트</Badge>;
    }
  };

  return (
    <Container size="xl" px="md" py="xl" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* 헤더 */}
      <Paper shadow="sm" p="xl" mb="xl" style={{ borderLeft: '6px solid #635bff' }}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Vote size={32} color="#635bff" />
              <Title order={1} style={{ color: '#212529' }}>추가 기능 요청</Title>
            </Group>
            <Text size="lg" c="dimmed">
              원하는 기능에 투표하고 개발 우선순위를 결정하세요
            </Text>
          </div>
          <Button
            variant="outline"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            onClick={handleGoBack}
          >
            대시보드로
          </Button>
        </Group>
      </Paper>

      {/* 투표 현황 */}
      {votedFeatures.size > 0 && (
        <Alert color="green" mb="xl" icon={<CheckCircle2 size={20} />}>
          <Text size="sm" fw={600}>
            🎉 감사합니다! {votedFeatures.size}개 기능에 투표하셨습니다
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
              • 원하는 기능에 투표하면 해당 기능의 개발 우선순위가 높아집니다<br />
              • 여러 개의 기능에 투표할 수 있습니다<br />
              • 언제든지 투표를 변경할 수 있습니다
            </Text>
          </Stack>
        </Group>
      </Paper>

      {/* 기능 목록 */}
      <Grid gutter="md">
        {features.map((feature) => {
          const isVoted = votedFeatures.has(feature.id);
          
          return (
            <Grid.Col key={feature.id} span={{ base: 12, md: 6 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{
                  height: '100%',
                  cursor: 'pointer',
                  border: isVoted ? '2px solid #635bff' : '1px solid #e0e7ff',
                  background: isVoted ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleVote(feature.id)}
              >
                <Stack gap="md">
                  {/* 헤더 */}
                  <Group justify="space-between">
                    <Badge color="violet" variant="light" size="sm">
                      {feature.category}
                    </Badge>
                    {getStatusBadge(feature.status)}
                  </Group>

                  {/* 제목 */}
                  <div>
                    <Group gap="sm" mb="xs">
                      <Text fw={700} size="lg">{feature.title}</Text>
                      {isVoted && (
                        <ThemeIcon size={24} radius="xl" color="brand">
                          <CheckCircle2 size={16} />
                        </ThemeIcon>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                      {feature.description}
                    </Text>
                  </div>

                  {/* 투표 버튼 */}
                  <Button
                    variant={isVoted ? 'filled' : 'light'}
                    color="brand"
                    fullWidth
                    leftSection={<ThumbsUp size={16} />}
                  >
                    {isVoted ? '투표 완료' : '이 기능에 투표'}
                  </Button>
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
