// 설정
const CONFIG = {
  // API_BASE_URL: 'http://localhost:8000', // 개발 환경
  API_BASE_URL: 'https://api.whiplace.com', // 프로덕션 환경
  FRONTEND_URL: 'https://egurado.vercel.app',
  NAVER_DOMAINS: [
    'https://new.smartplace.naver.com',
    'https://smartplace.naver.com',
    'https://nid.naver.com'
  ]
}

// DOM 요소
const elements = {
  loading: document.getElementById('loading'),
  content: document.getElementById('content'),
  naverStatusIcon: document.getElementById('naverStatusIcon'),
  naverStatusText: document.getElementById('naverStatusText'),
  notLoggedInAlert: document.getElementById('notLoggedInAlert'),
  storeSection: document.getElementById('storeSection'),
  storeSelect: document.getElementById('storeSelect'),
  saveButton: document.getElementById('saveButton'),
  saveButtonIcon: document.getElementById('saveButtonIcon'),
  saveButtonText: document.getElementById('saveButtonText'),
  openNaverButton: document.getElementById('openNaverButton'),
  successAlert: document.getElementById('successAlert'),
  errorAlert: document.getElementById('errorAlert'),
  errorMessage: document.getElementById('errorMessage'),
  savedStoreName: document.getElementById('savedStoreName'),
  savedTime: document.getElementById('savedTime')
}

// 상태
let currentStores = []
let selectedStoreId = null
let userId = null

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 팝업 로드됨')
  
  // Footer 링크 설정
  const websiteLink = document.getElementById('websiteLink')
  if (websiteLink) {
    websiteLink.href = CONFIG.FRONTEND_URL
  }
  
  try {
    // 1. 사용자 인증 확인
    await checkAuthentication()
    
    // 2. 네이버 로그인 상태 확인
    const isNaverLoggedIn = await checkNaverLogin()
    
    // 3. UI 업데이트
    updateUI(isNaverLoggedIn)
    
  } catch (error) {
    console.error('❌ 초기화 오류:', error)
    showError('초기화 중 오류가 발생했습니다.')
  } finally {
    elements.loading.classList.add('hidden')
    elements.content.classList.remove('hidden')
  }
})

// 사용자 인증 확인
async function checkAuthentication() {
  try {
    // Chrome Storage에서 사용자 ID 확인
    const result = await chrome.storage.local.get(['userId', 'lastUpdated'])
    
    console.log('📦 Chrome Storage:', result)
    
    if (!result.userId) {
      throw new Error('로그인이 필요합니다')
    }
    
    // 1시간 이상 경과 시 재확인 필요
    const now = Date.now()
    if (result.lastUpdated && (now - result.lastUpdated > 3600000)) {
      console.log('⚠️ 인증 정보가 오래되었습니다. 웹사이트를 새로고침해주세요.')
    }
    
    userId = result.userId
    console.log('✅ 사용자 인증 확인:', userId)
    
    // 매장 목록 로드
    await loadStores()
    
  } catch (error) {
    console.error('❌ 인증 오류:', error)
    showError('로그인이 필요합니다. 웹사이트(localhost:3000)에 접속하여 로그인한 후 다시 시도해주세요.')
    throw error
  }
}

// 매장 목록 로드
async function loadStores() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/v1/stores/?user_id=${userId}`)
    
    if (!response.ok) {
      throw new Error('매장 목록을 불러올 수 없습니다')
    }
    
    const data = await response.json()
    currentStores = data.stores || []
    
    // 네이버 매장만 필터링
    currentStores = currentStores.filter(store => store.platform === 'naver')
    
    if (currentStores.length === 0) {
      showError('등록된 네이버 매장이 없습니다. 먼저 매장을 등록해주세요.')
      return
    }
    
    // 셀렉트 박스 채우기
    elements.storeSelect.innerHTML = '<option value="">매장을 선택하세요...</option>'
    currentStores.forEach(store => {
      const option = document.createElement('option')
      option.value = store.id
      option.textContent = store.store_name || store.name
      elements.storeSelect.appendChild(option)
    })
    
    console.log('✅ 매장 목록 로드 완료:', currentStores.length)
    
  } catch (error) {
    console.error('❌ 매장 로드 오류:', error)
    showError('매장 목록을 불러오는 중 오류가 발생했습니다.')
  }
}

// 네이버 로그인 상태 확인
async function checkNaverLogin() {
  try {
    // 네이버 쿠키 확인
    const cookies = await chrome.cookies.getAll({
      domain: '.naver.com'
    })
    
    console.log('🍪 네이버 쿠키 개수:', cookies.length)
    
    // 주요 인증 쿠키 확인
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name === 'NID_AUT' || 
      cookie.name === 'NID_SES' ||
      cookie.name === 'nid_inf'
    )
    
    if (hasAuthCookie) {
      console.log('✅ 네이버 로그인 감지됨')
      return true
    } else {
      console.log('❌ 네이버 로그인 안 됨')
      return false
    }
    
  } catch (error) {
    console.error('❌ 로그인 확인 오류:', error)
    return false
  }
}

// UI 업데이트
function updateUI(isNaverLoggedIn) {
  if (isNaverLoggedIn) {
    // 로그인됨
    elements.naverStatusIcon.textContent = '✅'
    elements.naverStatusText.textContent = '네이버 로그인 감지됨'
    elements.naverStatusText.classList.add('status-success')
    elements.naverStatusText.classList.remove('status-error')
    
    elements.notLoggedInAlert.classList.add('hidden')
    elements.storeSection.classList.remove('hidden')
    elements.saveButton.classList.remove('hidden')
    elements.openNaverButton.classList.add('hidden')
    
  } else {
    // 로그인 안 됨
    elements.naverStatusIcon.textContent = '❌'
    elements.naverStatusText.textContent = '네이버 로그인 필요'
    elements.naverStatusText.classList.add('status-error')
    elements.naverStatusText.classList.remove('status-success')
    
    elements.notLoggedInAlert.classList.remove('hidden')
    elements.storeSection.classList.add('hidden')
    elements.saveButton.classList.add('hidden')
    elements.openNaverButton.classList.remove('hidden')
  }
}

// 매장 선택 이벤트
elements.storeSelect.addEventListener('change', (e) => {
  selectedStoreId = e.target.value
  elements.saveButton.disabled = !selectedStoreId
  console.log('📍 매장 선택:', selectedStoreId)
})

// 저장 버튼 클릭
elements.saveButton.addEventListener('click', async () => {
  if (!selectedStoreId) {
    showError('매장을 선택해주세요.')
    return
  }
  
  console.log('💾 세션 저장 시작...')
  
  // 버튼 상태 변경
  elements.saveButton.disabled = true
  elements.saveButtonIcon.innerHTML = '<div class="spinner"></div>'
  elements.saveButtonText.textContent = '저장 중...'
  
  try {
    // 1. 네이버 쿠키 추출
    const cookies = await chrome.cookies.getAll({
      domain: '.naver.com'
    })
    
    if (cookies.length === 0) {
      throw new Error('네이버 쿠키를 찾을 수 없습니다. 다시 로그인해주세요.')
    }
    
    console.log('🍪 쿠키 추출 완료:', cookies.length)
    
    // #region agent log
    // Debug: Check critical cookies
    const criticalCookies = cookies.filter(c => c.name === 'NID_AUT' || c.name === 'NID_SES')
    criticalCookies.forEach(cookie => {
      console.log(`🔍 Critical cookie '${cookie.name}':`, {
        expirationDate: cookie.expirationDate,
        hasExpiration: cookie.expirationDate !== undefined,
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly
      })
      fetch('http://127.0.0.1:7242/ingest/5225ed4a-ae1a-48e3-babe-f4c35d5f29b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:229',message:'Raw cookie from Chrome',data:{name:cookie.name,expirationDate:cookie.expirationDate,hasExpiration:cookie.expirationDate!==undefined,expirationDateType:typeof cookie.expirationDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    })
    // #endregion
    
    // 2. 쿠키를 표준 형식으로 변환
    const formattedCookies = cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expirationDate || null,  // undefined를 null로 변환 (JSON에 포함되도록)
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    }))
    // #region agent log
    const criticalFormatted = formattedCookies.filter(c => c.name === 'NID_AUT' || c.name === 'NID_SES')
    criticalFormatted.forEach(cookie => {
      fetch('http://127.0.0.1:7242/ingest/5225ed4a-ae1a-48e3-babe-f4c35d5f29b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'popup.js:250',message:'Formatted cookie to send',data:{name:cookie.name,expires:cookie.expires,hasExpires:cookie.expires!==undefined,expiresType:typeof cookie.expires},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    })
    // #endregion
    
    // 3. 백엔드 API로 전송
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/v1/naver-session/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        store_id: selectedStoreId,
        cookies: formattedCookies
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || '세션 저장에 실패했습니다')
    }
    
    const result = await response.json()
    console.log('✅ 저장 완료:', result)
    
    // 4. 성공 메시지 표시
    const selectedStore = currentStores.find(s => s.id === selectedStoreId)
    elements.savedStoreName.textContent = selectedStore?.store_name || selectedStore?.name || '알 수 없음'
    elements.savedTime.textContent = new Date().toLocaleString('ko-KR')
    
    elements.successAlert.classList.remove('hidden')
    elements.saveButton.classList.add('hidden')
    elements.storeSection.classList.add('hidden')
    
    // 5. 3초 후 팝업 닫기 (선택사항)
    setTimeout(() => {
      // window.close()
    }, 3000)
    
  } catch (error) {
    console.error('❌ 저장 오류:', error)
    showError(error.message)
    
    // 버튼 복원
    elements.saveButton.disabled = false
    elements.saveButtonIcon.textContent = '💾'
    elements.saveButtonText.textContent = '세션 저장하기'
  }
})

// 네이버 열기 버튼
elements.openNaverButton.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://new.smartplace.naver.com'
  })
  
  // 안내 메시지
  setTimeout(() => {
    alert('로그인 후 다시 확장 프로그램을 열어주세요!')
  }, 500)
})

// 에러 표시
function showError(message) {
  elements.errorMessage.textContent = message
  elements.errorAlert.classList.remove('hidden')
  
  setTimeout(() => {
    elements.errorAlert.classList.add('hidden')
  }, 5000)
}
