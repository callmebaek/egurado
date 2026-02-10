"use client";

import { useState } from "react";
import { Check, X, Sparkles, TrendingUp, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const tiers = [
    {
      name: "Free",
      tier: "free",
      price: 0,
      credits: 100,
      stores: 1,
      keywords: 1,
      autoCollection: 0,
      description: "플레이스 관리를 처음 시작하는 분",
      badge: null,
      features: [
        { name: "플레이스 진단", included: true },
        { name: "순위조회 (수동)", included: true },
        { name: "타겟키워드 추출", included: false },
        { name: "리뷰 분석", included: false },
        { name: "AI 리뷰답글", included: false },
        { name: "자동수집", included: false },
      ],
      cta: "무료로 시작하기",
      popular: false,
      icon: Sparkles,
    },
    {
      name: "Basic",
      tier: "basic",
      price: 24900,
      credits: 600,
      stores: 1,
      keywords: 3,
      autoCollection: 3,
      description: "플레이스를 본격적으로 관리하는 분",
      badge: null,
      features: [
        { name: "Free 기능 전부", included: true },
        { name: "타겟키워드 추출", included: true },
        { name: "리뷰 분석", included: true },
        { name: "AI 리뷰답글", included: true },
        { name: "경쟁매장 분석", included: true },
        { name: "자동수집 (3개 키워드)", included: true },
      ],
      cta: "구독하기",
      popular: false,
      icon: TrendingUp,
    },
    {
      name: "Basic+",
      tier: "basic_plus",
      price: 37900,
      credits: 1500,
      stores: 2,
      keywords: 8,
      autoCollection: 8,
      description: "여러 매장을 체계적으로 관리하는 분",
      badge: "인기",
      features: [
        { name: "Basic 기능 전부", included: true },
        { name: "크레딧 1,500", included: true },
        { name: "매장 2개", included: true },
        { name: "자동수집 (8개 키워드)", included: true },
        { name: "우선 고객 지원", included: true },
      ],
      cta: "구독하기",
      popular: true,
      icon: Zap,
    },
    {
      name: "Pro",
      tier: "pro",
      price: 69900,
      credits: 3500,
      stores: 5,
      keywords: 20,
      autoCollection: 20,
      description: "파워 유저 및 다점포 관리자",
      badge: null,
      features: [
        { name: "Basic+ 기능 전부", included: true },
        { name: "크레딧 3,500", included: true },
        { name: "매장 5개", included: true },
        { name: "자동수집 (20개 키워드)", included: true },
        { name: "전담 계정 매니저", included: true },
        { name: "API 접근 (추후)", included: true },
      ],
      cta: "구독하기",
      popular: false,
      icon: Crown,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            당신에게 맞는 플랜을 선택하세요
          </h1>
          <p className="text-xl text-gray-600">
            네이버 플레이스 순위 관리를 더 쉽고 효율적으로
          </p>
          
          {/* Pricing Highlight */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              지금 가입하면 무료 100 크레딧을 매달 제공합니다!
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.tier}
                className={`relative flex flex-col ${
                  tier.popular
                    ? "border-2 border-blue-500 shadow-2xl scale-105"
                    : "border-gray-200"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-4 py-1">
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                    <Icon className="h-8 w-8" />
                  </div>
                  
                  <CardTitle className="text-2xl font-bold">
                    {tier.name}
                  </CardTitle>
                  
                  <CardDescription className="text-sm min-h-[40px]">
                    {tier.description}
                  </CardDescription>

                  <div className="mt-4">
                    {tier.price === 0 ? (
                      <div className="text-3xl font-bold text-gray-900">
                        무료
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-gray-900">
                          ₩{tier.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">/월</div>
                      </>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    월 {tier.credits.toLocaleString()} 크레딧
                  </div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      포함 사항:
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>매장 {tier.stores}개</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>키워드 {tier.keywords}개</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tier.autoCollection > 0 ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span>자동수집 {tier.autoCollection}개</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-gray-300" />
                            <span className="text-gray-400">자동수집 불가</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      {tier.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm py-1"
                        >
                          {feature.included ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          )}
                          <span
                            className={
                              feature.included ? "text-gray-700" : "text-gray-400"
                            }
                          >
                            {feature.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        : ""
                    }`}
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => {
                      if (tier.price === 0) {
                        window.location.href = "/signup"
                      } else {
                        window.location.href = "/dashboard/membership"
                      }
                    }}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            자주 묻는 질문
          </h2>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">크레딧이란 무엇인가요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  크레딧은 WHIPLACE의 기능을 사용하기 위한 포인트입니다. 각 기능마다 사용되는 크레딧이 다르며, 
                  순위조회, 리뷰 분석, AI 답글 등에 크레딧이 소모됩니다. 월 구독 크레딧은 매달 리셋되며, 
                  수동 충전 크레딧은 이월됩니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  자동수집이란 무엇인가요?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  자동수집은 설정한 키워드의 순위를 매일 자동으로 체크해주는 기능입니다. 
                  매일 직접 확인하지 않아도 순위 변동을 추적할 수 있어 효율적입니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">구독 해지는 어떻게 하나요?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  대시보드의 멤버십 관리 페이지에서 언제든지 구독을 해지할 수 있습니다. 
                  해지 후에도 결제 주기가 끝날 때까지 기존 플랜의 모든 혜택을 이용하실 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Tier 업그레이드는 어떻게 하나요?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  대시보드에서 언제든지 Tier를 업그레이드하실 수 있습니다. 
                  업그레이드 시 즉시 적용되며, 크레딧도 바로 충전됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
            <CardHeader>
              <CardTitle className="text-3xl">
                지금 바로 시작하세요
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                신용카드 없이 무료로 시작할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6"
                onClick={() => (window.location.href = "/signup")}
              >
                무료로 시작하기
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
