"use client"

import { useState } from "react"
import { X, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface KeywordCombinatorProps {
  isOpen: boolean
  onClose: () => void
  onApplyCombinations: (keywords: string[]) => void
}

export function KeywordCombinator({ isOpen, onClose, onApplyCombinations }: KeywordCombinatorProps) {
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
      alert("모든 입력창에 최소 1개 이상의 키워드를 입력해주세요.")
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
      alert("최소 1개 이상의 키워드를 선택해주세요.")
      return
    }
    onApplyCombinations(Array.from(selectedKeywords))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">키워드 조합기</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 입력창 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지역 키워드
              </label>
              <Input
                placeholder="성수, 성수역, 성수동 (쉼표로 구분)"
                value={locationKeywords}
                onChange={(e) => setLocationKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                예: 성수, 성수역, 성수동, 종로, 종각역
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 키워드
              </label>
              <Input
                placeholder="사진, 커플사진, 보쌈 (쉼표로 구분)"
                value={productKeywords}
                onChange={(e) => setProductKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                예: 사진, 커플사진, 보쌈, 한정식
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업종 키워드
              </label>
              <Input
                placeholder="맛집, 카페, 사진관 (쉼표로 구분)"
                value={industryKeywords}
                onChange={(e) => setIndustryKeywords(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                예: 맛집, 카페, 사진관, 식당
              </p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              ℹ️ <strong>안내:</strong> 조합된 키워드는 띄어쓰기가 포함되어 있습니다. 
              검색 시 자동으로 띄어쓰기가 제거되어 API에 전송됩니다.
            </p>
          </div>

          <Button
            onClick={generateCombinations}
            className="w-full mb-6"
            size="lg"
          >
            조합 시작
          </Button>

          {/* 조합 결과 */}
          {combinations.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">
                    조합 결과 ({combinations.length}개)
                  </h3>
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                  >
                    {selectedKeywords.size === combinations.length ? "전체 해제" : "전체 선택"}
                  </Button>
                </div>
                <Button
                  onClick={handleCopyAll}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      전체 복사
                    </>
                  )}
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {combinations.map((combo, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeywords.has(combo)}
                        onChange={() => toggleKeywordSelection(combo)}
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{combo}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedKeywords.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    {selectedKeywords.size}개의 키워드가 선택되었습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {combinations.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <Button onClick={onClose} variant="outline">
              닫기
            </Button>
            <Button
              onClick={handleApplySelected}
              disabled={selectedKeywords.size === 0}
            >
              선택한 키워드로 검색
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
