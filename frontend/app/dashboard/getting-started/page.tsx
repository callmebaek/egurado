"use client"

/**
 * 시작하기 페이지 - 신규 유저 온보딩 가이드
 * 순차적으로 진행하는 단계별 액션 아이템
 * 모바일 퍼스트 반응형 디자인
 */
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import {
  CheckCircle2,
  Circle,
  Rocket,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

// 온보딩 모달 컴포넌트들
import StoreRegisterModal from "@/components/onboarding/modals/StoreRegisterModal"
import PlaceAuditModal from "@/components/onboarding/modals/PlaceAuditModal"
import TargetKeywordsModal from "@/components/onboarding/modals/TargetKeywordsModal"
import { RankTrackingModal } from "@/components/onboarding/modals/RankTrackingModal"
import RankAlertsModal from "@/components/onboarding/modals/RankAlertsModal"
import StoreDescriptionModal from "@/components/onboarding/modals/StoreDescriptionModal"
import StoreDirectionsModal from "@/components/onboarding/modals/StoreDirectionsModal"
import ReviewAnalysisModal from "@/components/onboarding/modals/ReviewAnalysisModal"
import AdditionalKeywordsModal from "@/components/onboarding/modals/AdditionalKeywordsModal"
import PlaceActivationModal from "@/components/onboarding/modals/PlaceActivationModal"
import MainKeywordsModal from "@/components/onboarding/modals/MainKeywordsModal"
import ContactModal from "@/components/onboarding/modals/ContactModal"
import CompetitorAnalysisModal from "@/components/onboarding/modals/CompetitorAnalysisModal"
import FeatureVoteModal from "@/components/onboarding/modals/FeatureVoteModal"
import AIReviewReplyModal from "@/components/onboarding/modals/AIReviewReplyModal"
import GenericActionModal from "@/components/onboarding/modals/GenericActionModal"
import { ACTION_KEYS, OnboardingProgress } from "@/components/onboarding/types"

// 단계 정의 - 순차적 번호와 설명 포함
const GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: "기본 설정",
    subtitle: "서비스 이용을 위한 필수 단계",
    description: "먼저 매장을 등록하고 기본적인 분석을 시작하세요. 이 단계를 완료하면 서비스의 핵심 기능을 사용할 수 있습니다.",
    icon: "🎯",
    color: "emerald",
    actions: [
      { 
        key: ACTION_KEYS.STORE_REGISTER, 
        title: "매장 등록하기", 
        description: "네이버 플레이스에 등록된 내 매장을 연동합니다",
        required: true,
      },
      { 
        key: ACTION_KEYS.PLACE_DIAGNOSIS, 
        title: "플레이스 진단하기",
        description: "매장의 현재 상태를 분석하여 개선점을 확인합니다",
        required: true,
      },
      { 
        key: ACTION_KEYS.TARGET_KEYWORDS, 
        title: "타겟키워드 설정하기",
        description: "내 매장에 맞는 핵심 키워드를 추출합니다",
        required: true,
      },
      { 
        key: ACTION_KEYS.METRICS_TRACKING, 
        title: "플레이스 순위 추적하기",
        description: "키워드 순위를 자동으로 추적 및 모니터링합니다",
        required: true,
      },
    ],
  },
  {
    step: 2,
    title: "매장 관리",
    subtitle: "매장 정보를 최적화하세요",
    description: "매장 소개글, 찾아오는 길 등을 AI로 최적화하고, 순위 변동 알림을 설정하세요.",
    icon: "⚙️",
    color: "blue",
    actions: [
      { 
        key: ACTION_KEYS.RANK_ALERTS, 
        title: "순위추적 알림 설정하기",
        description: "순위 변동 시 알림을 받아 빠르게 대응합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.INTRO_AI, 
        title: "업체소개글 AI로 작성하기",
        description: "AI가 매장 특성에 맞는 소개글을 생성합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.DIRECTIONS_AI, 
        title: "찾아오는 길 AI로 작성하기",
        description: "고객이 쉽게 찾아올 수 있는 길 안내를 생성합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.REVIEW_ANALYSIS, 
        title: "리뷰 현황 분석하기",
        description: "매장 리뷰를 AI로 분석하여 인사이트를 얻습니다",
        required: false,
      },
    ],
  },
  {
    step: 3,
    title: "매장 성장",
    subtitle: "매출 증대를 위한 전략을 수립하세요",
    description: "추가 키워드를 발굴하고, 활성화 점수를 확인하여 매장의 성장 가능성을 극대화하세요.",
    icon: "📈",
    color: "violet",
    actions: [
      { 
        key: ACTION_KEYS.KEYWORD_DISCOVERY, 
        title: "추가키워드 발굴하기",
        description: "경쟁력 있는 신규 키워드를 발견합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.PLACE_ACTIVATION_CHECK, 
        title: "플레이스 활성화 확인하기",
        description: "매장의 활성화 점수를 분석합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.MAIN_KEYWORDS, 
        title: "대표키워드 설정하기",
        description: "매장의 대표 키워드를 분석하고 최적화합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.CONTACT_WHIPLACE, 
        title: "윕플에 문의하기",
        description: "추가적인 도움이 필요하시면 언제든 문의하세요",
        required: false,
      },
    ],
  },
  {
    step: 4,
    title: "추천 작업",
    subtitle: "서비스를 200% 활용하세요",
    description: "경쟁업체를 분석하고, AI 리뷰 답글 기능을 활용하여 고객 관리를 자동화하세요.",
    icon: "✨",
    color: "amber",
    actions: [
      { 
        key: ACTION_KEYS.COMPETITOR_ANALYSIS, 
        title: "경쟁업체 분석하기",
        description: "주요 경쟁 매장의 전략을 분석합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.REVIEW_REPLY_AI, 
        title: "AI로 리뷰답글 달기",
        description: "AI가 적절한 리뷰 답글을 자동 생성합니다",
        required: false,
      },
      { 
        key: ACTION_KEYS.FEATURE_VOTING, 
        title: "추가 기능 요청 투표하기",
        description: "원하는 신규 기능에 투표하고 개발에 참여하세요",
        required: false,
      },
    ],
  },
]

export default function GettingStartedPage() {
  const { user, getToken } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress>({})
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [showStoreRegisterModal, setShowStoreRegisterModal] = useState(false)
  const [showPlaceAuditModal, setShowPlaceAuditModal] = useState(false)
  const [showTargetKeywordsModal, setShowTargetKeywordsModal] = useState(false)
  const [showRankTrackingModal, setShowRankTrackingModal] = useState(false)
  const [showRankAlertsModal, setShowRankAlertsModal] = useState(false)
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [showReviewAnalysisModal, setShowReviewAnalysisModal] = useState(false)
  const [showAdditionalKeywordsModal, setShowAdditionalKeywordsModal] = useState(false)
  const [showPlaceActivationModal, setShowPlaceActivationModal] = useState(false)
  const [showMainKeywordsModal, setShowMainKeywordsModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCompetitorAnalysisModal, setShowCompetitorAnalysisModal] = useState(false)
  const [showFeatureVoteModal, setShowFeatureVoteModal] = useState(false)
  const [showAIReviewReplyModal, setShowAIReviewReplyModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [genericModalConfig, setGenericModalConfig] = useState<{
    isOpen: boolean
    title: string
    description: string
    pageUrl?: string
    pageLabel?: string
    actionKey: string
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionKey: "",
  })

  // 진행 상태 로드
  useEffect(() => {
    if (!user) return

    const loadProgress = async () => {
      try {
        const token = getToken()
        if (!token) return

        const response = await fetch(api.onboarding.progress(), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setProgress(data.progress || {})

          // localStorage 체크: 투표 완료 여부
          const voteCompleted = localStorage.getItem("feature_vote_completed")
          if (
            voteCompleted === "true" &&
            !data.progress[ACTION_KEYS.FEATURE_VOTING]?.completed
          ) {
            markActionComplete(ACTION_KEYS.FEATURE_VOTING)
          }
        }
      } catch (error) {
        console.error("[GettingStarted] 진행 상태 로드 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [user, getToken])

  // 액션 클릭 핸들러
  const handleActionClick = (actionKey: string) => {
    setSelectedAction(actionKey)

    switch (actionKey) {
      case ACTION_KEYS.STORE_REGISTER:
        setShowStoreRegisterModal(true)
        break
      case ACTION_KEYS.PLACE_DIAGNOSIS:
        setShowPlaceAuditModal(true)
        break
      case ACTION_KEYS.TARGET_KEYWORDS:
        setShowTargetKeywordsModal(true)
        break
      case ACTION_KEYS.METRICS_TRACKING:
        setShowRankTrackingModal(true)
        break
      case ACTION_KEYS.RANK_ALERTS:
        setShowRankAlertsModal(true)
        break
      case ACTION_KEYS.REVIEW_ANALYSIS:
        setShowReviewAnalysisModal(true)
        break
      case ACTION_KEYS.REVIEW_REPLY_AI:
        setShowAIReviewReplyModal(true)
        break
      case ACTION_KEYS.PLACE_ACTIVATION_CHECK:
        setShowPlaceActivationModal(true)
        break
      case ACTION_KEYS.COMPETITOR_ANALYSIS:
        setShowCompetitorAnalysisModal(true)
        break
      case ACTION_KEYS.FEATURE_VOTING:
        setShowFeatureVoteModal(true)
        break
      case ACTION_KEYS.MAIN_KEYWORDS:
      case ACTION_KEYS.MAIN_KEYWORDS_REC:
        setShowMainKeywordsModal(true)
        break
      case ACTION_KEYS.KEYWORD_DISCOVERY:
        setShowAdditionalKeywordsModal(true)
        break
      case ACTION_KEYS.METRICS_VIEW:
        setGenericModalConfig({
          isOpen: true,
          title: "지표현황 보기",
          description: "수집된 주요 지표 현황을 한눈에 확인하세요.",
          pageUrl: "/dashboard/naver/metric-tracker",
          pageLabel: "주요지표 추적 페이지로 이동",
          actionKey,
        })
        break
      case ACTION_KEYS.INTRO_AI:
        setShowDescriptionModal(true)
        break
      case ACTION_KEYS.DIRECTIONS_AI:
        setShowDirectionsModal(true)
        break
      case ACTION_KEYS.CONTACT_WHIPLACE:
        setShowContactModal(true)
        break
      default:
        console.log("[GettingStarted] 알 수 없는 액션:", actionKey)
    }
  }

  // 액션 완료 처리
  const markActionComplete = async (actionKey: string) => {
    try {
      const token = getToken()
      if (!token) return
      const response = await fetch(api.onboarding.updateAction(actionKey), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      })

      if (response.ok) {
        setProgress((prev) => ({
          ...prev,
          [actionKey]: {
            completed: true,
            completed_at: new Date().toISOString(),
          },
        }))
      }
    } catch (error) {
      console.error("[GettingStarted] 액션 완료 처리 실패:", error)
    }
  }

  // 전체 진행률 계산
  const totalActions = GETTING_STARTED_STEPS.reduce(
    (sum, step) => sum + step.actions.length,
    0
  )
  const completedActions = GETTING_STARTED_STEPS.reduce(
    (sum, step) =>
      sum +
      step.actions.filter((a) => progress[a.key]?.completed).length,
    0
  )
  const overallPercentage = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0

  // 색상 매핑
  const colorMap: Record<string, {
    bg: string
    bgLight: string
    border: string
    text: string
    badge: string
    stepBg: string
    stepText: string
    progressBar: string
    actionHover: string
    iconBg: string
  }> = {
    emerald: {
      bg: "bg-emerald-600",
      bgLight: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      stepBg: "bg-emerald-600",
      stepText: "text-white",
      progressBar: "bg-emerald-500",
      actionHover: "hover:bg-emerald-50",
      iconBg: "bg-emerald-100",
    },
    blue: {
      bg: "bg-blue-600",
      bgLight: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      stepBg: "bg-blue-600",
      stepText: "text-white",
      progressBar: "bg-blue-500",
      actionHover: "hover:bg-blue-50",
      iconBg: "bg-blue-100",
    },
    violet: {
      bg: "bg-violet-600",
      bgLight: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      badge: "bg-violet-100 text-violet-700",
      stepBg: "bg-violet-600",
      stepText: "text-white",
      progressBar: "bg-violet-500",
      actionHover: "hover:bg-violet-50",
      iconBg: "bg-violet-100",
    },
    amber: {
      bg: "bg-amber-600",
      bgLight: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      stepBg: "bg-amber-600",
      stepText: "text-white",
      progressBar: "bg-amber-500",
      actionHover: "hover:bg-amber-50",
      iconBg: "bg-amber-100",
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-emerald-600 mx-auto mb-3"></div>
          <p className="text-sm text-neutral-500 font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-8 overflow-x-hidden">
      {/* 페이지 헤더 */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-200 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Rocket className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                  시작하기
                </h1>
                <p className="text-xs md:text-sm text-neutral-500 font-medium">
                  Getting Started Guide
                </p>
              </div>
            </div>
            <p className="text-sm md:text-base text-neutral-700 leading-relaxed mt-3">
              아래 단계를 <span className="font-bold text-emerald-700">순서대로</span> 진행하시면, 
              윕플의 모든 기능을 쉽고 빠르게 활용하실 수 있습니다.
              <br className="hidden md:block" />
              각 단계의 항목을 클릭하면 바로 실행할 수 있어요! 🚀
            </p>
          </div>

          {/* 전체 진행률 */}
          <div className="flex-shrink-0 bg-white rounded-xl border border-emerald-200 p-3 md:p-4 min-w-[180px] shadow-sm">
            <div className="text-center">
              <p className="text-xs text-neutral-500 font-medium mb-1">전체 진행률</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">{overallPercentage}%</p>
              <div className="w-full bg-neutral-100 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
              <p className="text-[10px] md:text-xs text-neutral-400 mt-1.5">
                {completedActions}/{totalActions} 완료
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 순서 안내 */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs md:text-sm text-neutral-600">
          <span className="font-bold text-neutral-800">Tip:</span> 1단계부터 순서대로 진행하시면 가장 효과적입니다. 
          필수 항목(🔴)을 먼저 완료해주세요.
        </p>
      </div>

      {/* 단계별 카드 */}
      <div className="space-y-4 md:space-y-5">
        {GETTING_STARTED_STEPS.map((step) => {
          const colors = colorMap[step.color]
          const stepCompleted = step.actions.filter(
            (a) => progress[a.key]?.completed
          ).length
          const stepTotal = step.actions.length
          const isStepComplete = stepCompleted === stepTotal
          const stepPercentage = stepTotal > 0 ? Math.round((stepCompleted / stepTotal) * 100) : 0

          return (
            <div
              key={step.step}
              className={`bg-white rounded-2xl border-2 ${
                isStepComplete ? "border-neutral-200 opacity-80" : colors.border
              } shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}
            >
              {/* 단계 헤더 */}
              <div className={`${colors.bgLight} px-4 md:px-6 py-3 md:py-4 border-b ${colors.border}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* 단계 번호 */}
                    <div className={`w-8 h-8 md:w-10 md:h-10 ${colors.stepBg} rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}>
                      {isStepComplete ? (
                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      ) : (
                        <span className={`text-sm md:text-base font-bold ${colors.stepText}`}>
                          {step.step}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg md:text-xl flex-shrink-0">{step.icon}</span>
                        <h2 className="text-base md:text-lg font-bold text-neutral-900 leading-tight truncate">
                          {step.title}
                        </h2>
                        <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge} flex-shrink-0`}>
                          {step.subtitle}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-neutral-600 mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* 단계 진행률 */}
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-sm md:text-base font-bold ${colors.text}`}>
                      {stepCompleted}/{stepTotal}
                    </span>
                    <div className="w-16 md:w-20 bg-white/60 rounded-full h-1.5 mt-1">
                      <div
                        className={`${colors.progressBar} h-1.5 rounded-full transition-all duration-500`}
                        style={{ width: `${stepPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 액션 아이템 리스트 */}
              <div className="p-3 md:p-4 lg:p-5">
                <div className="space-y-1.5 md:space-y-2">
                  {step.actions.map((action, actionIndex) => {
                    const isCompleted = progress[action.key]?.completed
                    return (
                      <button
                        key={action.key}
                        onClick={() => handleActionClick(action.key)}
                        className={`
                          w-full flex items-center gap-3 px-3 md:px-4 py-3 md:py-3.5 rounded-xl
                          transition-all duration-200 group
                          min-h-[52px] md:min-h-[56px] touch-manipulation
                          ${isCompleted
                            ? "bg-neutral-50 border border-neutral-100"
                            : `bg-white border border-neutral-200 ${colors.actionHover} hover:border-${step.color}-300 hover:shadow-sm active:scale-[0.99]`
                          }
                        `}
                      >
                        {/* 번호/체크 */}
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                            </div>
                          ) : (
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                              <span className={`text-xs md:text-sm font-bold ${colors.text}`}>
                                {step.step}.{actionIndex + 1}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 텍스트 */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm md:text-base font-semibold leading-tight ${
                              isCompleted ? "text-neutral-400 line-through" : "text-neutral-800"
                            }`}>
                              {action.title}
                            </p>
                            {action.required && !isCompleted && (
                              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 flex-shrink-0" title="필수 항목" />
                            )}
                          </div>
                          <p className={`text-xs md:text-sm leading-snug mt-0.5 ${
                            isCompleted ? "text-neutral-300" : "text-neutral-500"
                          }`}>
                            {action.description}
                          </p>
                        </div>

                        {/* 화살표 */}
                        {!isCompleted && (
                          <ChevronRight className={`w-4 h-4 md:w-5 md:h-5 text-neutral-300 group-hover:${colors.text} group-hover:translate-x-0.5 transition-all flex-shrink-0`} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 안내 */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 md:p-5 text-center">
        <p className="text-sm md:text-base text-neutral-600">
          모든 단계를 완료했나요? 🎉
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md min-h-[44px]"
        >
          대시보드로 이동
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 모달들 */}
      <StoreRegisterModal
        isOpen={showStoreRegisterModal}
        onClose={() => setShowStoreRegisterModal(false)}
        onComplete={() => markActionComplete(ACTION_KEYS.STORE_REGISTER)}
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
        onComplete={() => markActionComplete(selectedAction || "")}
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
        onClose={() =>
          setGenericModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
        onComplete={() => markActionComplete(genericModalConfig.actionKey)}
        title={genericModalConfig.title}
        description={genericModalConfig.description}
        pageUrl={genericModalConfig.pageUrl}
        pageLabel={genericModalConfig.pageLabel}
      />
    </div>
  )
}
