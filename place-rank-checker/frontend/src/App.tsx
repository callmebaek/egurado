import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface RankResult {
  keyword: string
  place_id: string
  place_name: string
  rank: number
  found: boolean
  total_count: number
  blog_review_count: number
  visitor_review_count: number
  save_count: number
  category: string
  address: string
  checked_at: string
}

function App() {
  const [keyword, setKeyword] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RankResult | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!keyword.trim()) {
      setError('키워드를 입력하세요')
      return
    }
    
    if (!placeId.trim() && !placeName.trim()) {
      setError('플레이스 ID 또는 플레이스명을 입력하세요')
      return
    }
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const response = await axios.post(`${API_URL}/api/rank/check`, {
        keyword: keyword.trim(),
        place_id: placeId.trim() || null,
        place_name: placeName.trim() || null
      })
      
      if (response.data.success && response.data.data) {
        setResult(response.data.data)
      } else {
        setError(response.data.message || '순위 체크 실패')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '순위 체크 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            🎯 Place Rank Checker
          </h1>
          <p className="text-gray-600">
            네이버 플레이스 순위 체크 시스템
          </p>
          <p className="text-sm text-red-600 mt-2">
            ⚠️ 교육 목적으로만 사용하세요
          </p>
        </header>

        {/* Form */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                검색 키워드 *
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 성수사진, 강남 맛집"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                플레이스 ID
              </label>
              <input
                type="text"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="예: 2072848563"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                플레이스명
              </label>
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="예: 아나나사진관 성수스튜디오"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '순위 확인 중...' : '순위 확인'}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📊 순위 결과
            </h2>

            {result.found ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-gray-700 font-semibold">순위</span>
                  <span className="text-3xl font-bold text-green-600">
                    {result.rank}위
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">전체 플레이스</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {result.total_count.toLocaleString()}개
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">블로그 리뷰</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.blog_review_count.toLocaleString()}개
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">방문자 리뷰</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {result.visitor_review_count.toLocaleString()}개
                    </p>
                  </div>

                  <div className="p-4 bg-pink-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">저장 수</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {result.save_count.toLocaleString()}개
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div>
                    <span className="text-gray-600 font-semibold">플레이스명: </span>
                    <span className="text-gray-800">{result.place_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">카테고리: </span>
                    <span className="text-gray-800">{result.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">주소: </span>
                    <span className="text-gray-800">{result.address}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">확인 시간: </span>
                    <span className="text-gray-800">{result.checked_at}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  ⚠️ 해당 플레이스를 찾을 수 없습니다.
                </p>
                <p className="text-sm text-yellow-600 mt-2">
                  전체 플레이스: {result.total_count.toLocaleString()}개
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-600">
          <p className="text-sm">
            Made with ❤️ for educational purposes only
          </p>
          <p className="text-xs mt-2 text-red-500">
            네이버 서비스 약관을 준수하세요. 법적 책임은 사용자에게 있습니다.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
