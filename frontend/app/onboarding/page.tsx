"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// 동적 렌더링 강제 (localStorage 사용)
export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // 온보딩 데이터
  const [userPosition, setUserPosition] = useState<string>("")
  const [marketingExperience, setMarketingExperience] = useState<string>("")
  const [agencyExperience, setAgencyExperience] = useState<string>("")

  const handleNext = () => {
    if (step === 1 && !userPosition) {
      toast({
        variant: "destructive",
        title: "선택 필요",
        description: "포지션을 선택해주세요.",
      })
      return
    }

    if (step === 2 && !marketingExperience) {
      toast({
        variant: "destructive",
        title: "선택 필요",
        description: "마케팅 경험을 선택해주세요.",
      })
      return
    }

    if (step === 3 && userPosition === "advertiser" && !agencyExperience) {
      toast({
        variant: "destructive",
        title: "선택 필요",
        description: "대행사 경험을 선택해주세요.",
      })
      return
    }

    // 대행사인 경우 step 3 건너뛰기
    if (step === 2 && userPosition === "agency") {
      handleSubmit()
      return
    }

    if (step < 3) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("로그인이 필요합니다.")
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${API_URL}/api/v1/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_position: userPosition,
          marketing_experience: marketingExperience,
          agency_experience: userPosition === "advertiser" ? agencyExperience : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "온보딩 처리에 실패했습니다.")
      }

      toast({
        title: "✅ 온보딩 완료",
        description: "WhiPlace에 오신 것을 환영합니다!",
      })

      router.push("/dashboard/getting-started")
    } catch (error: any) {
      console.error("온보딩 오류:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류 발생",
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const PositionOptions = [
    {
      value: "advertiser",
      label: "사장님 (광고주)",
      description: "직접 매장을 운영하는 사장님",
      icon: "🏪",
    },
    {
      value: "agency",
      label: "마케팅 대행사",
      description: "고객사의 마케팅을 대행하는 업체",
      icon: "💼",
    },
  ]

  const ExperienceOptions = [
    {
      value: "beginner",
      label: "초보",
      description: "네이버 플레이스 마케팅이 처음이에요",
      icon: "🌱",
    },
    {
      value: "intermediate",
      label: "중급",
      description: "어느 정도 알고 있어요",
      icon: "📈",
    },
    {
      value: "advanced",
      label: "고급",
      description: "잘 알고 있어요",
      icon: "🚀",
    },
  ]

  const AgencyExperienceOptions = [
    {
      value: "past_used",
      label: "과거에 대행사를 써본 경험이 있어요",
      icon: "📅",
    },
    {
      value: "currently_using",
      label: "현재 대행사를 통해 마케팅을 진행 중이에요",
      icon: "✅",
    },
    {
      value: "considering",
      label: "대행사를 사용할지 고민하고 있어요",
      icon: "🤔",
    },
    {
      value: "doing_alone",
      label: "마케팅을 혼자 공부하며 직접 하고 있어요",
      icon: "💪",
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {step} / {userPosition === "agency" ? 2 : 3}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round((step / (userPosition === "agency" ? 2 : 3)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(step / (userPosition === "agency" ? 2 : 3)) * 100}%`,
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">
            {step === 1 && "포지션을 선택해주세요"}
            {step === 2 && "네이버 플레이스 마케팅 경험을 알려주세요"}
            {step === 3 && "마케팅 대행사 경험을 알려주세요"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "고객님의 상황에 맞는 서비스를 제공하기 위함입니다"}
            {step === 2 && "경험 수준에 따라 맞춤 가이드를 제공합니다"}
            {step === 3 && "더 나은 서비스를 제공하기 위해 필요합니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: 포지션 선택 */}
          {step === 1 && (
            <div className="space-y-3">
              {PositionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setUserPosition(option.value)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                    userPosition === option.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{option.label}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {userPosition === option.value && (
                      <span className="text-primary text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 마케팅 경험 */}
          {step === 2 && (
            <div className="space-y-3">
              {ExperienceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMarketingExperience(option.value)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                    marketingExperience === option.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{option.label}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {marketingExperience === option.value && (
                      <span className="text-primary text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: 대행사 경험 (광고주만) */}
          {step === 3 && userPosition === "advertiser" && (
            <div className="space-y-3">
              {AgencyExperienceOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAgencyExperience(option.value)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                    agencyExperience === option.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-medium">{option.label}</h3>
                    </div>
                    {agencyExperience === option.value && (
                      <span className="text-primary text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="flex space-x-3 pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1"
              >
                이전
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : step === 3 || (step === 2 && userPosition === "agency") ? (
                "완료"
              ) : (
                "다음"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
