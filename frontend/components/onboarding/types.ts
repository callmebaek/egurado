/**
 * 온보딩 타입 정의
 */

export interface ActionProgress {
  completed: boolean;
  completed_at?: string;
}

export interface OnboardingProgress {
  [actionKey: string]: ActionProgress;
}

export interface OnboardingPreferences {
  is_collapsed: boolean;
  updated_at?: string;
}

export interface Action {
  key: string;
  title: string;
}

export interface Step {
  title: string;
  actions: Action[];
}

export interface ModalStepProps {
  onNext: () => void;
  onBack?: () => void;
  onComplete?: () => void;
}

// 모든 액션 키 정의
export const ACTION_KEYS = {
  // 기본설정
  STORE_REGISTER: 'basic-store-register',
  PLACE_DIAGNOSIS: 'basic-place-diagnosis',
  TARGET_KEYWORDS: 'basic-target-keywords',
  METRICS_TRACKING: 'basic-metrics-tracking',
  
  // 관리하기
  RANK_ALERTS: 'manage-rank-alerts',
  INTRO_AI: 'manage-intro-ai',
  DIRECTIONS_AI: 'manage-directions-ai',
  MAIN_KEYWORDS: 'manage-main-keywords',
  REVIEW_ANALYSIS: 'manage-review-analysis',
  METRICS_VIEW: 'manage-metrics-view',
  
  // 성장하기
  KEYWORD_DISCOVERY: 'grow-keyword-discovery',
  REVIEW_REPLY_AI: 'grow-review-reply-ai',
  PLACE_ACTIVATION: 'grow-place-activation',
  CONTACT_WHIPLACE: 'grow-contact-whiplace',
  
  // 추천작업
  COMPETITOR_ANALYSIS: 'recommend-competitor-analysis',
  MAIN_KEYWORDS_REC: 'recommend-main-keywords',
  FEATURE_VOTING: 'recommend-feature-voting',
} as const;

// 온보딩 단계 정의
export const ONBOARDING_STEPS: Step[] = [
  {
    title: '기본설정',
    actions: [
      { key: ACTION_KEYS.STORE_REGISTER, title: '매장 등록하기' },
      { key: ACTION_KEYS.PLACE_DIAGNOSIS, title: '플레이스 진단하기' },
      { key: ACTION_KEYS.TARGET_KEYWORDS, title: '타겟키워드 설정하기' },
      { key: ACTION_KEYS.METRICS_TRACKING, title: '주요지표 추적하기' },
    ],
  },
  {
    title: '관리하기',
    actions: [
      { key: ACTION_KEYS.RANK_ALERTS, title: '순위추적 알림설정하기' },
      { key: ACTION_KEYS.INTRO_AI, title: '업체소개글 ai로 작성하기' },
      { key: ACTION_KEYS.DIRECTIONS_AI, title: '찾아오는길 ai로 작성하기' },
      { key: ACTION_KEYS.MAIN_KEYWORDS, title: '대표키워드 설정하기' },
      { key: ACTION_KEYS.REVIEW_ANALYSIS, title: '리뷰 현황 분석하기' },
      { key: ACTION_KEYS.METRICS_VIEW, title: '지표현황 보기' },
    ],
  },
  {
    title: '성장하기',
    actions: [
      { key: ACTION_KEYS.KEYWORD_DISCOVERY, title: '추가키워드 발굴하기' },
      { key: ACTION_KEYS.REVIEW_REPLY_AI, title: 'ai로 리뷰답글달기' },
      { key: ACTION_KEYS.PLACE_ACTIVATION, title: '플레이스 활성화하기' },
      { key: ACTION_KEYS.CONTACT_WHIPLACE, title: '윕플에 문의하기' },
    ],
  },
  {
    title: '추천작업',
    actions: [
      { key: ACTION_KEYS.COMPETITOR_ANALYSIS, title: '경쟁업체 분석하기' },
      { key: ACTION_KEYS.MAIN_KEYWORDS_REC, title: '대표키워드 설정하기' },
      { key: ACTION_KEYS.FEATURE_VOTING, title: '추가 기능 요청 투표하기' },
    ],
  },
];
