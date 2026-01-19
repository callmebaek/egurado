"use client"

import { useState, useEffect } from "react"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, Save, RotateCcw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          AI 답글 설정
        </h1>
        <p className="text-muted-foreground">
          매장별로 AI 답글 생성 스타일을 커스터마이징할 수 있습니다.
        </p>
      </div>

      {/* 성공/오류 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 매장 선택 */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="mb-2 block">매장 선택</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="매장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.store_name || (store as any).name || '매장'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 self-end">
            <Button onClick={resetToDefault} variant="outline" disabled={!selectedStoreId}>
              <RotateCcw className="mr-2 h-4 w-4" />
              초기화
            </Button>
            <Button onClick={saveSettings} disabled={!selectedStoreId || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* 설정 영역 */}
      {selectedStoreId && !isLoading && (
        <div className="space-y-6">
          {/* 기본 스타일 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">기본 스타일</h2>
            
            <div className="space-y-6">
              {/* 친절함 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>친절함 정도</Label>
                  <span className="text-sm font-medium">{settings.friendliness}/10</span>
                </div>
                <Slider
                  value={[settings.friendliness]}
                  onValueChange={([val]) => setSettings({...settings, friendliness: val})}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1: 간결함, 10: 매우 친절함
                </p>
              </div>

              {/* 격식 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>격식 수준</Label>
                  <span className="text-sm font-medium">{settings.formality}/10</span>
                </div>
                <Slider
                  value={[settings.formality]}
                  onValueChange={([val]) => setSettings({...settings, formality: val})}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1: 반말/편한 톤, 10: 격식 있는 존댓말
                </p>
              </div>

              {/* 브랜드 톤 */}
              <div>
                <Label className="mb-2 block">브랜드 톤</Label>
                <Select 
                  value={settings.brand_voice} 
                  onValueChange={(val) => setSettings({...settings, brand_voice: val})}
                >
                  <SelectTrigger>
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
              <div>
                <Label className="mb-2 block">응답 스타일</Label>
                <Select 
                  value={settings.response_style} 
                  onValueChange={(val) => setSettings({...settings, response_style: val})}
                >
                  <SelectTrigger>
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
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">답글 길이 & 다양성</h2>
            
            <div className="space-y-6">
              {/* 최소 길이 */}
              <div>
                <Label className="mb-2 block">최소 답글 길이</Label>
                <Input
                  type="number"
                  value={settings.reply_length_min}
                  onChange={(e) => setSettings({...settings, reply_length_min: parseInt(e.target.value) || 50})}
                  min={50}
                  max={1200}
                />
                <p className="text-xs text-muted-foreground mt-1">50-1200자</p>
              </div>

              {/* 최대 길이 */}
              <div>
                <Label className="mb-2 block">최대 답글 길이</Label>
                <Input
                  type="number"
                  value={settings.reply_length_max}
                  onChange={(e) => setSettings({...settings, reply_length_max: parseInt(e.target.value) || 450})}
                  min={50}
                  max={1200}
                />
                <p className="text-xs text-muted-foreground mt-1">50-1200자</p>
              </div>

              {/* 다양성 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>다양성 (Temperature)</Label>
                  <span className="text-sm font-medium">{settings.diversity.toFixed(1)}</span>
                </div>
                <Slider
                  value={[settings.diversity * 10]}
                  onValueChange={([val]) => setSettings({...settings, diversity: val / 10})}
                  min={5}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  낮음: 일관된 답글, 높음: 다양한 표현
                </p>
              </div>
            </div>
          </Card>

          {/* 세부 옵션 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">세부 옵션</h2>
            
            <div className="space-y-4">
              {/* 텍스트 이모티콘 */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>텍스트 이모티콘 사용</Label>
                  <p className="text-sm text-muted-foreground">^^, ㅎㅎ, ~~ 등</p>
                </div>
                <Switch
                  checked={settings.use_text_emoticons}
                  onCheckedChange={(val) => setSettings({...settings, use_text_emoticons: val})}
                />
              </div>

              {/* 리뷰 구체 내용 언급 */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>리뷰 구체 내용 언급</Label>
                  <p className="text-sm text-muted-foreground">고객이 언급한 메뉴, 서비스 등 구체적 반영</p>
                </div>
                <Switch
                  checked={settings.mention_specifics}
                  onCheckedChange={(val) => setSettings({...settings, mention_specifics: val})}
                />
              </div>
            </div>
          </Card>

          {/* 추가 지시사항 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">추가 지시사항</h2>
            
            <div className="space-y-4">
              {/* 일반 리뷰 */}
              <div>
                <Label className="mb-2 block">일반 리뷰 (긍정적/중립적) 지시사항</Label>
                <Textarea
                  value={settings.custom_instructions}
                  onChange={(e) => setSettings({...settings, custom_instructions: e.target.value})}
                  placeholder="예: '항상 매장 이름을 언급해주세요', '프로모션 안내를 포함해주세요' 등"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* 부정 리뷰 */}
              <div>
                <Label className="mb-2 block">부정 리뷰 지시사항</Label>
                <Textarea
                  value={settings.custom_instructions_negative}
                  onChange={(e) => setSettings({...settings, custom_instructions_negative: e.target.value})}
                  placeholder="예: '사과와 함께 개선 약속을 포함해주세요', '보상 방안을 제시해주세요' 등"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </Card>

          {/* 안내 */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">💡 설정 안내</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>설정은 매장별로 독립적으로 관리됩니다</li>
                  <li>저장 후 즉시 AI 답글 생성에 반영됩니다</li>
                  <li>설정을 변경하지 않으면 기본값이 사용됩니다</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {selectedStoreId && isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
