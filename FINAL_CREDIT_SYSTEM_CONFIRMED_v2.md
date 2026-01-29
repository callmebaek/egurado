# 크레딧 시스템 최종 확정 사항 (v2 - 완전 확정)

## 📅 확정일: 2026-01-29
## ✅ 상태: **완전 확정 (개발 착수 가능)**

---

## ✅ 1. Tier별 월 크레딧 (최종 확정)

| Tier | 월 크레딧 | 매장 수 | 키워드 수 | 자동수집 | 월 가격 | 타겟 사용자 |
|------|----------|---------|----------|---------|---------|----------|
| **Free** | **100** | 1개 | 1개 | ❌ 0개 | 무료 | 신규 유저, 테스트 |
| **Basic** | **600** | 3개 | 10개 | ✅ 3개 | TBD | 일반 사용자 (주 2-3회 사용) |
| **Basic+** | **1,200** | 4개 | 6개 | ✅ 6개 | TBD | 빡시게 플레이스 관리하는 사람 |
| **Pro** | **3,000** | 10개 | 50개 | ✅ 15개 | TBD | 파워 유저, 다점포 관리자 |
| **Custom** | **협의** | 협의 | 협의 | 협의 | 협의 | 대형 매장, 프랜차이즈 |
| **God** | **무제한** | 무제한 | 무제한 | 무제한 | - | 관리자 전용 |

---

## ✅ 2. 자동수집 제한 정책 (최종 확정)

| Tier | 최대 키워드 수 | 하루 수집 횟수 | 권장 설정 | 예상 월 소비 |
|------|--------------|--------------|----------|------------|
| **Free** | **0개** | - | - | - |
| **Basic** | **3개** | **제한 없음** | 3개 × 1회/일 | 450 cr (75%) |
| **Basic+** | **6개** | **제한 없음** | 6개 × 1회/일 | 900 cr (75%) |
| **Pro** | **15개** | **제한 없음** | 15개 × 1회/일 | 2,250 cr (75%) |
| **Custom** | **협의** | **제한 없음** | 협의 | 협의 |
| **God** | **무제한** | **제한 없음** | - | - |

---

## ✅ 3. 크레딧 리셋 정책 (최종 확정)

### 3.1 리셋 기준
- **결제일 기준** 리셋
- 예시: 1월 15일 결제 → 매월 15일 00:00에 크레딧 리셋

### 3.2 크레딧 이월 정책
| 크레딧 유형 | 이월 여부 |
|-----------|---------|
| **월 구독 크레딧** | ❌ **이월 불가** (매달 리셋 시 소멸) |
| **수동 충전 크레딧** | ✅ **이월 가능** (소진될 때까지 유지) |

### 3.3 크레딧 사용 우선순위
1. **월 구독 크레딧** 먼저 사용 (이월 안 되므로)
2. **수동 충전 크레딧** 나중에 사용 (이월 가능)

---

## ✅ 4. 크레딧 부족 시 정책 (최종 확정)

### 4.1 기본 정책
> **크레딧이 0이면 모든 기능 사용 불가**

- 크레딧이 부족하면 해당 기능 실행 차단
- 특정 기능 우선순위 없음 (모든 기능 평등하게 차단)
- 자동수집도 크레딧 0일 때 일시 중지

### 4.2 기능 실행 전 확인 모달 (필수 구현)

#### 📋 모달 UI 플로우

```
┌────────────────────────────────────────────────────────────┐
│                    [기능명] 실행                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  💎 예상 크레딧 소비                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  기능: 리뷰 분석                                             │
│  리뷰 수: 100개                                              │
│                                                             │
│  예상 크레딧: 25 크레딧                                       │
│                                                             │
│  현재 보유: 150 크레딧                                        │
│  실행 후 잔액: 125 크레딧                                     │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  [ 취소 ]                           [ 실행 (25 cr 차감) ]   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### ⚠️ 크레딧 부족 시 모달

```
┌────────────────────────────────────────────────────────────┐
│                    ⚠️ 크레딧 부족                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  이 기능을 사용하기에 크레딧이 부족합니다.                     │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  기능: 리뷰 분석                                             │
│  필요 크레딧: 25 크레딧                                       │
│                                                             │
│  현재 보유: 10 크레딧                                         │
│  부족: 15 크레딧                                             │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  💡 크레딧을 충전하거나 Tier를 업그레이드하세요.               │
│                                                             │
│  다음 리셋: 2026-02-01 (3일 후)                              │
│  리셋 시 충전: 600 크레딧 (Basic Tier)                        │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  [ 닫기 ]    [ 💎 크레딧 충전 ]    [ 🚀 Tier 업그레이드 ]    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### 🔔 자동수집 크레딧 부족 시 알림

```
┌────────────────────────────────────────────────────────────┐
│              🔔 자동수집이 일시 중지되었습니다                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  크레딧 부족으로 자동수집이 일시 중지되었습니다.               │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  중지된 키워드: 3개                                           │
│  - 강남 피부과                                               │
│  - 홍대 카페                                                 │
│  - 압구정 네일샵                                             │
│                                                             │
│  중지 시각: 2026-01-25 14:35                                 │
│                                                             │
│  현재 크레딧: 0 / 600                                        │
│  다음 리셋: 2026-02-01 (7일 후)                              │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  💡 크레딧 충전 또는 리셋 후 자동으로 재개됩니다.              │
│                                                             │
│  [ 확인 ]         [ 💎 크레딧 충전 ]         [ 설정 변경 ]    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ 5. 수동 충전 크레딧 정책 (최종 확정)

| 항목 | 정책 |
|------|------|
| **단가** | 추후 결정 (TBD) |
| **이월** | ✅ **가능** (사용할 때까지 유지) |
| **사용 우선순위** | 월 구독 크레딧 다음 (2순위) |
| **유효기간** | 무제한 (소진될 때까지) |
| **환불** | 추후 정책 결정 필요 |

### 수동 충전 크레딧 단가 제안 (참고용)

| 크레딧 | 가격 (제안) | 단가 | 할인율 |
|--------|----------|------|--------|
| 100 cr | 10,000원 | 100원/cr | - |
| 500 cr | 40,000원 | 80원/cr | 20% |
| 1,000 cr | 70,000원 | 70원/cr | 30% |
| 5,000 cr | 300,000원 | 60원/cr | 40% |

---

## 📊 6. Basic+ Tier 상세 분석 (최종 확정)

### 6.1 Basic+ Tier 스펙
```
월 크레딧: 1,200
매장 수: 4개
키워드 수: 6개
자동수집: 6개
타겟: 베이직보다 빡시게 플레이스 관리하는 사람
특징: 자동수집 본격 활용
```

### 6.2 Basic+ 사용 패턴 (월 1,200 크레딧)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
추천 사용 패턴 (75% 사용 = 900 크레딧)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 자동수집: 6개 × 하루 1회 × 30일
  └─ 6 × 1 × 30 × 5cr = 900 크레딧 (75%)

✓ 기타 기능용 잔액: 300 크레딧 (25%)
  - 순위조회 수동: 20회 = 100 cr
  - 리뷰 분석: 3회 (50개 리뷰) = 45 cr
  - AI 답글 생성+게시: 50개 = 150 cr
  - 기타: 5 cr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
총 사용: 1,195 크레딧
잔액: 5 크레딧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 결론: 자동수집 6개 + 기타 기능 활발히 사용 가능
```

### 6.3 Basic vs Basic+ vs Pro 비교

| 항목 | Basic | Basic+ | Pro |
|------|-------|--------|-----|
| **월 크레딧** | 600 | 1,200 | 3,000 |
| **매장** | 3개 | 4개 | 10개 |
| **키워드** | 10개 | 6개 | 50개 |
| **자동수집** | 3개 | 6개 | 15개 |
| **권장 자동수집** | 3개 × 1회 | 6개 × 1회 | 15개 × 1회 |
| **자동수집 크레딧** | 450 (75%) | 900 (75%) | 2,250 (75%) |
| **기타 기능 잔액** | 150 (25%) | 300 (25%) | 750 (25%) |
| **타겟** | 일반 사용자 | 빡시게 관리 | 파워 유저 |
| **사용 빈도** | 주 2-3회 | 매일 | 매일 + 다점포 |

---

## 🎯 7. 구현 우선순위 (개발 로드맵)

### Phase 1: DB & 기본 크레딧 시스템 (1-2주) ⭐ 최우선
```sql
-- user_credits 테이블
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    tier TEXT NOT NULL, -- 'free', 'basic', 'basic_plus', 'pro', 'custom', 'god'
    
    -- 월 구독 크레딧
    monthly_credits INTEGER NOT NULL DEFAULT 0,
    monthly_used INTEGER NOT NULL DEFAULT 0,
    monthly_reset_date DATE NOT NULL, -- 결제일
    
    -- 수동 충전 크레딧 (이월 가능)
    manual_credits INTEGER NOT NULL DEFAULT 0,
    
    -- 합계 (읽기 전용)
    total_remaining INTEGER GENERATED ALWAYS AS (
        (monthly_credits - monthly_used) + manual_credits
    ) STORED,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- credit_transactions 테이블
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    feature TEXT NOT NULL, -- 'rank_check', 'review_analysis', etc.
    credits_used INTEGER NOT NULL,
    
    -- 어떤 크레딧에서 차감했는지
    from_monthly INTEGER DEFAULT 0,
    from_manual INTEGER DEFAULT 0,
    
    -- 메타데이터
    metadata JSONB, -- {keyword: "강남 피부과", review_count: 100, etc.}
    
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2: 크레딧 체크 & 차감 미들웨어 (1주)
```python
# backend/app/middleware/credit_middleware.py

async def check_credits_before_action(
    user_id: str,
    feature: str,
    estimated_credits: int
) -> dict:
    """
    기능 실행 전 크레딧 체크
    
    Returns:
        {
            "sufficient": bool,
            "current_credits": int,
            "needed_credits": int,
            "shortage": int,
            "next_reset": str
        }
    """
    credits = get_user_credits(user_id)
    
    remaining = credits.total_remaining
    sufficient = remaining >= estimated_credits
    
    return {
        "sufficient": sufficient,
        "current_credits": remaining,
        "needed_credits": estimated_credits,
        "shortage": max(0, estimated_credits - remaining),
        "next_reset": credits.monthly_reset_date.isoformat()
    }


async def deduct_credits_after_success(
    user_id: str,
    feature: str,
    credits_used: int,
    metadata: dict = None
):
    """
    API 호출 성공 후 크레딧 차감
    
    우선순위:
    1. 월 구독 크레딧 (monthly) 먼저 사용
    2. 수동 충전 크레딧 (manual) 나중에 사용
    """
    credits = get_user_credits(user_id)
    
    # 월 구독 크레딧에서 먼저 차감
    monthly_available = credits.monthly_credits - credits.monthly_used
    from_monthly = min(credits_used, monthly_available)
    from_manual = credits_used - from_monthly
    
    # 트랜잭션 기록
    create_transaction(
        user_id=user_id,
        feature=feature,
        credits_used=credits_used,
        from_monthly=from_monthly,
        from_manual=from_manual,
        metadata=metadata,
        status='completed'
    )
    
    # 크레딧 차감
    update_user_credits(
        user_id=user_id,
        monthly_used_increment=from_monthly,
        manual_credits_decrement=from_manual
    )
```

### Phase 3: 프론트엔드 확인 모달 (1주)
```typescript
// frontend/components/CreditConfirmModal.tsx

interface CreditConfirmModalProps {
  feature: string;
  estimatedCredits: number;
  metadata?: Record<string, any>;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function CreditConfirmModal({
  feature,
  estimatedCredits,
  metadata,
  onConfirm,
  onCancel
}: CreditConfirmModalProps) {
  const { data: creditCheck } = useQuery({
    queryKey: ['credits', 'check', feature, estimatedCredits],
    queryFn: async () => {
      const res = await api.credits.check({
        feature,
        estimatedCredits
      });
      return res.data;
    }
  });

  if (!creditCheck) return null;

  // 크레딧 부족
  if (!creditCheck.sufficient) {
    return (
      <InsufficientCreditsModal
        needed={creditCheck.needed_credits}
        current={creditCheck.current_credits}
        shortage={creditCheck.shortage}
        nextReset={creditCheck.next_reset}
      />
    );
  }

  // 크레딧 충분
  return (
    <ConfirmModal
      feature={feature}
      estimatedCredits={estimatedCredits}
      currentCredits={creditCheck.current_credits}
      remainingAfter={creditCheck.current_credits - estimatedCredits}
      metadata={metadata}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
```

### Phase 4: 자동수집 크레딧 관리 (1주)
```python
# backend/app/services/auto_collection_service.py

async def run_auto_collection():
    """
    스케줄러에서 실행되는 자동수집
    크레딧 체크 후 실행
    """
    # 오늘 실행해야 할 자동수집 작업들
    jobs = get_pending_auto_collection_jobs()
    
    for job in jobs:
        user_id = job.user_id
        keyword = job.keyword
        
        # 크레딧 체크
        credit_check = await check_credits_before_action(
            user_id=user_id,
            feature='auto_rank_check',
            estimated_credits=10  # 최대 크레딧 (안전하게)
        )
        
        if not credit_check['sufficient']:
            # 크레딧 부족 → 일시 중지 + 알림
            pause_auto_collection(job.id)
            send_notification(
                user_id=user_id,
                type='auto_collection_paused',
                data={
                    'keyword': keyword,
                    'shortage': credit_check['shortage'],
                    'next_reset': credit_check['next_reset']
                }
            )
            logger.info(f"Auto collection paused: user={user_id}, keyword={keyword}")
            continue
        
        # 크레딧 충분 → 실행
        try:
            result = await rank_service.check_rank(keyword, job.place_id)
            actual_credits = calculate_actual_credits(result['rank'])
            
            # 크레딧 차감
            await deduct_credits_after_success(
                user_id=user_id,
                feature='auto_rank_check',
                credits_used=actual_credits,
                metadata={
                    'keyword': keyword,
                    'rank': result['rank']
                }
            )
            
            logger.info(f"Auto collection success: user={user_id}, keyword={keyword}, credits={actual_credits}")
            
        except Exception as e:
            logger.error(f"Auto collection failed: {e}")
            # 실패 시 크레딧 차감 안 함
```

### Phase 5: 크레딧 리셋 스케줄러 (1주)
```python
# backend/app/tasks/credit_reset.py

async def daily_credit_reset_check():
    """
    매일 00:00에 실행
    오늘이 리셋 날짜인 유저들의 크레딧 리셋
    """
    today = date.today()
    
    # 오늘 리셋해야 할 유저들
    users_to_reset = get_users_with_reset_date(today)
    
    for user in users_to_reset:
        # 월 구독 크레딧 리셋 (수동 충전 크레딧은 유지)
        reset_monthly_credits(
            user_id=user.id,
            tier=user.tier
        )
        
        # 자동수집 재개 (일시 중지된 경우)
        resume_paused_auto_collections(user.id)
        
        # 알림 발송
        send_notification(
            user_id=user.id,
            type='credits_reset',
            data={
                'new_credits': get_tier_credits(user.tier),
                'reset_date': today.isoformat()
            }
        )
        
        logger.info(f"Credits reset: user={user.id}, tier={user.tier}")
```

### Phase 6: Header/Sidebar 크레딧 표시 (3일)
```typescript
// frontend/components/CreditBadge.tsx

export function CreditBadge() {
  const { data: credits, refetch } = useQuery({
    queryKey: ['user', 'credits'],
    queryFn: async () => {
      const res = await api.users.getCredits();
      return res.data;
    },
    refetchInterval: 30000 // 30초마다 갱신
  });

  if (!credits) return null;

  const remaining = credits.total_remaining;
  const monthly = credits.monthly_credits - credits.monthly_used;
  const manual = credits.manual_credits;
  const percentage = (remaining / credits.monthly_credits) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            percentage < 20 && "text-red-500",
            percentage < 50 && percentage >= 20 && "text-yellow-500"
          )}
        >
          💎 {remaining.toLocaleString()}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">크레딧 잔액</h4>
            <p className="text-2xl font-bold">{remaining.toLocaleString()} cr</p>
          </div>
          
          <Separator />
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">월 구독 크레딧</span>
              <span className="font-medium">{monthly.toLocaleString()} cr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">수동 충전 크레딧</span>
              <span className="font-medium">{manual.toLocaleString()} cr</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-sm text-gray-600">
            다음 리셋: {formatDate(credits.next_reset)}
          </div>
          
          {percentage < 20 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                크레딧이 부족합니다!
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => router.push('/credits/history')}
              className="flex-1"
            >
              사용 내역
            </Button>
            <Button 
              size="sm" 
              onClick={() => router.push('/credits/charge')}
              className="flex-1"
            >
              💎 충전하기
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 📋 8. 최종 체크리스트

### ✅ 완전 확정된 사항
- [x] Tier별 월 크레딧 (Free 100, Basic 600, Basic+ 1200, Pro 3000)
- [x] 자동수집 제한 (Free 0, Basic 3, Basic+ 6, Pro 15)
- [x] 하루 수집 횟수 제한 없음
- [x] 크레딧 리셋: 결제일 기준
- [x] 월 구독 크레딧: 이월 불가
- [x] 수동 충전 크레딧: 이월 가능
- [x] 크레딧 부족 시: 모든 기능 차단
- [x] 기능 실행 전: 모달로 예상 크레딧 표시
- [x] 크레딧 사용 우선순위: 월 구독 → 수동 충전
- [x] Basic+ 스펙 (1200cr, 4매장, 6키워드, 자동수집 6개)

### 🔄 추후 결정 사항
- [ ] Tier별 월 가격
- [ ] 수동 충전 크레딧 단가
- [ ] 수동 충전 크레딧 환불 정책
- [ ] 알림 방식 (이메일/앱 푸시/SMS)

### 🚀 개발 시작 가능
**모든 핵심 정책이 확정되어 개발 착수 가능합니다!**

---

**작성일**: 2026-01-29  
**버전**: v2 (완전 확정)  
**상태**: ✅ **개발 착수 가능**  
**예상 개발 기간**: 5-6주
