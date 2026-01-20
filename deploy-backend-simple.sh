#!/bin/bash
# AWS EC2 백엔드 간단 배포 스크립트
# SSH 접속 후 서버에서 직접 실행

echo "======================================"
echo "  주요지표 추적 기능 배포"
echo "======================================"
echo ""

echo "Step 1: 최신 코드 가져오기"
cd ~/egurado
git pull origin main

echo ""
echo "Step 2: 백엔드 디렉토리로 이동"
cd backend

echo ""
echo "Step 3: Docker 컨테이너 중지"
docker-compose down

echo ""
echo "Step 4: Docker 이미지 재빌드 및 시작"
docker-compose up -d --build

echo ""
echo "Step 5: 배포 완료 - 상태 확인"
docker-compose ps

echo ""
echo "Step 6: 로그 확인 (최근 100줄)"
docker-compose logs --tail=100

echo ""
echo "======================================"
echo "  ✅ 배포 완료!"
echo "======================================"
echo ""
echo "확인사항:"
echo "  ✅ [OK] Egurado API started"
echo "  ✅ [OK] Scheduler started"  
echo "  ✅ Metric tracking: Every hour (KST)"
echo ""
echo "실시간 로그 보기: docker-compose logs -f"
echo "컨테이너 재시작: docker-compose restart"
echo ""
