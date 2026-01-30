"use client"

import { useState } from "react"
import { X, Copy, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface KeywordCombinatorProps {
  isOpen: boolean
  onClose: () => void
  onApplyCombinations: (keywords: string[]) => void
}

export function KeywordCombinator({ isOpen, onClose, onApplyCombinations }: KeywordCombinatorProps) {
  const { toast } = useToast()
  const [locationKeywords, setLocationKeywords] = useState("")
  const [productKeywords, setProductKeywords] = useState("")
  const [industryKeywords, setIndustryKeywords] = useState("")
  const [combinations, setCombinations] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const generateCombinations = () => {
    const locations = locationKeywords.split(",").map(k => k.trim()).filter(k => k)
    const products = productKeywords.split(",").map(k => k.trim()).filter(k => k)
    const industries = industryKeywords.split(",").map(k => k.trim()).filter(k => k)

    if (locations.length === 0 || products.length === 0 || industries.length === 0) {
      toast({
        title: "입력 필요",
        description: "모든 입력창에 최소 1개 이상의 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    const newCombinations: string[] = []

    // A + B (지역 + 상품)
    locations.forEach(loc => {
      products.forEach(prod => {
        newCombinations.push(`${loc} ${prod}`)
      })
    })

    // A + B + C (지역 + 상품 + 업종)
    locations.forEach(loc => {
      products.forEach(prod => {
        industries.forEach(ind => {
          newCombinations.push(`${loc} ${prod} ${ind}`)
        })
      })
    })

    // A + C (지역 + 업종)
    locations.forEach(loc => {
      industries.forEach(ind => {
        newCombinations.push(`${loc} ${ind}`)
      })
    })

    // B + C (상품 + 업종)
    products.forEach(prod => {
      industries.forEach(ind => {
        newCombinations.push(`${prod} ${ind}`)
      })
    })

    // 중복 제거
    const uniqueCombinations = Array.from(new Set(newCombinations))
    setCombinations(uniqueCombinations)
    setSelectedKeywords(new Set())
  }

  const handleCopyAll = () => {
    const text = combinations.join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleKeywordSelection = (keyword: string) => {
    const newSelected = new Set(selectedKeywords)
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword)
    } else {
      newSelected.add(keyword)
    }
    setSelectedKeywords(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedKeywords.size === combinations.length) {
      setSelectedKeywords(new Set())
    } else {
      setSelectedKeywords(new Set(combinations))
    }
  }

  const handleApplySelected = () => {
    if (selectedKeywords.size === 0) {
      toast({
        title: "선택 필요",
        description: "최소 1개 이상의 키워드를 선택해주세요.",
        variant: "destructive",
      })
      return
    }
    onApplyCombinations(Array.from(selectedKeywords))
    toast({
      title: "검색 시작",
      description: `${selectedKeywords.size}개의 키워드로 검색을 시작합니다.`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-200 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h2 className="text-lg md:text-xl font-bold text-neutral-900">키워드 조합기</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors touch-manipulation"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* 입력창 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                🗺️ 지역 키워드
              </label>
              <Input
                placeholder="성수, 성수역, 성수동"
                value={locationKeywords}
                onChange={(e) => setLocationKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                예: 성수, 성수역, 성수동, 종로
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                🛍️ 상품 키워드
              </label>
              <Input
                placeholder="사진, 커플사진, 보쌈"
                value={productKeywords}
                onChange={(e) => setProductKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                예: 사진, 커플사진, 보쌈, 한정식
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                🏪 업종 키워드
              </label>
              <Input
                placeholder="맛집, 카페, 사진관"
                value={industryKeywords}
                onChange={(e) => setIndustryKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                예: 맛집, 카페, 사진관, 식당
              </p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-info/5 border border-info/20 rounded-lg">
            <p className="text-xs text-info">
              💡 <strong>안내:</strong> 조합된 키워드는 띄어쓰기가 포함되어 있습니다. 검색 시 자동으로 띄어쓰기가 제거되어 API에 전송됩니다.
            </p>
          </div>

          <Button
            onClick={generateCombinations}
            className="w-full mb-6 gap-2"
            size="lg"
          >
            <Sparkles className="w-4 h-4" />
            조합 생성하기
          </Button>

          {/* 조합 결과 */}
          {combinations.length > 0 && (
            <div className="border border-neutral-200 rounded-xl p-4 bg-gradient-to-br from-success/5 via-white to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-neutral-900">
                    조합 결과
                  </h3>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-md border border-primary/20">
                    {combinations.length}개
                  </span>
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    {selectedKeywords.size === combinations.length ? "전체 해제" : "전체 선택"}
                  </Button>
                </div>
                <Button
                  onClick={handleCopyAll}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-6 px-2 text-xs self-start sm:self-auto"
                >
                  {copied ? (
                    <>
                      <Check className="w-2.5 h-2.5" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      전체 복사
                    </>
                  )}
                </Button>
              </div>

              <div className="max-h-80 md:max-h-96 overflow-y-auto border border-neutral-200 rounded-lg p-2 md:p-3 bg-white">
                <div className="space-y-1">
                  {combinations.map((combo, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeywords.has(combo)}
                        onChange={() => toggleKeywordSelection(combo)}
                        className="flex-shrink-0 text-primary rounded border-neutral-300 focus:ring-primary focus:ring-1 cursor-pointer"
                        style={{ width: '13px', height: '13px', minWidth: '13px', minHeight: '13px', maxWidth: '13px', maxHeight: '13px' }}
                      />
                      <span className="text-sm text-neutral-700 break-words">{combo}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedKeywords.size > 0 && (
                <div className="mt-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs md:text-sm text-primary font-medium">
                    ✓ {selectedKeywords.size}개의 키워드가 선택되었습니다
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {combinations.length > 0 && (
          <div className="flex items-center justify-end gap-2 p-4 md:p-6 border-t border-neutral-200 bg-neutral-50">
            <Button onClick={onClose} variant="outline" size="sm" className="h-9 px-4">
              닫기
            </Button>
            <Button
              onClick={handleApplySelected}
              disabled={selectedKeywords.size === 0}
              size="sm"
              className="gap-2 h-9 px-4"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">선택한 키워드로 검색</span>
              <span className="sm:hidden">검색 ({selectedKeywords.size})</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
