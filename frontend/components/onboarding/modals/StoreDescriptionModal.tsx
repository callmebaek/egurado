'use client';

import { useState, useEffect } from 'react';
import { 
  Copy, 
  Sparkles, 
  MapPin, 
  Building2, 
  Package, 
  CheckCircle2, 
  Plus, 
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/config';
import { useToast } from '@/components/ui/use-toast';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface StoreDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface RegisteredStore {
  id: string;
  name: string;
  place_id: string;
  thumbnail?: string;
  address: string;
  platform?: string;
}

export default function StoreDescriptionModal({ isOpen, onClose, onComplete }: StoreDescriptionModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('');
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [businessTypeKeyword, setBusinessTypeKeyword] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [storeFeatures, setStoreFeatures] = useState('');
  
  // 임시 입력값
  const [tempInput, setTempInput] = useState('');
  
  // 생성 결과
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

  // 키워드 추가
  const addKeyword = (array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (tempInput.trim()) {
      setter([...array, tempInput.trim()]);
      setTempInput('');
    }
  };

  // 키워드 제거
  const removeKeyword = (index: number, array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(array.filter((_, i) => i !== index));
  };

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) throw new Error('매장 목록 조회 실패');

      const data = await response.json();
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || [];
      setStores(naverStores);
    } catch (err) {
      console.error('매장 로드 오류:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleNext = () => {
    setError('');
    
    // Step 1: 매장 선택
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요');
        return;
      }
      setCurrentStep(2);
      return;
    }
    
    // Step 2: 지역 키워드
    if (currentStep === 2) {
      if (!regionKeyword.trim()) {
        setError('지역 키워드를 입력해주세요');
        return;
      }
      setCurrentStep(3);
      return;
    }
    
    // Step 3: 랜드마크 (선택사항)
    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }
    
    // Step 4: 업종
    if (currentStep === 4) {
      if (!businessTypeKeyword.trim()) {
        setError('업종을 입력해주세요');
        return;
      }
      setCurrentStep(5);
      return;
    }
    
    // Step 5: 상품/서비스 (선택사항)
    if (currentStep === 5) {
      setCurrentStep(6);
      return;
    }
    
    // Step 6: 매장 특색
    if (currentStep === 6) {
      if (!storeFeatures.trim()) {
        setError('매장의 특색을 입력해주세요');
        return;
      }
      handleGenerate();
      return;
    }
    
    // Step 8: 완료
    if (currentStep === 8) {
      handleClose();
      return;
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentStep(7); // 생성 중 단계
    
    try {
      const token = getToken();
      if (!token) throw new Error('인증이 필요합니다');

      const response = await fetch(api.naver.generateDescription(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStore!.id,
          region_keyword: regionKeyword,
          landmark_keywords: landmarks,
          business_type_keyword: businessTypeKeyword,
          product_keywords: products,
          store_features: storeFeatures
        })
      });

      if (!response.ok) throw new Error('생성 실패');

      const data = await response.json();
      setGeneratedText(data.generated_text);

      toast({
        title: "✅ 생성 완료",
        description: "업체소개글이 성공적으로 생성되었습니다!",
      });
      
      setCurrentStep(8); // 완료 단계
      
      // 완료 마킹
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: error.message || "업체소개글 생성에 실패했습니다.",
      });
      setCurrentStep(6); // 입력 단계로 돌아가기
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast({
      title: "✅ 복사 완료",
      description: "클립보드에 복사되었습니다!",
    });
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && currentStep !== 7) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setRegionKeyword('');
    setLandmarks([]);
    setBusinessTypeKeyword('');
    setProducts([]);
    setStoreFeatures('');
    setTempInput('');
    setGeneratedText('');
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 업체소개글을 만들까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          AI가 매장 특성에 맞는 완벽한 소개글을 작성해드려요
        </p>
      </div>

      <StoreSelector
        stores={stores}
        selectedStore={selectedStore}
        onSelect={setSelectedStore}
        loading={loadingStores}
        emptyMessage="등록된 네이버 플레이스 매장이 없습니다."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

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

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">지역 키워드</p>
          </div>
          <Input
            placeholder="예: 합정, 종로, 성수"
            value={regionKeyword}
            onChange={(e) => {
              setRegionKeyword(e.target.value);
              setError('');
            }}
            className={`text-base ${error ? 'border-error' : ''}`}
          />
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          동 단위나 역명보다는 더 큰 지역명이 좋아요. (예: 강남동 → 강남)
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 랜드마크
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          근처에 유명한 장소가 있나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          역, 상권, 건물, 관광지 등 (선택사항)
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">랜드마크 키워드</p>
            <Badge variant="secondary" className="text-xs">선택</Badge>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="예: 합정역"
              value={tempInput}
              onChange={(e) => setTempInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword(landmarks, setLandmarks);
                }
              }}
              className="flex-1 text-base"
            />
            <Button
              variant="outline"
              size="default"
              onClick={() => addKeyword(landmarks, setLandmarks)}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 추가된 키워드 목록 */}
          {landmarks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {landmarks.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="text-xs md:text-sm px-2.5 py-1 bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer"
                  onClick={() => removeKeyword(index, landmarks, setLandmarks)}
                >
                  {keyword}
                  <X className="w-3 h-3 ml-1.5" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          없다면 비워두고 다음으로 넘어가셔도 괜찮아요!
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 4: 업종
  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 업종인가요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          매장의 업종을 1개만 입력해주세요
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">업종</p>
          </div>
          <Input
            placeholder="예: 카페, 음식점, 헤어샵"
            value={businessTypeKeyword}
            onChange={(e) => {
              setBusinessTypeKeyword(e.target.value);
              setError('');
            }}
            className={`text-base ${error ? 'border-error' : ''}`}
          />
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          대분류보다는 구체적인 업종이 좋아요. (예: 음식점 → 일식당)
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 5: 상품/서비스
  const renderStep5 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 상품이나 서비스를 제공하나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          대표 메뉴, 상품, 서비스 등 (선택사항)
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">상품/서비스 키워드</p>
            <Badge variant="secondary" className="text-xs">선택</Badge>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="예: 아메리카노, 파스타"
              value={tempInput}
              onChange={(e) => setTempInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword(products, setProducts);
                }
              }}
              className="flex-1 text-base"
            />
            <Button
              variant="outline"
              size="default"
              onClick={() => addKeyword(products, setProducts)}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 추가된 키워드 목록 */}
          {products.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {products.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="text-xs md:text-sm px-2.5 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                  onClick={() => removeKeyword(index, products, setProducts)}
                >
                  {keyword}
                  <X className="w-3 h-3 ml-1.5" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          없다면 비워두고 다음으로 넘어가셔도 괜찮아요!
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 6: 매장 특색
  const renderStep6 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          매장의 특색을 알려주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          고객에게 가장 강조하고 싶은 특징이 무엇인가요?
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-bold text-neutral-900">매장 특색</p>
          </div>
          <Textarea
            placeholder="예: 신선한 재료만 사용, 프리미엄 커피, 20년 경력 디자이너, 넓고 쾌적한 공간 등"
            value={storeFeatures}
            onChange={(e) => {
              setStoreFeatures(e.target.value);
              setError('');
            }}
            rows={5}
            className={`resize-none text-sm md:text-base ${error ? 'border-error' : ''}`}
          />
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          구체적이고 차별화된 특징을 자유롭게 작성해주세요!
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 7: 생성 중
  const renderStep7 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center py-8 md:py-12">
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-emerald-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          AI가 업체소개글을 작성중입니다
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          입력하신 정보를 바탕으로<br />
          매력적인 소개글을 만들고 있어요...
        </p>
      </div>
    </div>
  );

  // Step 8: 완료
  const renderStep8 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
          업체소개글이 완성되었어요!
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          아래 내용을 복사해서 네이버 플레이스에 등록하세요
        </p>
      </div>

      <Card className="border-neutral-200 shadow-card">
        <CardContent className="p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-neutral-900">생성된 소개글</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">복사</span>
            </Button>
          </div>
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm md:text-base text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {generatedText}
            </p>
          </div>
        </CardContent>
      </Card>

      <Alert variant="success" className="p-3 md:p-4">
        <AlertTitle>✨ 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          생성된 소개글은 그대로 사용하거나 수정해서 사용하실 수 있어요!
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      case 8:
        return renderStep8();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="업체소개글 작성"
      icon={Sparkles}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1 ? '다음' :
        currentStep === 2 ? '다음' :
        currentStep === 3 ? '다음' :
        currentStep === 4 ? '다음' :
        currentStep === 5 ? '다음' :
        currentStep === 6 ? (isGenerating ? 'AI 작성 중...' : 'AI로 작성하기') :
        currentStep === 7 ? '' :
        '확인'
      }
      nextButtonDisabled={
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 2 && !regionKeyword.trim()) ||
        (currentStep === 4 && !businessTypeKeyword.trim()) ||
        (currentStep === 6 && (!storeFeatures.trim() || isGenerating)) ||
        currentStep === 7
      }
      showBackButton={currentStep > 1 && currentStep !== 7 && currentStep !== 8}
      hideNextButton={currentStep === 7}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
