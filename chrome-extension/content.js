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
    
    // 다양한 Supabase 키 패턴 시도
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
    
    console.log('🔑 찾은 Supabase 키:', supabaseKey)
    console.log('🎯 매칭된 패턴:', matchedPattern)
    
    if (!supabaseKey) {
      console.log('❌ Supabase 인증 키를 찾을 수 없습니다')
      console.log('💡 힌트: localStorage에 Supabase 인증 정보가 있는지 확인하세요')
      return { authenticated: false, userId: null }
    }
    
    const authDataStr = localStorage.getItem(supabaseKey)
    console.log('📄 인증 데이터 길이:', authDataStr?.length || 0)
    
    const authData = JSON.parse(authDataStr)
    console.log('📊 인증 데이터 구조:', Object.keys(authData || {}))
    
    // 다양한 경로로 user ID 찾기
    let userId = null
    
    // 패턴 1: currentSession.user.id
    userId = authData?.currentSession?.user?.id
    console.log('🔍 패턴1 (currentSession.user.id):', userId || 'null')
    
    // 패턴 2: user.id
    if (!userId) {
      userId = authData?.user?.id
      console.log('🔍 패턴2 (user.id):', userId || 'null')
    }
    
    // 패턴 3: session.user.id
    if (!userId) {
      userId = authData?.session?.user?.id
      console.log('🔍 패턴3 (session.user.id):', userId || 'null')
    }
    
    // 패턴 4: access_token에서 추출 (최후의 수단)
    if (!userId && authData?.access_token) {
      console.log('🔍 패턴4: access_token에서 추출 시도')
      try {
        const payload = JSON.parse(atob(authData.access_token.split('.')[1]))
        userId = payload?.sub
        console.log('🔍 패턴4 결과:', userId || 'null')
      } catch (e) {
        console.log('❌ 패턴4 실패:', e.message)
      }
    }
    
    if (!userId) {
      console.log('❌ User ID를 찾을 수 없습니다')
      console.log('📊 전체 인증 데이터:', authData)
      return { authenticated: false, userId: null }
    }
    
    console.log('✅ User ID 추출 성공:', userId)
    return { authenticated: true, userId }
    
  } catch (error) {
    console.error('❌ 인증 정보 추출 실패:', error)
    console.error('❌ 에러 상세:', error.message)
    return { authenticated: false, userId: null, error: error.message }
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
      lastUpdated: Date.now()
    }, () => {
      console.log('✅ 인증 정보 Chrome Storage에 저장됨')
    })
  }
})

console.log('✅ Content Script 초기화 완료')
