// Background Service Worker

console.log('🔧 Background Service Worker 실행됨')

// 설치 이벤트
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🎉 확장 프로그램이 설치되었습니다!')
    
    // 환영 메시지
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '네이버 세션 저장',
      message: '설치 완료! 네이버 스마트플레이스에 로그인한 후 사용하세요.',
      priority: 2
    })
  } else if (details.reason === 'update') {
    console.log('🔄 확장 프로그램이 업데이트되었습니다!')
  }
})

// 메시지 수신 (필요시 사용)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 메시지 수신:', request)
  
  if (request.action === 'getCookies') {
    // 쿠키 가져오기
    chrome.cookies.getAll({ domain: '.naver.com' }, (cookies) => {
      sendResponse({ success: true, cookies })
    })
    return true // 비동기 응답
  }
  
  if (request.action === 'checkLogin') {
    // 로그인 확인
    chrome.cookies.getAll({ domain: '.naver.com' }, (cookies) => {
      const isLoggedIn = cookies.some(cookie => 
        cookie.name === 'NID_AUT' || cookie.name === 'NID_SES'
      )
      sendResponse({ success: true, isLoggedIn })
    })
    return true
  }
})

// 탭 업데이트 감지 (선택사항)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 네이버 페이지에서 로그인 감지
  if (changeInfo.status === 'complete' && tab.url?.includes('naver.com')) {
    console.log('🌐 네이버 페이지 로드 완료:', tab.url)
  }
})
