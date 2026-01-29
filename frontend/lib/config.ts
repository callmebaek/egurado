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
export const api = {
  /**
   * 백엔드 기본 URL
   */
  baseUrl: config.apiUrl,
  
  /**
   * 전체 URL 생성
   */
  url: (path: string) => `${config.apiUrl}${path}`,
  
  /**
   * 매장 관련 API
   */
  stores: {
    list: () => api.url('/api/v1/stores/'),
    create: () => api.url('/api/v1/stores/'),
    delete: (storeId: string) => api.url(`/api/v1/stores/${storeId}`),
    reorder: () => api.url('/api/v1/stores/reorder'),
  },
  
  /**
   * 네이버 관련 API
   */
  naver: {
    searchStores: (query: string) => 
      api.url(`/api/v1/naver/search-stores-unofficial?query=${encodeURIComponent(query)}`),
    checkRank: () => api.url('/api/v1/naver/check-rank-unofficial'),
    keywords: (storeId: string) => api.url(`/api/v1/naver/stores/${storeId}/keywords`),
    keywordHistory: (keywordId: string) => 
      api.url(`/api/v1/naver/keywords/${keywordId}/history`),
    deleteKeyword: (keywordId: string) => api.url(`/api/v1/naver/keywords/${keywordId}`),
    trackKeyword: (keywordId: string) => api.url(`/api/v1/naver/keywords/${keywordId}/track`),
    analyzeMainKeywords: () => api.url('/api/v1/naver/analyze-main-keywords'),
    analyzePlaceDetails: (placeId: string, storeName?: string, storeId?: string) => {
      const params = new URLSearchParams()
      if (storeName) params.append('store_name', storeName)
      if (storeId) params.append('store_id', storeId)
      const queryString = params.toString() ? `?${params.toString()}` : ''
      return api.url(`/api/v1/naver/place-details/${placeId}${queryString}`)
    },
    diagnosisHistory: (storeId: string, limit?: number) => {
      const params = limit ? `?limit=${limit}` : ''
      return api.url(`/api/v1/naver/diagnosis-history/${storeId}${params}`)
    },
    diagnosisHistoryDetail: (historyId: string) => {
      return api.url(`/api/v1/naver/diagnosis-history/detail/${historyId}`)
    },
    activation: (storeId: string) => api.url(`/api/v1/naver/activation/${storeId}`),
    activationHistory: (storeId: string) => api.url(`/api/v1/naver/activation/history/${storeId}`),
    generateDescription: () => api.url('/api/v1/naver/activation/generate-description'),
    generateDirections: () => api.url('/api/v1/naver/activation/generate-directions'),
    competitorAnalyze: () => api.url('/api/v1/naver/competitor/analyze'),
  },
  
  /**
   * 리뷰 관련 API
   */
  reviews: {
    analyze: () => api.url('/api/v1/reviews/analyze'),
    extract: () => api.url('/api/v1/reviews/extract'),
    analyzeStream: (storeId: string, startDate: string, endDate: string) => 
      api.url(`/api/v1/reviews/analyze-stream?store_id=${storeId}&start_date=${startDate}&end_date=${endDate}`),
    stats: (storeId: string, date?: string) => {
      const params = date ? `?date=${date}` : ''
      return api.url(`/api/v1/reviews/stats/${storeId}${params}`)
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
      return api.url(`/api/v1/reviews/list/${storeId}${queryString ? `?${queryString}` : ''}`)
    },
    placeInfo: (storeId: string) => api.url(`/api/v1/reviews/place-info/${storeId}`),
  },
  
  /**
   * 주요지표 추적 관련 API
   */
  metrics: {
    list: () => api.url('/api/v1/metrics/trackers'),
    create: () => api.url('/api/v1/metrics/trackers'),
    trackers: () => api.url('/api/v1/metrics/trackers'),
    collectNow: (trackerId: string) => api.url(`/api/v1/metrics/trackers/${trackerId}/collect`),
    update: (trackerId: string) => api.url(`/api/v1/metrics/trackers/${trackerId}`),
    delete: (trackerId: string) => api.url(`/api/v1/metrics/trackers/${trackerId}`),
    getMetrics: (trackerId: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const queryString = params.toString()
      return api.url(`/api/v1/metrics/trackers/${trackerId}/metrics${queryString ? `?${queryString}` : ''}`)
    },
  },
  
  /**
   * 기능 투표 관련 API
   */
  votes: {
    features: () => api.url('/api/v1/votes/features'),
    vote: (featureKey: string) => api.url(`/api/v1/votes/features/${featureKey}`),
    myVotes: () => api.url('/api/v1/votes/my-votes'),
    summary: (featureKey: string) => api.url(`/api/v1/votes/features/${featureKey}/summary`),
  },
  
  /**
   * 온보딩 관련 API
   */
  onboarding: {
    progress: () => api.url('/api/v1/onboarding/progress'),
    updateAction: (actionKey: string) => api.url(`/api/v1/onboarding/progress/${actionKey}`),
    preferences: () => api.url('/api/v1/onboarding/preferences'),
  },
  
  /**
   * 타겟키워드 관련 API
   */
  targetKeywords: {
    analyze: () => api.url('/api/v1/target-keywords/analyze'),
    history: (storeId: string) => api.url(`/api/v1/target-keywords/history/${storeId}`),
    historyDetail: (historyId: string) => api.url(`/api/v1/target-keywords/history/detail/${historyId}`),
  },
  
  /**
   * 문의하기 관련 API
   */
  contact: {
    uploadFile: () => api.url('/api/v1/contact/upload-file'),
    submit: () => api.url('/api/v1/contact/submit'),
    myMessages: () => api.url('/api/v1/contact/my-messages'),
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
