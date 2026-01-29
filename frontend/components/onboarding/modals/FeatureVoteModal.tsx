'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Paper,
  Group,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import { 
  Vote, 
  Sparkles,
  TrendingUp,
  Users,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeatureVoteModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function FeatureVoteModal({
  opened,
  onClose,
  onComplete,
}: FeatureVoteModalProps) {
  const router = useRouter();

  // 페이지 포커스 시 투표 완료 여부 체크
  useEffect(() => {
    const handleFocus = () => {
      if (opened) {
        const voteCompleted = localStorage.getItem('feature_vote_completed');
        if (voteCompleted === 'true' && onComplete) {
          onComplete();
          onClose();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [opened, onComplete, onClose]);

  const handleGoToVote = () => {
    // 투표 페이지로 이동
    router.push('/dashboard/feature-vote');
    onClose();
  };

  const handleClose = () => {
    // 투표 완료 여부 체크
    const voteCompleted = localStorage.getItem('feature_vote_completed');
    if (voteCompleted === 'true' && onComplete) {
      onComplete();
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="lg"
      centered
      withCloseButton={false}
      styles={{
        header: {
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }
      }}
    >
      <Stack gap="xl" p="md">
        {/* 아이콘 및 제목 */}
        <div style={{ textAlign: 'center' }}>
          <ThemeIcon
            size={80}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            mb="xl"
            mx="auto"
          >
            <Vote size={40} />
          </ThemeIcon>
          
          <Text size="28px" fw={700} mb="sm">
            더 나은 서비스를 위한<br />여정에 함께해주세요
          </Text>
          
          <Text size="16px" c="dimmed" mb="xl">
            여러분의 목소리가 윕플레이스를 만듭니다
          </Text>
        </div>

        {/* 메인 메시지 카드 */}
        <Paper withBorder p="xl" radius="md" bg="#f9fafb">
          <Stack gap="lg">
            <div>
              <Group gap="sm" mb="md">
                <ThemeIcon size={32} radius="md" color="brand" variant="light">
                  <Sparkles size={20} />
                </ThemeIcon>
                <Text fw={600} size="md" c="brand">윕플레이스의 약속</Text>
              </Group>
              
              <Stack gap="md">
                <Paper p="md" radius="md" withBorder bg="white">
                  <Group gap="sm" align="flex-start">
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: '#635bff',
                      marginTop: '8px'
                    }} />
                    <Text size="sm" style={{ flex: 1, lineHeight: 1.6 }}>
                      <strong>지속적인 검증과 개선</strong> - 모든 기능을 철저히 검증하고 사용자가 편리하게 이용할 수 있도록 끊임없이 개선합니다
                    </Text>
                  </Group>
                </Paper>

                <Paper p="md" radius="md" withBorder bg="white">
                  <Group gap="sm" align="flex-start">
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: '#635bff',
                      marginTop: '8px'
                    }} />
                    <Text size="sm" style={{ flex: 1, lineHeight: 1.6 }}>
                      <strong>새로운 기능 추가</strong> - 안주하지 않고 계속해서 새로운 기능을 개발하여 더 나은 서비스로 발전합니다
                    </Text>
                  </Group>
                </Paper>

                <Paper p="md" radius="md" withBorder bg="white">
                  <Group gap="sm" align="flex-start">
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: '#635bff',
                      marginTop: '8px'
                    }} />
                    <Text size="sm" style={{ flex: 1, lineHeight: 1.6 }}>
                      <strong>사용자 중심 개발</strong> - 여러분의 의견이 개발 우선순위를 결정합니다
                    </Text>
                  </Group>
                </Paper>
              </Stack>
            </div>
          </Stack>
        </Paper>

        {/* 참여 안내 */}
        <Alert color="grape" variant="light">
          <Group gap="sm">
            <Users size={20} />
            <Text size="sm" fw={500}>
              💡 투표를 통해 원하는 기능의 우선순위를 결정하고, 더 빠르게 만나보세요!
            </Text>
          </Group>
        </Alert>

        {/* 투표 참여 혜택 */}
        <Paper p="md" radius="md" withBorder style={{ borderColor: '#ffc078', backgroundColor: '#fff9e6' }}>
          <Group gap="sm" align="flex-start">
            <Lightbulb size={20} color="#fd7e14" style={{ flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                참여하면 좋은 점
              </Text>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                • 원하는 기능을 빠르게 사용할 수 있어요<br />
                • 개발 진행 상황을 실시간으로 확인할 수 있어요<br />
                • 베타 기능을 가장 먼저 체험할 수 있어요
              </Text>
            </Stack>
          </Group>
        </Paper>

        {/* 버튼 */}
        <Group justify="space-between" mt="md">
          <Button 
            variant="light" 
            color="gray"
            onClick={handleClose}
          >
            나중에 하기
          </Button>
          
          <Button
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            onClick={handleGoToVote}
            rightSection={<ArrowRight size={16} />}
            style={{ minWidth: 180 }}
          >
            개발 중인 리스트 보러가기
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
