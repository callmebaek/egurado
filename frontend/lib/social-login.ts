/**
 * 소셜 로그인 SDK 로더
 * 카카오, 네이버 SDK 초기화 및 로그인 처리
 */

declare global {
  interface Window {
    Kakao: any
    naver: any
  }
}

// 카카오 SDK 로드
export const loadKakaoSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://developers.kakao.com/sdk/js/kakao.js'
    script.async = true
    script.onload = () => {
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
      if (kakaoKey && window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey)
      }
      resolve()
    }
    script.onerror = () => reject(new Error('카카오 SDK 로드 실패'))
    document.body.appendChild(script)
  })
}

// 카카오 로그인 시작
export const startKakaoLogin = async () => {
  await loadKakaoSDK()
  
  const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || 
                      `${window.location.origin}/auth/callback/kakao`
  
  if (window.Kakao && window.Kakao.Auth) {
    window.Kakao.Auth.authorize({
      redirectUri: redirectUri,
    })
  }
}

// 네이버 로그인 시작
export const startNaverLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_NAVER_REDIRECT_URI || 
                      `${window.location.origin}/auth/callback/naver`
  const state = Math.random().toString(36).substring(2, 15)
  
  // state 값을 sessionStorage에 저장 (CSRF 방지)
  sessionStorage.setItem('naver_state', state)
  
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  window.location.href = naverAuthUrl
}
