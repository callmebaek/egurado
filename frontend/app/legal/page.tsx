'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
            법적고지 (Legal Notice)
          </h1>
          <p className="text-sm text-neutral-500 mb-2">
            공고일자: 2026년 2월 9일
          </p>
          <p className="text-sm text-neutral-500 mb-8">
            시행일자: 2026년 2월 9일
          </p>

          <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-10">
            본 법적고지는 주식회사 노느니(이하 &ldquo;회사&rdquo;)가 운영하는
            윕플(whiplace.com) 서비스(이하 &ldquo;서비스&rdquo;)의 이용과
            관련하여, 서비스의 성격 및 책임 범위를 명확히 고지하기 위한
            문서입니다.
          </p>

          <div className="space-y-10 text-sm md:text-base text-neutral-700 leading-relaxed">
            {/* 1. 서비스의 성격에 대한 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                1. 서비스의 성격에 대한 고지
              </h2>
              <p>
                윕플은 자영업자 및 소상공인을 대상으로 온라인 플랫폼상의 매장
                관리 편의 및 정보 분석을 지원하는 제3자 SaaS(Software as a
                Service)입니다.
              </p>
              <p className="mt-3">
                본 서비스는 회원이 입력하거나 연결한 정보 및 공개 데이터를
                기반으로 정보 분석, 알림, 관리 기능을 제공하며, 외부 플랫폼을
                직접 운영하거나 통제하지 않습니다.
              </p>
            </section>

            {/* 2. 네이버(Naver)와의 관계 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                2. 네이버(Naver)와의 관계 고지
              </h2>
              <p className="mb-3">
                본 서비스는 네이버(Naver)와 공식적으로 제휴, 인증, 승인 또는
                운영 위탁 관계에 있지 않습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  네이버 플레이스 또는 네이버 관련 명칭은 서비스 설명을 위한
                  식별 목적일 뿐, 공식 서비스 또는 파트너십을 의미하지
                  않습니다.
                </li>
                <li>
                  회원은 본 서비스를 네이버의 공식 서비스로 오인하여서는 안
                  됩니다.
                </li>
              </ul>
            </section>

            {/* 3. 성과·순위·노출 보장에 대한 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                3. 성과·순위·노출 보장에 대한 고지
              </h2>
              <p className="mb-3">
                회사는 다음 사항을 보장하지 않습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>검색 순위의 상승 또는 유지</li>
                <li>노출 증가, 방문자 수 증가</li>
                <li>매출, 리뷰 수, 영업 성과 개선</li>
              </ul>
              <p className="mt-3">
                본 서비스에서 제공되는 정보, 분석, 알림, 통계는 의사결정
                참고용 자료이며, 회원의 영업 결과 및 플랫폼 정책 변화에 대한
                책임은 회원에게 있습니다.
              </p>
            </section>

            {/* 4. 데이터 정확성 및 최신성에 대한 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                4. 데이터 정확성 및 최신성에 대한 고지
              </h2>
              <p className="mb-3">
                본 서비스에서 제공되는 데이터 및 분석 결과는 다음 요소에 따라
                제한될 수 있습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>외부 플랫폼의 정책 변경</li>
                <li>공개 데이터의 변경 또는 지연</li>
                <li>수집 환경, 네트워크, 시스템 상태</li>
              </ul>
              <p className="mt-3">
                회사는 데이터의 완전성, 실시간성, 절대적 정확성을 보장하지
                않습니다.
              </p>
            </section>

            {/* 5. 알림 서비스 관련 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                5. 알림 서비스(SMS·카카오톡·이메일) 관련 고지
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 알림 서비스는 회원이 직접 설정한 경우에 한하여
                  제공됩니다.
                </li>
                <li>
                  ② 알림 전달은 통신사, 메신저 사업자, 이메일 서버 등 제3자
                  서비스에 의존합니다.
                </li>
                <li>
                  ③ 다음과 같은 사유로 알림이 지연·미전송될 수 있으며, 회사는
                  이에 대한 책임을 부담하지 않습니다.
                  <ul className="list-disc pl-5 mt-2 space-y-1.5">
                    <li>통신 장애</li>
                    <li>외부 서비스 장애</li>
                    <li>잘못된 연락처 입력</li>
                    <li>회원의 수신 환경 문제</li>
                  </ul>
                </li>
              </ol>
            </section>

            {/* 6. 외부 플랫폼 및 제3자 서비스에 대한 책임 제한 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                6. 외부 플랫폼 및 제3자 서비스에 대한 책임 제한
              </h2>
              <p className="mb-3">
                본 서비스는 외부 플랫폼 및 제3자 서비스의 정책, 시스템, 운영
                방식에 영향을 미치지 않습니다. 외부 플랫폼의 다음과 같은
                사유로 발생하는 문제에 대해 회사는 책임을 지지 않습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>정책 변경</li>
                <li>계정 제한 또는 차단</li>
                <li>서비스 중단</li>
                <li>API 제한 및 구조 변경</li>
              </ul>
            </section>

            {/* 7. 지식재산권 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                7. 지식재산권 고지
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 윕플 서비스에 포함된 소프트웨어, 상표, 로고, 디자인,
                  텍스트, 이미지, 데이터 분석 결과물 등 일체의 콘텐츠에 대한
                  저작권 및 지식재산권은 회사에 귀속됩니다.
                </li>
                <li>
                  ② &ldquo;윕플&rdquo;, &ldquo;Whiplace&rdquo;,
                  &ldquo;/윕플.&rdquo; 등 서비스 명칭 및 로고는 회사의
                  상표(또는 상표 출원 중)이며, 회사의 사전 서면 동의 없이
                  사용할 수 없습니다.
                </li>
                <li>
                  ③ 본 서비스에서 언급되는 네이버, 카카오, 구글 등 제3자
                  상표는 각 해당 기업의 자산이며, 식별 목적으로만
                  사용됩니다.
                </li>
              </ol>
            </section>

            {/* 8. 서비스 변경 및 종료 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                8. 서비스 변경 및 종료
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회사는 운영상, 기술상의 필요에 따라 서비스의 전부 또는
                  일부를 변경하거나 종료할 수 있습니다.
                </li>
                <li>
                  ② 서비스 변경 또는 종료 시, 회사는 서비스 화면 또는 이메일
                  등을 통해 회원에게 <strong>최소 30일 전</strong> 사전
                  공지합니다.
                </li>
                <li>
                  ③ 서비스 종료로 인해 유료서비스 이용이 불가능한 경우,
                  잔여 이용 기간에 대하여 관련 법령 및 이용약관에 따라
                  환불이 이루어질 수 있습니다.
                </li>
              </ol>
            </section>

            {/* 9. 면책 고지 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                9. 면책 고지
              </h2>
              <p className="mb-3">
                회사는 다음과 같은 손해에 대하여 책임을 부담하지 않습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  회원의 서비스 이용 또는 미이용으로 인한 영업 손실
                </li>
                <li>
                  외부 플랫폼 정책 또는 환경 변화로 인한 불이익
                </li>
                <li>회원의 판단 또는 결정에 따라 발생한 결과</li>
              </ul>
              <p className="mt-3">
                다만, 회사의 고의 또는 중대한 과실로 인한 손해 및 관련 법령상
                면책이 허용되지 않는 경우는 제외합니다.
              </p>
            </section>

            {/* 10. 고지의 효력 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                10. 고지의 효력
              </h2>
              <p>
                본 법적고지는 서비스 화면 또는 푸터를 통해 항상 확인할 수
                있으며, 서비스 이용 시 회원은 본 고지에 동의한 것으로
                간주됩니다.
              </p>
            </section>

            {/* 부칙 */}
            <section className="pt-4 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                본 법적고지는 2026년 2월 9일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
