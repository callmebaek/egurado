/**
 * Content Script
 * 웹사이트(localhost:3000)에서 실행되어 localStorage에 접근합니다
 */

console.log('🌐 Content Script 로드됨')

// 웹사이트의 localStorage에서 인증 정보 추출
function getAuthInfo() {
  try {
    console.log('🔍 인증 정보 추출 시작...')
    
    // 모든 localStorage 키 확인
    const allKeys = Object.keys(localStorage)
    console.log('📦 localStorage 총 키 개수:', allKeys.length)
    console.log('📦 localStorage 키 목록:', allKeys)
    
    // 🆕 Step 1: 먼저 access_token 확인 (가장 확실한 방법)
    const accessToken = localStorage.getItem('access_token')
    
    if (!accessToken) {
      console.log('❌ access_token이 localStorage에 없습니다')
      console.log('💡 힌트: 웹사이트에 로그인한 후 페이지를 새로고침하세요')
      return { authenticated: false, userId: null, accessToken: null }
    }
    
    console.log('✅ access_token 발견:', accessToken.substring(0, 20) + '...')
    
    // 🆕 Step 2: JWT에서 userId 추출 (access_token 디코딩)
    let userId = null
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      userId = payload?.sub || payload?.user_id || payload?.id
      console.log('✅ JWT에서 userId 추출 성공:', userId)
    } catch (e) {
      console.error('❌ JWT 디코딩 실패:', e.message)
    }
    
    // 🔄 Step 3: userId가 없으면 Supabase 방식으로 시도 (기존 로직, 하위 호환성)
    if (!userId) {
      console.log('🔍 Supabase 인증 데이터에서 userId 찾기 시도...')
      
      const patterns = [
        'supabase.auth.token',
        'sb-',  // Supabase 새 패턴
        'supabase-auth-token',
        'auth-token'
      ]
      
      let supabaseKey = null
      let matchedPattern = null
      
      for (const pattern of patterns) {
        const key = allKeys.find(k => k.includes(pattern))
        if (key) {
          supabaseKey = key
          matchedPattern = pattern
          break
        }
      }
      
      if (supabaseKey) {
        console.log('🔑 찾은 Supabase 키:', supabaseKey)
        console.log('🎯 매칭된 패턴:', matchedPattern)
        
        const authDataStr = localStorage.getItem(supabaseKey)
        console.log('📄 인증 데이터 길이:', authDataStr?.length || 0)
        
        const authData = JSON.parse(authDataStr)
        console.log('📊 인증 데이터 구조:', Object.keys(authData || {}))
        
        // 다양한 경로로 user ID 찾기
        userId = authData?.currentSession?.user?.id
        console.log('🔍 패턴1 (currentSession.user.id):', userId || 'null')
        
        if (!userId) {
          userId = authData?.user?.id
          console.log('🔍 패턴2 (user.id):', userId || 'null')
        }
        
        if (!userId) {
          userId = authData?.session?.user?.id
          console.log('🔍 패턴3 (session.user.id):', userId || 'null')
        }
        
        if (!userId && authData?.access_token) {
          console.log('🔍 패턴4: Supabase access_token에서 추출 시도')
          try {
            const payload = JSON.parse(atob(authData.access_token.split('.')[1]))
            userId = payload?.sub
            console.log('🔍 패턴4 결과:', userId || 'null')
          } catch (e) {
            console.log('❌ 패턴4 실패:', e.message)
          }
        }
      } else {
        console.log('⚠️ Supabase 인증 키를 찾을 수 없습니다 (JWT 방식만 사용)')
      }
    }
    
    if (!userId) {
      console.log('❌ userId를 찾을 수 없습니다')
      console.log('💡 힌트: JWT 토큰에 userId 정보가 없거나 형식이 다릅니다')
      return { authenticated: false, userId: null, accessToken: null }
    }
    
    console.log('✅ 인증 정보 추출 완료:', { userId, hasToken: true })
    return { authenticated: true, userId, accessToken }
    
  } catch (error) {
    console.error('❌ 인증 정보 추출 실패:', error)
    console.error('❌ 에러 상세:', error.message)
    return { authenticated: false, userId: null, accessToken: null, error: error.message }
  }
}

// 확장 프로그램으로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 메시지 수신:', request)
  
  if (request.action === 'getAuthInfo') {
    const authInfo = getAuthInfo()
    console.log('✅ 인증 정보 전달:', authInfo)
    sendResponse(authInfo)
  }
  
  return true // 비동기 응답을 위해 true 반환
})

// 페이지 로드 시 인증 정보를 Chrome Storage에 저장
window.addEventListener('load', () => {
  const authInfo = getAuthInfo()
  
  if (authInfo.authenticated) {
    chrome.storage.local.set({ 
      userId: authInfo.userId,
      accessToken: authInfo.accessToken,  // 🆕 토큰도 함께 저장
      lastUpdated: Date.now()
    }, () => {
      console.log('✅ 인증 정보 Chrome Storage에 저장됨 (userId + accessToken)')
    })
  }
})

console.log('✅ Content Script 초기화 완료')
