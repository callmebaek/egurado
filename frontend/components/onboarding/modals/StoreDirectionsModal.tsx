"use client"

import { useState, useEffect } from 'react'
import {
  Copy,
  Sparkles,
  Store as StoreIcon,
  MapPin,
  Navigation,
  CheckCircle2,
  Plus,
  X,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'
import OnboardingModal from './OnboardingModal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StoreDirectionsModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  thumbnail?: string
}

export default function StoreDirectionsModal({ isOpen, onClose, onComplete }: StoreDirectionsModalProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarks, setLandmarks] = useState<string[]>([])
  const [directionsDescription, setDirectionsDescription] = useState('')
  
  // 임시 입력값
  const [tempInput, setTempInput] = useState('')
  
  // 생성 결과
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores()
    }
  }, [isOpen, currentStep])

  // 키워드 추가
  const addKeyword = (array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (tempInput.trim()) {
      setter([...array, tempInput.trim()])
      setTempInput('')
    }
  }

  // 키워드 제거
  const removeKeyword = (index: number, array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(array.filter((_, i) => i !== index))
  }

  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      })

      if (!response.ok) throw new Error('매장 목록 조회 실패')

      const data = await response.json()
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || []
      setStores(naverStores)
    } catch (err) {
      console.error('매장 로드 오류:', err)
    } finally {
      setLoadingStores(false)
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1 && currentStep !== 5) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleNext = () => {
    setError('')
    
    // Step 1: 매장 선택
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요')
        return
      }
      setCurrentStep(2)
      return
    }
    
    // Step 2: 지역 키워드
    if (currentStep === 2) {
      if (!regionKeyword.trim()) {
        setError('지역 키워드를 입력해주세요')
        return
      }
      setCurrentStep(3)
      return
    }
    
    // Step 3: 랜드마크 (선택사항)
    if (currentStep === 3) {
      setCurrentStep(4)
      return
    }
    
    // Step 4: 찾아오는길 설명
    if (currentStep === 4) {
      if (!directionsDescription.trim()) {
        setError('찾아오는길 설명을 입력해주세요')
        return
      }
      handleGenerate()
      return
    }
    
    // Step 6: 완료
    if (currentStep === 6) {
      handleClose()
      return
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setCurrentStep(5) // 생성 중 단계
    
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch(api.naver.generateDirections(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStore!.id,
          region_keyword: regionKeyword,
          landmark_keywords: landmarks,
          directions_description: directionsDescription,
        })
      })

      if (!response.ok) throw new Error('생성 실패')

      const data = await response.json()
      setGeneratedText(data.generated_text)

      toast({
        title: "✅ 생성 완료",
        description: "찾아오는길이 성공적으로 생성되었습니다!",
      })
      
      setCurrentStep(6) // 완료 단계
      
      // 완료 마킹
      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      console.error("Error generating directions:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: error.message || "찾아오는길 생성에 실패했습니다.",
      })
      setCurrentStep(4) // 입력 단계로 돌아가기
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText)
    toast({
      title: "✅ 복사 완료",
      description: "클립보드에 복사되었습니다!",
    })
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedStore(null)
    setRegionKeyword('')
    setLandmarks([])
    setDirectionsDescription('')
    setTempInput('')
    setGeneratedText('')
    setError('')
    onClose()
  }

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 찾아오는길을 만들까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          AI가 고객이 쉽게 찾을 수 있는 안내문을 작성해드려요
        </p>
      </div>

      {loadingStores ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : stores.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>등록된 매장이 없습니다</AlertTitle>
          <AlertDescription>먼저 네이버 플레이스 매장을 등록해주세요</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
          {stores.map((store) => (
            <Card
              key={store.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-card-hover",
                selectedStore?.id === store.id
                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                  : "border-neutral-200 hover:border-primary-300"
              )}
              onClick={() => setSelectedStore(store)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  {store.thumbnail ? (
                    <img 
                      src={store.thumbnail} 
                      alt={store.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <StoreIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-bold text-neutral-900 truncate">{store.name}</p>
                    <p className="text-xs text-neutral-500">네이버 플레이스</p>
                  </div>
                  {selectedStore?.id === store.id && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  // Step 2: 지역 키워드
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          매장이 위치한 메인 지역을 알려주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          가장 대표적인 지역 키워드 1개만 입력해주세요
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-4 md:p-5">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">지역 키워드</p>
          </div>
          <Input
            type="text"
            placeholder="예: 합정, 종로, 성수"
            value={regionKeyword}
            onChange={(e) => setRegionKeyword(e.target.value)}
            className="h-12 md:h-14 text-base"
          />
        </CardContent>
      </Card>

      <Alert variant="info" className="p-3 md:p-4">
        <AlertTitle className="text-sm md:text-base font-bold">💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          고객이 검색할 때 가장 많이 사용하는 지역명을 입력하세요
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  // Step 3: 랜드마크
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          근처에 유명한 장소나 역이 있나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          고객이 쉽게 찾을 수 있는 랜드마크를 알려주세요 (선택사항)
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-4 md:p-5">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">랜드마크 키워드</p>
            <Badge variant="secondary" className="text-xs">선택</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="예: 합정역"
              value={tempInput}
              onChange={(e) => setTempInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addKeyword(landmarks, setLandmarks)
                }
              }}
              className="flex-1 h-12 md:h-14 text-base"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0"
              onClick={() => addKeyword(landmarks, setLandmarks)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          
          {/* 추가된 키워드 목록 */}
          {landmarks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {landmarks.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs md:text-sm px-3 py-1.5 gap-1"
                >
                  {keyword}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-error"
                    onClick={() => removeKeyword(index, landmarks, setLandmarks)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert variant="info" className="p-3 md:p-4">
        <AlertTitle className="text-sm md:text-base font-bold">💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          지하철역, 유명 건물, 상권 이름 등을 입력하면 좋아요
        </AlertDescription>
      </Alert>
    </div>
  )

  // Step 4: 찾아오는길 설명
  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          매장까지 오는 길을 자세히 설명해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          출구 번호, 걷는 시간, 주변 건물, 주차 정보 등을 포함해주세요
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-4 md:p-5">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">찾아오는길 설명</p>
          </div>
          <Textarea
            placeholder="예: 합정역 7번 출구에서 직진 200m, GS25 편의점 옆 건물 2층입니다. 주차는 건물 지하 1층에 가능하며, 방문 시 건물 입구에서 연락주시면 안내해드립니다."
            value={directionsDescription}
            onChange={(e) => setDirectionsDescription(e.target.value)}
            rows={6}
            className="resize-none text-base"
          />
        </CardContent>
      </Card>

      <Alert variant="info" className="p-3 md:p-4">
        <AlertTitle className="text-sm md:text-base font-bold">💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          자세하게 입력할수록 고객이 매장을 더 쉽게 찾을 수 있어요!
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  // Step 5: 생성 중
  const renderStep5 = () => (
    <div className="text-center py-8 md:py-10 space-y-4 md:space-y-5">
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          완벽한 찾아오는길을 만들고 있어요
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          AI가 고객이 쉽게 이해할 수 있는 안내문을 작성중입니다...
        </p>
      </div>

      <Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin text-emerald-600 mx-auto" />
      
      <p className="text-xs text-neutral-500">
        보통 10~15초 정도 소요됩니다
      </p>
    </div>
  )

  // Step 6: 완료
  const renderStep6 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          완성되었어요! 🎉
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          생성된 찾아오는길을 복사해서 사용하세요
        </p>
      </div>

      {/* AI 생성 콘텐츠 주의사항 */}
      <Alert variant="warning" className="p-3 md:p-4">
        <AlertTitle className="text-sm md:text-base font-bold">⚠️ 꼭 확인해주세요</AlertTitle>
        <AlertDescription className="text-xs md:text-sm leading-relaxed">
          AI가 작성한 콘텐츠는 입력하신 정보를 기반으로 자동 생성되었습니다. 
          사실과 다르거나 부정확한 내용이 포함될 수 있으니, <strong>반드시 검토 후 수정하여 사용</strong>해주시기 바랍니다.
        </AlertDescription>
      </Alert>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900">생성된 찾아오는길 ({generatedText.length}자)</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4 mr-1" />
              복사
            </Button>
          </div>
          <div className="border-t border-neutral-200" />
          <div className="bg-white border border-neutral-200 rounded-lg p-3 md:p-4 max-h-[200px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-neutral-700">
              {generatedText}
            </p>
          </div>
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 mr-2" />
            클립보드에 복사하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      case 5:
        return renderStep5()
      case 6:
        return renderStep6()
      default:
        return null
    }
  }

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="찾아오는길 생성"
      icon={MapPin}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 4 ? 'AI로 생성하기' : 
        currentStep === 6 ? '완료' : 
        '다음'
      }
      nextButtonDisabled={
        isGenerating || 
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 2 && !regionKeyword.trim()) ||
        (currentStep === 4 && !directionsDescription.trim())
      }
      showBackButton={currentStep > 1 && currentStep < 5}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  )
}
