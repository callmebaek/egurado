'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import StepCard from './StepCard';
import ActionItem from './ActionItem';
import { ONBOARDING_STEPS, OnboardingProgress, OnboardingPreferences, ACTION_KEYS } from './types';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import StoreRegisterModal from './modals/StoreRegisterModal';
import PlaceAuditModal from './modals/PlaceAuditModal';
import TargetKeywordsModal from './modals/TargetKeywordsModal';
import { RankTrackingModal } from './modals/RankTrackingModal';
import RankAlertsModal from './modals/RankAlertsModal';
import StoreDescriptionModal from './modals/StoreDescriptionModal';
import StoreDirectionsModal from './modals/StoreDirectionsModal';
import ReviewAnalysisModal from './modals/ReviewAnalysisModal';
import AdditionalKeywordsModal from './modals/AdditionalKeywordsModal';
import PlaceActivationModal from './modals/PlaceActivationModal';
import MainKeywordsModal from './modals/MainKeywordsModal';
import ContactModal from './modals/ContactModal';
import CompetitorAnalysisModal from './modals/CompetitorAnalysisModal';
import FeatureVoteModal from './modals/FeatureVoteModal';
import AIReviewReplyModal from './modals/AIReviewReplyModal';
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
  const [showRankAlertsModal, setShowRankAlertsModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showReviewAnalysisModal, setShowReviewAnalysisModal] = useState(false);
  const [showAdditionalKeywordsModal, setShowAdditionalKeywordsModal] = useState(false);
  const [showPlaceActivationModal, setShowPlaceActivationModal] = useState(false);
  const [showMainKeywordsModal, setShowMainKeywordsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCompetitorAnalysisModal, setShowCompetitorAnalysisModal] = useState(false);
  const [showFeatureVoteModal, setShowFeatureVoteModal] = useState(false);
  const [showAIReviewReplyModal, setShowAIReviewReplyModal] = useState(false);
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
          cache: "no-store",
        });
        
        if (response.ok) {
          const data = await response.json();
          setProgress(data.progress || {});
          setIsCollapsed(data.is_collapsed || false);
          
          // localStorage 체크: 투표 완료 여부
          const voteCompleted = localStorage.getItem('feature_vote_completed');
          if (voteCompleted === 'true' && !data.progress[ACTION_KEYS.FEATURE_VOTING]?.completed) {
            // 백엔드에 반영되지 않았지만 localStorage에 완료 표시가 있으면 자동 완료 처리
            markActionComplete(ACTION_KEYS.FEATURE_VOTING);
          }
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
        setShowRankAlertsModal(true);
        break;
        
      case ACTION_KEYS.REVIEW_ANALYSIS:
        console.log('[OnboardingSection] 리뷰 분석 모달 열기');
        setShowReviewAnalysisModal(true);
        break;
        
      case ACTION_KEYS.REVIEW_REPLY_AI:
        setShowAIReviewReplyModal(true);
        break;
        
      case ACTION_KEYS.REVIEW_REPLY_AI_OLD:
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
        setShowCompetitorAnalysisModal(true);
        break;
        
      case ACTION_KEYS.FEATURE_VOTING:
        setShowFeatureVoteModal(true);
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
        setShowContactModal(true);
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
      {/* 시작하기 섹션 - TurboTax 스타일 */}
      <div className="bg-white rounded-card border border-neutral-300 shadow-card overflow-hidden mb-6">
        {/* 헤더 - Compact */}
        <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 p-2.5 md:p-3">
          <div className="flex items-center justify-between flex-wrap gap-3 w-full overflow-x-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <h3 className="text-lg md:text-xl font-bold text-emerald-900 leading-tight truncate">
                {isCollapsed ? '빠른 시작 가이드' : '시작하기'}
              </h3>
            </div>
            <button
              onClick={toggleCollapse}
              className="px-3 py-1.5 bg-white text-emerald-600 font-bold rounded-button border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:shadow-md active:scale-95 transition-all duration-200 text-xs md:text-sm flex items-center gap-1.5 min-h-[44px] flex-shrink-0"
            >
              {isCollapsed ? (
                <>
                  <span>펼치기</span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                </>
              ) : (
                <>
                  <span>접어두기</span>
                  <ChevronUp className="w-3 h-3 md:w-4 md:h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 단계별 카드 */}
        {!isCollapsed && (
          <div className="p-3 md:p-4 lg:p-6 overflow-x-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
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
        isOpen={showRankTrackingModal}
        onClose={() => setShowRankTrackingModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.METRICS_TRACKING)}
      />

      <RankAlertsModal
        isOpen={showRankAlertsModal}
        onClose={() => setShowRankAlertsModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.RANK_ALERTS)}
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
        isOpen={showMainKeywordsModal}
        onClose={() => setShowMainKeywordsModal(false)}
        onComplete={() => markActionComplete(selectedAction || '')}
      />

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.CONTACT_WHIPLACE)}
      />

      <CompetitorAnalysisModal
        isOpen={showCompetitorAnalysisModal}
        onClose={() => setShowCompetitorAnalysisModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.COMPETITOR_ANALYSIS)}
      />

      <FeatureVoteModal
        isOpen={showFeatureVoteModal}
        onClose={() => setShowFeatureVoteModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.FEATURE_VOTING)}
      />

      <AIReviewReplyModal
        isOpen={showAIReviewReplyModal}
        onClose={() => setShowAIReviewReplyModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.REVIEW_REPLY_AI)}
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
