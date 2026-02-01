"use client"

import { useEffect } from "react"

/**
 * 모바일 브라우저의 주소창을 고려한 정확한 뷰포트 높이를 설정하는 컴포넌트
 * 100vh 대신 --vh CSS 변수를 사용하여 모바일에서 더 정확한 높이를 계산합니다.
 */
export function ViewportHeight() {
  useEffect(() => {
    function setVH() {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    // 초기 설정
    setVH()

    // 리사이즈 및 화면 회전 시 업데이트
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100)
    })

    // 클린업
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  return null
}
