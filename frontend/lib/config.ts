/**
 * 앱 설정
 * 환경 변수를 관리하고 클라우드 배포를 지원합니다.
 */

export const config = {
  /**
   * 백엔드 API URL
   * 로컬: http://localhost:8000
   * 프로덕션: 환경 변수에서 설정
   */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  /**
   * 앱 환경
   */
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  /**
   * Supabase 설정 (이미 환경 변수로 관리됨)
   */
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
} as const

/**
 * 백엔드 API 기본 URL (호환성을 위한 별칭)
 */
export const API_BASE_URL = config.apiUrl

/**
 * API 엔드포인트 빌더
 */
const baseUrl = config.apiUrl;
const apiUrl = (path: string) => `${baseUrl}${path}`;

export const api = {
  /**
   * 백엔드 기본 URL
   */
  baseUrl: baseUrl,
  
  /**
   * 전체 URL 생성
   */
  url: apiUrl,
  
  /**
   * 매장 관련 API
   */
  stores: {
    list: (userId: string) => apiUrl(`/api/v1/stores/?user_id=${userId}`),
    create: () => apiUrl('/api/v1/stores/'),
    delete: (storeId: string) => apiUrl(`/api/v1/stores/${storeId}`),
  },
  
  /**
   * 네이버 관련 API
   */
  naver: {
    searchStores: (query: string) => 
      apiUrl(`/api/v1/naver/search-stores-unofficial?query=${encodeURIComponent(query)}`),
    checkRank: () => apiUrl('/api/v1/naver/check-rank-unofficial'),
    stores: {
      list: apiUrl('/api/v1/naver/stores'),
      create: apiUrl('/api/v1/naver/stores'),
      delete: (storeId: string) => apiUrl(`/api/v1/naver/stores/${storeId}`),
    },
    keywords: {
      list: apiUrl('/api/v1/naver/keywords'),
      history: (keywordId: string) => apiUrl(`/api/v1/naver/keywords/${keywordId}/history`),
      delete: (keywordId: string) => apiUrl(`/api/v1/naver/keywords/${keywordId}`),
    },
    trackKeyword: (keywordId: string) => apiUrl(`/api/v1/naver/keywords/${keywordId}/track`),
    analyzeMainKeywords: () => apiUrl('/api/v1/naver/analyze-main-keywords'),
    analyzePlaceDetails: (placeId: string, storeName?: string) => {
      const params = storeName ? `?store_name=${encodeURIComponent(storeName)}` : ''
      return apiUrl(`/api/v1/naver/place-details/${placeId}${params}`)
    },
  },
  
  /**
   * 주요지표 추적 관련 API
   */
  metrics: {
    // 문자열 속성 (metrics-tracker 페이지용)
    list: apiUrl('/api/v1/metrics/trackers'),
    create: apiUrl('/api/v1/metrics/trackers'),
    // 함수 (dashboard 페이지용)
    trackers: () => apiUrl('/api/v1/metrics/trackers'),
    collectNow: (trackerId: string) => apiUrl(`/api/v1/metrics/trackers/${trackerId}/collect`),
    update: (trackerId: string) => apiUrl(`/api/v1/metrics/trackers/${trackerId}`),
    delete: (trackerId: string) => apiUrl(`/api/v1/metrics/trackers/${trackerId}`),
    getMetrics: (trackerId: string) => apiUrl(`/api/v1/metrics/trackers/${trackerId}/metrics`),
  },
  
  /**
   * 리뷰 관련 API
   */
  reviews: {
    analyze: () => apiUrl('/api/v1/reviews/analyze'),
    extract: () => apiUrl('/api/v1/reviews/extract'),
    analyzeStream: (storeId: string, startDate: string, endDate: string) => 
      apiUrl(`/api/v1/reviews/analyze-stream?store_id=${storeId}&start_date=${startDate}&end_date=${endDate}`),
    stats: (storeId: string, date?: string) => {
      const params = date ? `?date=${date}` : ''
      return apiUrl(`/api/v1/reviews/stats/${storeId}${params}`)
    },
    list: (storeId: string, filters?: {
      date?: string
      sentiment?: string
      is_receipt?: boolean
      is_reservation?: boolean
    }) => {
      const params = new URLSearchParams()
      if (filters?.date) params.append('date', filters.date)
      if (filters?.sentiment) params.append('sentiment', filters.sentiment)
      if (filters?.is_receipt !== undefined) params.append('is_receipt', String(filters.is_receipt))
      if (filters?.is_reservation !== undefined) params.append('is_reservation', String(filters.is_reservation))
      const queryString = params.toString()
      return apiUrl(`/api/v1/reviews/list/${storeId}${queryString ? `?${queryString}` : ''}`)
    },
    placeInfo: (storeId: string) => apiUrl(`/api/v1/reviews/place-info/${storeId}`),
  },
} as const

/**
 * API 호출 헬퍼 (에러 처리 포함)
 */
export const fetcher = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`)
    }
    return response.json()
  },
  
  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API 오류: ${response.status}`)
    }
    return response.json()
  },
  
  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`)
    }
    return response.json()
  },
}
