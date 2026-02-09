"use client"

import { useState, useEffect } from "react"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, Save, RotateCcw, Info, Settings, Sparkles, MapPin, Sliders, FileText, ToggleLeft, MessageSquare, Badge as BadgeIcon, Store as StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { API_BASE_URL } from "@/lib/config"

interface AISettings {
  friendliness: number
  formality: number
  reply_length_min: number
  reply_length_max: number
  diversity: number
  use_text_emoticons: boolean
  mention_specifics: boolean
  brand_voice: string
  response_style: string
  custom_instructions: string
  custom_instructions_negative: string
}

const defaultSettings: AISettings = {
  friendliness: 7,
  formality: 7,
  reply_length_min: 100,
  reply_length_max: 450,
  diversity: 0.9,
  use_text_emoticons: true,
  mention_specifics: true,
  brand_voice: "warm",
  response_style: "quick_thanks",
  custom_instructions: "",
  custom_instructions_negative: ""
}

export default function AISettingsPage() {
  const { stores, hasStores, isLoading: storesLoading } = useStores()
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [settings, setSettings] = useState<AISettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 매장 변경 시 설정 불러오기
  useEffect(() => {
    if (selectedStoreId) {
      loadSettings()
    } else {
      setSettings(defaultSettings)
    }
  }, [selectedStoreId])

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-settings/${selectedStoreId}`)
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || defaultSettings)
      } else if (response.status === 404) {
        // 설정이 없으면 기본값 사용
        setSettings(defaultSettings)
      } else {
        throw new Error("설정을 불러올 수 없습니다")
      }
    } catch (err: any) {
      console.error("설정 로드 실패:", err)
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!selectedStoreId) {
      setError("매장을 선택해주세요")
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-settings/${selectedStoreId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error("설정 저장 실패")
      }

      setSuccessMessage("✅ AI 답글 설정이 저장되었습니다!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || "설정 저장 중 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefault = () => {
    setSettings(defaultSettings)
    setSuccessMessage("기본 설정으로 초기화되었습니다")
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20">
      {/* 헤더 */}
      <div className="mb-8 md:mb-12 text-center">
        <div className="flex justify-center mb-4 md:mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-3 md:mb-4 leading-tight">
          AI 답글 설정
        </h1>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto mb-4">
          매장별로 AI 답글 생성 스타일을 세밀하게 커스터마이징하세요
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs md:text-sm px-3 py-1">
            <Settings className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
            매장별 독립 관리
          </Badge>
          <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-300 text-xs md:text-sm px-3 py-1">
            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
            즉시 반영
          </Badge>
        </div>
      </div>

      {/* 성공/오류 메시지 */}
      {successMessage && (
        <div className="mb-6 p-4 md:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl shadow-md">
          <p className="text-sm md:text-base text-emerald-800 font-semibold text-center">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 md:p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-md">
          <p className="text-sm md:text-base text-red-800 font-semibold text-center">{error}</p>
        </div>
      )}

      {/* 매장 선택 */}
      <Card className="p-5 md:p-7 shadow-lg border-2 border-emerald-200/50 rounded-xl bg-white/95 backdrop-blur-sm">
        <div className="space-y-5">
          <div>
            <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              매장 선택
            </Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all">
                {selectedStoreId && stores.find(s => s.id === selectedStoreId) ? (
                  <div className="flex items-center gap-2.5">
                    {(stores.find(s => s.id === selectedStoreId) as any)?.thumbnail ? (
                      <img src={(stores.find(s => s.id === selectedStoreId) as any).thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <StoreIcon className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <span className="truncate">{stores.find(s => s.id === selectedStoreId)?.store_name || (stores.find(s => s.id === selectedStoreId) as any)?.name || '매장'}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="AI 답글 설정을 적용할 매장을 선택하세요" />
                )}
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      {(store as any).thumbnail ? (
                        <img src={(store as any).thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <StoreIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <span className="truncate">{store.store_name || (store as any).name || '매장'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetToDefault} 
              variant="outline" 
              disabled={!selectedStoreId}
              className="w-full sm:flex-1 h-12 md:h-14 text-base font-semibold border-2 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-xl transition-all"
            >
              <RotateCcw className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              기본값으로 초기화
            </Button>
            <Button 
              onClick={saveSettings} 
              disabled={!selectedStoreId || isSaving}
              className="w-full sm:flex-1 h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  설정 저장
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* 설정 영역 */}
      {selectedStoreId && !isLoading && (
        <div className="space-y-5 md:space-y-6 mt-6">
          {/* 기본 스타일 */}
          <Card className="p-5 md:p-7 shadow-lg border-2 border-emerald-200/50 rounded-xl bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-md">
                <Sliders className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">기본 스타일</h2>
            </div>
            
            <div className="space-y-5 md:space-y-6">
              {/* 친절함 */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-xl border border-emerald-200/30">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
                    친절함 정도
                  </Label>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-300 font-bold">
                    {settings.friendliness}/10
                  </Badge>
                </div>
                <Slider
                  value={[settings.friendliness]}
                  onValueChange={([val]) => setSettings({...settings, friendliness: val})}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs md:text-sm text-neutral-600 mt-2">
                  1: 간결함 / 10: 매우 친절함
                </p>
              </div>

              {/* 격식 */}
              <div className="p-4 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 rounded-xl border border-teal-200/30">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">2</span>
                    격식 수준
                  </Label>
                  <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-300 font-bold">
                    {settings.formality}/10
                  </Badge>
                </div>
                <Slider
                  value={[settings.formality]}
                  onValueChange={([val]) => setSettings({...settings, formality: val})}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs md:text-sm text-neutral-600 mt-2">
                  1: 반말/편한 톤 / 10: 격식 있는 존댓말
                </p>
              </div>

              {/* 브랜드 톤 */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-xl border border-emerald-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">3</span>
                  브랜드 톤
                </Label>
                <Select 
                  value={settings.brand_voice} 
                  onValueChange={(val) => setSettings({...settings, brand_voice: val})}
                >
                  <SelectTrigger className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warm">따뜻한 (Warm)</SelectItem>
                    <SelectItem value="professional">전문적 (Professional)</SelectItem>
                    <SelectItem value="casual">캐주얼 (Casual)</SelectItem>
                    <SelectItem value="friendly">친근한 (Friendly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 응답 스타일 */}
              <div className="p-4 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 rounded-xl border border-teal-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">4</span>
                  응답 스타일
                </Label>
                <Select 
                  value={settings.response_style} 
                  onValueChange={(val) => setSettings({...settings, response_style: val})}
                >
                  <SelectTrigger className="h-12 md:h-14 text-base border-2 border-teal-100 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 rounded-xl transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick_thanks">빠른 감사 (Quick Thanks)</SelectItem>
                    <SelectItem value="empathy">공감 중심 (Empathy)</SelectItem>
                    <SelectItem value="solution">해결책 제시 (Solution)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* 답글 길이 & 다양성 */}
          <Card className="p-5 md:p-7 shadow-lg border-2 border-purple-200/50 rounded-xl bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">답글 길이 & 다양성</h2>
            </div>
            
            <div className="space-y-5 md:space-y-6">
              {/* 최소 길이 */}
              <div className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">5</span>
                  최소 답글 길이
                </Label>
                <Input
                  type="number"
                  value={settings.reply_length_min}
                  onChange={(e) => setSettings({...settings, reply_length_min: parseInt(e.target.value) || 50})}
                  min={50}
                  max={1200}
                  className="h-12 md:h-14 text-base border-2 border-purple-100 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 rounded-xl transition-all"
                />
                <p className="text-xs md:text-sm text-neutral-600 mt-2">50-1200자 (권장: 100자)</p>
              </div>

              {/* 최대 길이 */}
              <div className="p-4 bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-xl border border-pink-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">6</span>
                  최대 답글 길이
                </Label>
                <Input
                  type="number"
                  value={settings.reply_length_max}
                  onChange={(e) => setSettings({...settings, reply_length_max: parseInt(e.target.value) || 450})}
                  min={50}
                  max={1200}
                  className="h-12 md:h-14 text-base border-2 border-pink-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl transition-all"
                />
                <p className="text-xs md:text-sm text-neutral-600 mt-2">50-1200자 (권장: 450자)</p>
              </div>

              {/* 다양성 */}
              <div className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/30">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">7</span>
                    다양성 (Temperature)
                  </Label>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 font-bold">
                    {settings.diversity.toFixed(1)}
                  </Badge>
                </div>
                <Slider
                  value={[settings.diversity * 10]}
                  onValueChange={([val]) => setSettings({...settings, diversity: val / 10})}
                  min={5}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs md:text-sm text-neutral-600 mt-2">
                  낮음: 일관된 답글 / 높음: 다양한 표현
                </p>
              </div>
            </div>
          </Card>

          {/* 세부 옵션 */}
          <Card className="p-5 md:p-7 shadow-lg border-2 border-blue-200/50 rounded-xl bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center shadow-md">
                <ToggleLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">세부 옵션</h2>
            </div>
            
            <div className="space-y-4">
              {/* 텍스트 이모티콘 */}
              <div className="flex items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-200/30">
                <div className="flex-1">
                  <Label className="flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">8</span>
                    텍스트 이모티콘 사용
                  </Label>
                  <p className="text-xs md:text-sm text-neutral-600 mt-1 ml-8">^^, ㅎㅎ, ~~ 등의 표현 포함</p>
                </div>
                <Switch
                  checked={settings.use_text_emoticons}
                  onCheckedChange={(val) => setSettings({...settings, use_text_emoticons: val})}
                  className="flex-shrink-0"
                />
              </div>

              {/* 리뷰 구체 내용 언급 */}
              <div className="flex items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-200/30">
                <div className="flex-1">
                  <Label className="flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">9</span>
                    리뷰 구체 내용 언급
                  </Label>
                  <p className="text-xs md:text-sm text-neutral-600 mt-1 ml-8">고객이 언급한 메뉴, 서비스 등 구체적 반영</p>
                </div>
                <Switch
                  checked={settings.mention_specifics}
                  onCheckedChange={(val) => setSettings({...settings, mention_specifics: val})}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          </Card>

          {/* 추가 지시사항 */}
          <Card className="p-5 md:p-7 shadow-lg border-2 border-orange-200/50 rounded-xl bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-red-400 rounded-xl flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">추가 지시사항</h2>
            </div>
            
            <div className="space-y-5">
              {/* 일반 리뷰 */}
              <div className="p-4 bg-gradient-to-r from-orange-50/50 to-amber-50/50 rounded-xl border border-orange-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">10</span>
                  일반 리뷰 (긍정적/중립적) 지시사항
                </Label>
                <Textarea
                  value={settings.custom_instructions}
                  onChange={(e) => setSettings({...settings, custom_instructions: e.target.value})}
                  placeholder="예: '항상 매장 이름을 언급해주세요', '프로모션 안내를 포함해주세요', '방문 감사 인사를 꼭 넣어주세요' 등"
                  rows={4}
                  className="resize-none text-base border-2 border-orange-100 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 rounded-xl transition-all"
                />
              </div>

              {/* 부정 리뷰 */}
              <div className="p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 rounded-xl border border-red-200/30">
                <Label className="mb-3 flex items-center gap-2 text-sm md:text-base font-semibold text-neutral-800">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">11</span>
                  부정 리뷰 지시사항
                </Label>
                <Textarea
                  value={settings.custom_instructions_negative}
                  onChange={(e) => setSettings({...settings, custom_instructions_negative: e.target.value})}
                  placeholder="예: '사과와 함께 개선 약속을 포함해주세요', '보상 방안을 제시해주세요', '고객 불편 공감을 먼저 표현해주세요' 등"
                  rows={4}
                  className="resize-none text-base border-2 border-red-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 rounded-xl transition-all"
                />
              </div>
            </div>
          </Card>

          {/* 안내 */}
          <div className="p-5 md:p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-dashed border-cyan-300 rounded-xl shadow-md">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Info className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-base md:text-lg font-bold text-cyan-900 mb-3">💡 설정 안내</p>
                <ul className="space-y-2 text-sm md:text-base text-cyan-800">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold mt-0.5">•</span>
                    <span>설정은 <strong>매장별로 독립적</strong>으로 관리됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold mt-0.5">•</span>
                    <span>저장 후 <strong>즉시 AI 답글 생성</strong>에 반영됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold mt-0.5">•</span>
                    <span>설정을 변경하지 않으면 <strong>기본값</strong>이 사용됩니다</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {selectedStoreId && isLoading && (
        <div className="flex flex-col items-center justify-center py-16 md:py-20">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-white" />
          </div>
          <p className="text-base md:text-lg font-semibold text-neutral-700">설정을 불러오는 중...</p>
          <p className="text-sm md:text-base text-neutral-500 mt-1">잠시만 기다려주세요</p>
        </div>
      )}
    </div>
  )
}
