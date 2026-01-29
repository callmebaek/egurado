'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import StepCard from './StepCard';
import ActionItem from './ActionItem';
import { ONBOARDING_STEPS, OnboardingProgress, OnboardingPreferences, ACTION_KEYS } from './types';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import StoreRegisterModal from './modals/StoreRegisterModal';
import PlaceAuditModal from './modals/PlaceAuditModal';
import TargetKeywordsModal from './modals/TargetKeywordsModal';
import { RankTrackingModal } from './modals/RankTrackingModal';
import StoreDescriptionModal from './modals/StoreDescriptionModal';
import StoreDirectionsModal from './modals/StoreDirectionsModal';
import ReviewAnalysisModal from './modals/ReviewAnalysisModal';
import AdditionalKeywordsModal from './modals/AdditionalKeywordsModal';
import PlaceActivationModal from './modals/PlaceActivationModal';
import MainKeywordsModal from './modals/MainKeywordsModal';
import GenericActionModal from './modals/GenericActionModal';

interface OnboardingSectionProps {
  onStoreRegistered?: () => void;
}

export default function OnboardingSection({ onStoreRegistered }: OnboardingSectionProps) {
  const { user, getToken } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  // 모달 상태
  const [showStoreRegisterModal, setShowStoreRegisterModal] = useState(false);
  const [showPlaceAuditModal, setShowPlaceAuditModal] = useState(false);
  const [showTargetKeywordsModal, setShowTargetKeywordsModal] = useState(false);
  const [showRankTrackingModal, setShowRankTrackingModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showReviewAnalysisModal, setShowReviewAnalysisModal] = useState(false);
  const [showAdditionalKeywordsModal, setShowAdditionalKeywordsModal] = useState(false);
  const [showPlaceActivationModal, setShowPlaceActivationModal] = useState(false);
  const [showMainKeywordsModal, setShowMainKeywordsModal] = useState(false);
  const [genericModalConfig, setGenericModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    pageUrl?: string;
    pageLabel?: string;
    actionKey: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionKey: '',
  });

  // 진행 상태 로드
  useEffect(() => {
    if (!user) return;
    
    const loadProgress = async () => {
      try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(api.onboarding.progress(), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProgress(data.progress || {});
          setIsCollapsed(data.is_collapsed || false);
        }
      } catch (error) {
        console.error('[Onboarding] 진행 상태 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [user, getToken]);

  // 접어두기 토글
  const toggleCollapse = async () => {
    const newCollapsed = !isCollapsed;
    
    // 즉시 UI 업데이트
    setIsCollapsed(newCollapsed);
    
    try {
      const token = getToken();
      if (!token) return;
      
      await fetch(api.onboarding.preferences(), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_collapsed: newCollapsed }),
      });
    } catch (error) {
      console.error('[Onboarding] 접어두기 상태 업데이트 실패:', error);
      // 에러 발생 시 롤백
      setIsCollapsed(!newCollapsed);
    }
  };

  // 액션 클릭 핸들러
  const handleActionClick = (actionKey: string) => {
    setSelectedAction(actionKey);
    
    // 액션에 따라 해당 모달 오픈
    switch (actionKey) {
      case ACTION_KEYS.STORE_REGISTER:
        setShowStoreRegisterModal(true);
        break;
        
      case ACTION_KEYS.PLACE_DIAGNOSIS:
        setShowPlaceAuditModal(true);
        break;
        
      case ACTION_KEYS.TARGET_KEYWORDS:
        setShowTargetKeywordsModal(true);
        break;
        
      case ACTION_KEYS.METRICS_TRACKING:
        setShowRankTrackingModal(true);
        break;
        
      case ACTION_KEYS.RANK_ALERTS:
        setGenericModalConfig({
          isOpen: true,
          title: '순위추적 알림설정하기',
          description: '키워드 순위 변동 시 알림을 받으세요.',
          pageUrl: '/dashboard/naver/rank-check',
          pageLabel: '순위조회 페이지로 이동',
          actionKey,
        });
        break;
        
      case ACTION_KEYS.REVIEW_ANALYSIS:
        console.log('[OnboardingSection] 리뷰 분석 모달 열기');
        setShowReviewAnalysisModal(true);
        break;
        
      case ACTION_KEYS.REVIEW_REPLY_AI:
        setGenericModalConfig({
          isOpen: true,
          title: 'AI로 리뷰답글달기',
          description: 'AI가 생성한 답글로 리뷰에 빠르게 응답하세요.',
          pageUrl: '/dashboard/naver/review-stats',
          pageLabel: '리뷰 현황 페이지로 이동',
          actionKey,
        });
        break;
        
      case ACTION_KEYS.PLACE_ACTIVATION_CHECK:
        setShowPlaceActivationModal(true);
        break;
        
      case ACTION_KEYS.COMPETITOR_ANALYSIS:
        setGenericModalConfig({
          isOpen: true,
          title: '경쟁업체 분석하기',
          description: '경쟁 매장과 내 매장을 비교 분석하세요.',
          pageUrl: '/dashboard/naver/competitor-analysis',
          pageLabel: '경쟁업체 분석 페이지로 이동',
          actionKey,
        });
        break;
        
      case ACTION_KEYS.MAIN_KEYWORDS:
      case ACTION_KEYS.MAIN_KEYWORDS_REC:
        setShowMainKeywordsModal(true);
        break;
        
      case ACTION_KEYS.FEATURE_VOTING:
        setGenericModalConfig({
          isOpen: true,
          title: '추가 기능 요청 투표하기',
          description: '원하는 신규 기능에 투표하고 개발 우선순위에 영향을 주세요.',
          pageUrl: '/dashboard/feature-voting',
          pageLabel: '기능 투표 페이지로 이동',
          actionKey,
        });
        break;
        
      case ACTION_KEYS.KEYWORD_DISCOVERY:
        setShowAdditionalKeywordsModal(true);
        break;
        
      case ACTION_KEYS.METRICS_VIEW:
        setGenericModalConfig({
          isOpen: true,
          title: '지표현황 보기',
          description: '수집된 주요 지표 현황을 한눈에 확인하세요.',
          pageUrl: '/dashboard/naver/metric-tracker',
          pageLabel: '주요지표 추적 페이지로 이동',
          actionKey,
        });
        break;
        
      case ACTION_KEYS.INTRO_AI:
        setShowDescriptionModal(true);
        break;
        
      case ACTION_KEYS.DIRECTIONS_AI:
        setShowDirectionsModal(true);
        break;
      
      case ACTION_KEYS.REVIEW_ANALYSIS:
        console.log('🔥 리뷰 현황 분석하기 클릭됨!');
        setShowReviewAnalysisModal(true);
        break;
      
      case ACTION_KEYS.CONTACT_WHIPLACE:
        setGenericModalConfig({
          isOpen: true,
          title: '윕플에 문의하기',
          description: '이 기능은 곧 추가될 예정입니다.',
          actionKey,
        });
        break;
        
      default:
        console.log('[Onboarding] 알 수 없는 액션:', actionKey);
    }
  };

  // 액션 완료 처리
  const markActionComplete = async (actionKey: string) => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(api.onboarding.updateAction(actionKey), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      });

      if (response.ok) {
        setProgress(prev => ({
          ...prev,
          [actionKey]: { completed: true, completed_at: new Date().toISOString() },
        }));
      }
    } catch (error) {
      console.error('[Onboarding] 액션 완료 처리 실패:', error);
    }
  };

  // 로딩 중
  if (loading) {
    return null;
  }

  // 사용자가 로그인하지 않았으면 표시하지 않음
  if (!user) {
    return null;
  }

  return (
    <>
      <div className="mb-8">
        {/* 접어두기 버튼 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isCollapsed ? '빠른 시작 가이드' : '시작하기'}
          </h2>
          <button
            onClick={toggleCollapse}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <>
                <span>펼치기</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>접어두기</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* 단계별 카드 - 그룹화된 컨테이너 */}
        {!isCollapsed && (
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ONBOARDING_STEPS.map((step) => {
                const completedCount = step.actions.filter(
                  (action) => progress[action.key]?.completed
                ).length;

                return (
                  <StepCard
                    key={step.title}
                    title={step.title}
                    icon={step.icon}
                    completedCount={completedCount}
                    totalCount={step.actions.length}
                  >
                    {step.actions.map((action) => (
                      <ActionItem
                        key={action.key}
                        title={action.title}
                        completed={progress[action.key]?.completed || false}
                        onClick={() => handleActionClick(action.key)}
                      />
                    ))}
                  </StepCard>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 모달들 */}
      <StoreRegisterModal
        isOpen={showStoreRegisterModal}
        onClose={() => setShowStoreRegisterModal(false)}
        onComplete={() => {
          markActionComplete(ACTION_KEYS.STORE_REGISTER);
          // 대시보드 매장 목록 새로고침
          onStoreRegistered?.();
        }}
      />
      
      <PlaceAuditModal
        isOpen={showPlaceAuditModal}
        onClose={() => setShowPlaceAuditModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.PLACE_DIAGNOSIS)}
      />
      
      <TargetKeywordsModal
        isOpen={showTargetKeywordsModal}
        onClose={() => setShowTargetKeywordsModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.TARGET_KEYWORDS)}
      />
      
      <RankTrackingModal
        opened={showRankTrackingModal}
        onClose={() => setShowRankTrackingModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.METRICS_TRACKING)}
      />
      
      <StoreDescriptionModal
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.INTRO_AI)}
      />
      
      <StoreDirectionsModal
        isOpen={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.DIRECTIONS_AI)}
      />

      <ReviewAnalysisModal
        isOpen={showReviewAnalysisModal}
        onClose={() => setShowReviewAnalysisModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.REVIEW_ANALYSIS)}
      />

      <AdditionalKeywordsModal
        isOpen={showAdditionalKeywordsModal}
        onClose={() => setShowAdditionalKeywordsModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.KEYWORD_DISCOVERY)}
      />

      <PlaceActivationModal
        isOpen={showPlaceActivationModal}
        onClose={() => setShowPlaceActivationModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.PLACE_ACTIVATION_CHECK)}
      />

      <MainKeywordsModal
        opened={showMainKeywordsModal}
        onClose={() => setShowMainKeywordsModal(false)}
        onComplete={() => markActionComplete(selectedAction || '')}
      />

      <GenericActionModal
        isOpen={genericModalConfig.isOpen}
        onClose={() => setGenericModalConfig(prev => ({ ...prev, isOpen: false }))}
        onComplete={() => markActionComplete(genericModalConfig.actionKey)}
        title={genericModalConfig.title}
        description={genericModalConfig.description}
        pageUrl={genericModalConfig.pageUrl}
        pageLabel={genericModalConfig.pageLabel}
      />
    </>
  );
}
