# AWS EC2 백엔드 배포 스크립트
# 주요지표 추적 기능 배포

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  AWS EC2 백엔드 배포 시작" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 사용자에게 EC2 정보 입력 받기
Write-Host "📝 EC2 접속 정보를 입력해주세요:" -ForegroundColor Yellow
Write-Host ""

$EC2_IP = Read-Host "EC2 Public IP 주소 (예: 54.123.45.67)"
$KEY_PATH = Read-Host "SSH 키 파일 경로 (예: C:\Users\username\Downloads\egurado-key.pem)"

Write-Host ""
Write-Host "✅ 입력된 정보:" -ForegroundColor Green
Write-Host "  - EC2 IP: $EC2_IP"
Write-Host "  - Key Path: $KEY_PATH"
Write-Host ""

# 확인
$confirm = Read-Host "위 정보로 진행하시겠습니까? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ 배포가 취소되었습니다." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Step 1: SSH 접속 테스트" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# SSH 명령어 생성
$SSH_CMD = "ssh -i `"$KEY_PATH`" ubuntu@$EC2_IP"

Write-Host "🔗 SSH 접속 중..." -ForegroundColor Yellow
Write-Host "명령어: $SSH_CMD" -ForegroundColor Gray
Write-Host ""

# 배포 명령어 생성
$DEPLOY_COMMANDS = @"
echo '======================================'
echo '  Step 2: 최신 코드 가져오기'
echo '======================================'
cd ~/egurado
git pull origin main

echo ''
echo '======================================'
echo '  Step 3: 백엔드 디렉토리 이동'
echo '======================================'
cd backend

echo ''
echo '======================================'
echo '  Step 4: Docker 컨테이너 중지'
echo '======================================'
docker-compose down

echo ''
echo '======================================'
echo '  Step 5: Docker 이미지 재빌드 및 시작'
echo '======================================'
docker-compose up -d --build

echo ''
echo '======================================'
echo '  Step 6: 컨테이너 상태 확인'
echo '======================================'
docker-compose ps

echo ''
echo '======================================'
echo '  Step 7: 로그 확인 (최근 50줄)'
echo '======================================'
docker-compose logs --tail=50

echo ''
echo '======================================'
echo '  ✅ 배포 완료!'
echo '======================================'
echo ''
echo '📝 다음 사항을 확인하세요:'
echo '  1. [OK] Egurado API started 메시지 확인'
echo '  2. [OK] Scheduler started 메시지 확인'
echo '  3. Metric tracking: Every hour (KST) 메시지 확인'
echo ''
echo '🌐 API 엔드포인트 테스트:'
echo '  curl http://localhost:8000/'
echo ''
echo '❌ 문제가 있다면:'
echo '  docker-compose logs -f  (실시간 로그 확인)'
echo ''
"@

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  배포 명령어 실행" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 명령어를 실행합니다:" -ForegroundColor Yellow
Write-Host $DEPLOY_COMMANDS -ForegroundColor Gray
Write-Host ""

# SSH로 명령어 실행
Write-Host "🚀 배포 시작..." -ForegroundColor Green
Write-Host ""

& ssh -i "$KEY_PATH" ubuntu@$EC2_IP $DEPLOY_COMMANDS

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  배포 스크립트 실행 완료" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 웹사이트 테스트:" -ForegroundColor Yellow
Write-Host "  https://whiplace.com/dashboard/naver/metrics-tracker" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 API 문서 확인:" -ForegroundColor Yellow
Write-Host "  https://api.whiplace.com/docs" -ForegroundColor Cyan
Write-Host ""
