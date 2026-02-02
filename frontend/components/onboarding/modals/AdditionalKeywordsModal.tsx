'use client';

import { useState } from 'react';
import {
  MapPin,
  Package,
  Building2,
  Sparkles,
  Search,
  TrendingUp,
  Monitor,
  Smartphone,
  Loader2,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/config';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import OnboardingModal from './OnboardingModal';
import KeywordInput from './KeywordInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdditionalKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface SearchVolumeData {
  id: string;
  keyword: string;
  monthly_pc_qc_cnt: number | string;
  monthly_mobile_qc_cnt: number | string;
  monthly_ave_pc_clk_cnt: number;
  monthly_ave_mobile_clk_cnt: number;
  monthly_ave_pc_ctr: number;
  monthly_ave_mobile_ctr: number;
  comp_idx: string;
  created_at: string;
}

export default function AdditionalKeywordsModal({ isOpen, onClose, onComplete }: AdditionalKeywordsModalProps) {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  
  // 입력 필드
  const [locationKeywords, setLocationKeywords] = useState<string[]>([]);
  const [productKeywords, setProductKeywords] = useState<string[]>([]);
  const [industryKeywords, setIndustryKeywords] = useState<string[]>([]);
  
  // 조합 결과
  const [combinations, setCombinations] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  
  // 검색 결과
  const [searchResults, setSearchResults] = useState<SearchVolumeData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setCurrentStep(1);
    setLocationKeywords([]);
    setProductKeywords([]);
    setIndustryKeywords([]);
    setCombinations([]);
    setSelectedKeywords(new Set());
    setSearchResults([]);
    setIsSearching(false);
    setError('');
    onClose();
  };

  // 조합 생성
  const generateCombinations = () => {
    const locations = locationKeywords;
    const products = productKeywords;
    const industries = industryKeywords;

    if (locations.length === 0 || products.length === 0 || industries.length === 0) {
      setError('모든 카테고리에 최소 1개 이상의 키워드를 입력해주세요');
      return [];
    }

    const newCombinations: string[] = [];

    // A + B (지역 + 상품)
    locations.forEach(loc => {
      products.forEach(prod => {
        newCombinations.push(`${loc} ${prod}`);
      });
    });

    // A + B + C (지역 + 상품 + 업종)
    locations.forEach(loc => {
      products.forEach(prod => {
        industries.forEach(ind => {
          newCombinations.push(`${loc} ${prod} ${ind}`);
        });
      });
    });

    // A + C (지역 + 업종)
    locations.forEach(loc => {
      industries.forEach(ind => {
        newCombinations.push(`${loc} ${ind}`);
      });
    });

    // B + C (상품 + 업종)
    products.forEach(prod => {
      industries.forEach(ind => {
        newCombinations.push(`${prod} ${ind}`);
      });
    });

    // 중복 제거
    return Array.from(new Set(newCombinations));
  };

  // 키워드 검색
  const handleSearch = async () => {
    if (!user?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const keywordsToSearch = Array.from(selectedKeywords);
    
    if (keywordsToSearch.length === 0) {
      setError('최소 1개 이상의 키워드를 선택해주세요');
      return;
    }

    if (keywordsToSearch.length > 5) {
      setError('한 번에 최대 5개의 키워드만 검색할 수 있습니다');
      return;
    }

    setIsSearching(true);
    setError('');
    
    try {
      const token = await getToken();
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        setIsSearching(false);
        return;
      }

      const response = await fetch(
        `${api.baseUrl}/api/v1/keyword-search-volume/search-volume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            keywords: keywordsToSearch,
          }),
        }
      );

      if (!response.ok) throw new Error("검색 실패");

      const result = await response.json();
      
      // API 응답에서 키워드 데이터 추출 및 변환
      const keywordList = result.data?.keywordList || [];
      const displayResults: SearchVolumeData[] = [];
      
      // saved_history가 있으면 우선 사용
      if (result.saved_history && result.saved_history.length > 0) {
        displayResults.push(...result.saved_history);
      } 
      // saved_history가 없어도 keywordList가 있으면 임시로 표시
      else if (keywordList.length > 0) {
        keywordList.forEach((item: any, index: number) => {
          displayResults.push({
            id: `temp-${Date.now()}-${index}`,
            keyword: item.relKeyword,
            monthly_pc_qc_cnt: typeof item.monthlyPcQcCnt === 'string' && item.monthlyPcQcCnt.includes('<') ? 5 : item.monthlyPcQcCnt,
            monthly_mobile_qc_cnt: typeof item.monthlyMobileQcCnt === 'string' && item.monthlyMobileQcCnt.includes('<') ? 5 : item.monthlyMobileQcCnt,
            monthly_ave_pc_clk_cnt: item.monthlyAvePcClkCnt || 0,
            monthly_ave_mobile_clk_cnt: item.monthlyAveMobileClkCnt || 0,
            monthly_ave_pc_ctr: item.monthlyAvePcCtr || 0,
            monthly_ave_mobile_ctr: item.monthlyAveMobileCtr || 0,
            comp_idx: item.compIdx || '-',
            created_at: new Date().toISOString(),
          });
        });
      }
      
      setSearchResults(displayResults);
      setCurrentStep(8);
      
    } catch (err) {
      console.error('검색 오류:', err);
      setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = () => {
    setError('');
    
    // Step 1 → 2
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    
    // Step 2: 지역 키워드
    if (currentStep === 2) {
      if (locationKeywords.length === 0) {
        setError('최소 1개 이상의 지역 키워드를 추가해주세요');
        return;
      }
      setCurrentStep(3);
      return;
    }
    
    // Step 3: 상품 키워드
    if (currentStep === 3) {
      if (productKeywords.length === 0) {
        setError('최소 1개 이상의 상품 키워드를 추가해주세요');
        return;
      }
      setCurrentStep(4);
      return;
    }
    
    // Step 4: 업종 키워드
    if (currentStep === 4) {
      if (industryKeywords.length === 0) {
        setError('최소 1개 이상의 업종 키워드를 추가해주세요');
        return;
      }
      // 조합 생성
      const generated = generateCombinations();
      if (generated.length === 0) return;
      setCombinations(generated);
      setCurrentStep(5);
      return;
    }
    
    // Step 5: 조합 결과 확인 → 선택
    if (currentStep === 5) {
      setCurrentStep(6);
      return;
    }
    
    // Step 6: 키워드 선택 → 검색
    if (currentStep === 6) {
      if (selectedKeywords.size === 0) {
        setError('최소 1개 이상의 키워드를 선택해주세요');
        return;
      }
      setCurrentStep(7);
      handleSearch();
      return;
    }
    
    // Step 8: 완료 → 검색 이력 페이지로 이동
    if (currentStep === 8) {
      if (onComplete) onComplete();
      handleClose();
      router.push('/dashboard/naver/keyword-search-volume');
      return;
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && currentStep !== 7) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleKeywordSelection = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      if (newSelected.size >= 5) {
        setError('최대 5개까지만 선택할 수 있습니다');
        return;
      }
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
    setError('');
  };

  // Step 1: 환영 메시지
  const renderStep1 = () => (
    <div className="space-y-1">
      <div className="text-center">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 mb-0.5 leading-tight">
          숨은 알짜 키워드를 찾아보세요!
        </h3>
        <p className="text-[11px] md:text-xs text-neutral-600 leading-tight px-4">
          지역, 상품, 업종을 조합하여 유의미한 검색량을 찾습니다
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
          <CardContent className="p-1.5 flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-[11px] md:text-xs font-bold text-neutral-900 leading-tight">키워드 조합</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-sm">
          <CardContent className="p-1.5 flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-[11px] md:text-xs font-bold text-neutral-900 leading-tight">검색량 확인</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
          <CardContent className="p-1.5 flex flex-col items-center justify-center gap-1 text-center">
            <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-[11px] md:text-xs font-bold text-neutral-900 leading-tight">자동 저장</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Step 2: 지역 키워드 입력
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          지역 키워드를 입력해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          매장이 위치한 지역이나 타겟하는 지역을 입력하세요
        </p>
      </div>

      <KeywordInput
        keywords={locationKeywords}
        onChange={setLocationKeywords}
        placeholder="예: 강남, 홍대, 명동"
        label="지역 키워드"
        icon={<MapPin className="w-4 h-4" />}
      />

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          동 단위보다는 큰 지역명이 좋아요 (예: 역삼동 → 강남)
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

  // Step 3: 상품 키워드 입력
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          상품/서비스 키워드를 입력해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          판매하는 상품이나 제공하는 서비스를 입력하세요
        </p>
      </div>

      <KeywordInput
        keywords={productKeywords}
        onChange={setProductKeywords}
        placeholder="예: 커피, 파스타, 디저트"
        label="상품/서비스 키워드"
        icon={<Package className="w-4 h-4" />}
      />

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          구체적인 상품명이 좋아요 (예: 음식 → 파스타)
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

  // Step 4: 업종 키워드 입력
  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          업종 키워드를 입력해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          매장의 업종이나 카테고리를 입력하세요
        </p>
      </div>

      <KeywordInput
        keywords={industryKeywords}
        onChange={setIndustryKeywords}
        placeholder="예: 맛집, 카페, 레스토랑"
        label="업종 키워드"
        icon={<Building2 className="w-4 h-4" />}
      />

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          고객이 검색할 만한 업종명을 입력하세요
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

  // Step 5: 조합 결과
  const renderStep5 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          총 {combinations.length}개의<br />키워드 조합이 생성되었어요!
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          입력하신 키워드로 다양한 조합을 만들었습니다
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <p className="text-sm font-bold text-neutral-900 mb-3">생성된 조합 (일부)</p>
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {combinations.slice(0, 20).map((combo, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {combo}
              </Badge>
            ))}
          </div>
          {combinations.length > 20 && (
            <p className="text-xs text-neutral-600 mt-2">
              ... 외 {combinations.length - 20}개
            </p>
          )}
        </CardContent>
      </Card>

      <Alert variant="success">
        <AlertTitle>✨ 다음 단계</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          이 중에서 검색량을 확인할 키워드를 선택할 수 있습니다!
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 6: 키워드 선택
  const renderStep6 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          검색량을 확인할 키워드를<br />선택해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          최대 5개까지 선택 가능 (현재 {selectedKeywords.size}개 선택)
        </p>
      </div>

      <Card className="border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
            {combinations.map((combo, index) => {
              const isSelected = selectedKeywords.has(combo);
              return (
                <Badge
                  key={index}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-600 text-white' : 'hover:bg-primary-100'
                  }`}
                  onClick={() => toggleKeywordSelection(combo)}
                >
                  {combo}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert variant="info">
        <AlertTitle>💡 선택 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          관심있는 키워드를 클릭하여 선택하세요
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 7: 검색 중
  const renderStep7 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-neutral-900 mb-2 leading-tight">
          검색량을 조회하고 있어요
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          네이버 검색광고 API에서 데이터를 가져오는 중입니다...
        </p>
      </div>
    </div>
  );

  // Step 8: 결과 표시
  const renderStep8 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          검색량 조회가 완료되었어요!
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          {searchResults.length}개 키워드의 검색량을 확인했습니다
        </p>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {searchResults.map((result) => (
          <Card key={result.id} className="border-neutral-200 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="space-y-2">
                <p className="text-sm md:text-base font-bold text-neutral-900">{result.keyword}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-neutral-500" />
                    <span className="text-neutral-600">PC:</span>
                    <span className="font-bold text-neutral-900">
                      {typeof result.monthly_pc_qc_cnt === 'string' 
                        ? result.monthly_pc_qc_cnt 
                        : result.monthly_pc_qc_cnt.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-neutral-500" />
                    <span className="text-neutral-600">모바일:</span>
                    <span className="font-bold text-neutral-900">
                      {typeof result.monthly_mobile_qc_cnt === 'string' 
                        ? result.monthly_mobile_qc_cnt 
                        : result.monthly_mobile_qc_cnt.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert variant="success">
        <AlertTitle>✨ 완료</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          검색 이력 페이지에서 언제든지 다시 확인할 수 있습니다!
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
      title="추가 키워드 찾기"
      icon={Tag}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1 ? '시작하기' :
        currentStep === 6 ? (isSearching ? '검색 중...' : '검색량 조회') :
        currentStep === 7 ? '' :
        currentStep === 8 ? '검색 이력 보기' :
        '다음'
      }
      nextButtonDisabled={
        (currentStep === 2 && locationKeywords.length === 0) ||
        (currentStep === 3 && productKeywords.length === 0) ||
        (currentStep === 4 && industryKeywords.length === 0) ||
        (currentStep === 6 && selectedKeywords.size === 0) ||
        (currentStep === 6 && isSearching) ||
        currentStep === 7
      }
      showBackButton={currentStep > 1 && currentStep !== 7 && currentStep !== 8}
      hideNextButton={currentStep === 7}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
