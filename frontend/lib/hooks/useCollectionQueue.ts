'use client'

import { useState, useCallback, useRef } from 'react'

// 수집 상태 타입
export type CollectionStatus = 'collecting' | 'queued'

// 큐 아이템 타입
interface QueueItem {
  id: string           // 고유 식별자 (trackerId 또는 storeId)
  type: 'store' | 'keyword'
  execute: () => Promise<void>  // 실제 수집 실행 함수
}

// 동시 실행 제한
const MAX_CONCURRENT_STORES = 2
const MAX_CONCURRENT_KEYWORDS = 6

/**
 * 수집 큐 관리 훅
 * - 매장 전체 수집: 동시 최대 2개
 * - 개별 키워드 수집: 동시 최대 6개
 * - 초과 요청은 큐에 대기 → 이전 작업 완료 시 자동 실행
 */
export function useCollectionQueue() {
  // 각 아이템의 상태 (collecting | queued)
  const [statusMap, setStatusMap] = useState<Map<string, CollectionStatus>>(new Map())
  
  // 현재 실행 중인 수
  const activeStoreCount = useRef(0)
  const activeKeywordCount = useRef(0)
  
  // 대기 큐
  const storeQueue = useRef<QueueItem[]>([])
  const keywordQueue = useRef<QueueItem[]>([])
  
  // 큐 처리 중 플래그 (재진입 방지)
  const isProcessingStoreQueue = useRef(false)
  const isProcessingKeywordQueue = useRef(false)

  // 상태 업데이트 헬퍼
  const setStatus = useCallback((id: string, status: CollectionStatus | null) => {
    setStatusMap(prev => {
      const next = new Map(prev)
      if (status === null) {
        next.delete(id)
      } else {
        next.set(id, status)
      }
      return next
    })
  }, [])

  // 매장 큐 처리
  const processStoreQueue = useCallback(async () => {
    if (isProcessingStoreQueue.current) return
    isProcessingStoreQueue.current = true

    while (storeQueue.current.length > 0 && activeStoreCount.current < MAX_CONCURRENT_STORES) {
      const item = storeQueue.current.shift()!
      activeStoreCount.current++
      setStatus(item.id, 'collecting')

      // 비동기로 실행 (await 하지 않아야 다음 큐 아이템도 동시 실행 가능)
      item.execute().finally(() => {
        activeStoreCount.current--
        setStatus(item.id, null)
        // 완료 후 다음 대기 아이템 처리
        isProcessingStoreQueue.current = false
        processStoreQueue()
      })
    }

    isProcessingStoreQueue.current = false
  }, [setStatus])

  // 키워드 큐 처리
  const processKeywordQueue = useCallback(async () => {
    if (isProcessingKeywordQueue.current) return
    isProcessingKeywordQueue.current = true

    while (keywordQueue.current.length > 0 && activeKeywordCount.current < MAX_CONCURRENT_KEYWORDS) {
      const item = keywordQueue.current.shift()!
      activeKeywordCount.current++
      setStatus(item.id, 'collecting')

      item.execute().finally(() => {
        activeKeywordCount.current--
        setStatus(item.id, null)
        isProcessingKeywordQueue.current = false
        processKeywordQueue()
      })
    }

    isProcessingKeywordQueue.current = false
  }, [setStatus])

  /**
   * 매장 전체 수집을 큐에 추가
   * @param storeId - 매장 ID (store_xxx 형태로 저장)
   * @param execute - 실제 수집 함수
   */
  const enqueueStore = useCallback((storeId: string, execute: () => Promise<void>) => {
    const queueId = `store_${storeId}`
    
    // 이미 큐에 있거나 실행 중이면 무시
    if (statusMap.get(queueId)) return

    if (activeStoreCount.current < MAX_CONCURRENT_STORES) {
      // 슬롯 여유 → 즉시 실행
      activeStoreCount.current++
      setStatus(queueId, 'collecting')
      
      execute().finally(() => {
        activeStoreCount.current--
        setStatus(queueId, null)
        processStoreQueue()
      })
    } else {
      // 슬롯 없음 → 큐에 대기
      setStatus(queueId, 'queued')
      storeQueue.current.push({ id: queueId, type: 'store', execute })
    }
  }, [statusMap, setStatus, processStoreQueue])

  /**
   * 개별 키워드 수집을 큐에 추가
   * @param trackerId - 트래커 ID
   * @param execute - 실제 수집 함수
   */
  const enqueueKeyword = useCallback((trackerId: string, execute: () => Promise<void>) => {
    // 이미 큐에 있거나 실행 중이면 무시
    if (statusMap.get(trackerId)) return

    if (activeKeywordCount.current < MAX_CONCURRENT_KEYWORDS) {
      // 슬롯 여유 → 즉시 실행
      activeKeywordCount.current++
      setStatus(trackerId, 'collecting')
      
      execute().finally(() => {
        activeKeywordCount.current--
        setStatus(trackerId, null)
        processKeywordQueue()
      })
    } else {
      // 슬롯 없음 → 큐에 대기
      setStatus(trackerId, 'queued')
      keywordQueue.current.push({ id: trackerId, type: 'keyword', execute })
    }
  }, [statusMap, setStatus, processKeywordQueue])

  /**
   * 특정 아이템의 상태 확인
   */
  const getStatus = useCallback((id: string): CollectionStatus | undefined => {
    return statusMap.get(id)
  }, [statusMap])

  /**
   * 수집 중인지 확인 (collecting 상태)
   */
  const isCollecting = useCallback((id: string): boolean => {
    return statusMap.get(id) === 'collecting'
  }, [statusMap])

  /**
   * 큐 대기 중인지 확인 (queued 상태)
   */
  const isQueued = useCallback((id: string): boolean => {
    return statusMap.get(id) === 'queued'
  }, [statusMap])

  /**
   * 수집 중이거나 큐에 있는지 확인
   */
  const isBusy = useCallback((id: string): boolean => {
    return statusMap.has(id)
  }, [statusMap])

  return {
    enqueueStore,
    enqueueKeyword,
    getStatus,
    isCollecting,
    isQueued,
    isBusy,
    statusMap,
  }
}
