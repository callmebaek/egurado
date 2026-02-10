'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
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
            환불정책 (Refund Policy)
          </h1>
          <p className="text-sm text-neutral-500 mb-2">
            공고일자: 2026년 2월 9일
          </p>
          <p className="text-sm text-neutral-500 mb-8">
            시행일자: 2026년 2월 9일
          </p>

          <p className="text-sm md:text-base text-neutral-700 leading-relaxed mb-10">
            본 환불정책은 주식회사 노느니(이하 &ldquo;회사&rdquo;)가 운영하는
            윕플(whiplace.com) 서비스(이하 &ldquo;서비스&rdquo;)의 유료 구독
            서비스 이용과 관련된 환불 기준을 규정합니다.
          </p>

          <div className="space-y-10 text-sm md:text-base text-neutral-700 leading-relaxed">
            {/* 1. 서비스 유형 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                1. 서비스 유형
              </h2>
              <p>
                윕플은 월 단위 자동결제 방식의 SaaS(Software as a Service)
                구독형 디지털 서비스입니다.
              </p>
              <p className="mt-2">결제 즉시 서비스 이용이 개시됩니다.</p>
            </section>

            {/* 2. 청약철회 및 환불 원칙 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                2. 청약철회 및 환불 원칙
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 본 서비스는 디지털 콘텐츠 및 SaaS 서비스의 특성상, 결제
                  완료와 동시에 서비스가 제공되므로 전자상거래법 제17조 제2항에
                  따라 청약철회(환불)가 제한될 수 있습니다.
                </li>
                <li>
                  ② 회원이 결제 후 서비스를 이용한 경우, 해당 결제 건에
                  대해서는 원칙적으로 환불이 제공되지 않습니다.
                </li>
              </ol>
            </section>

            {/* 3. 환불이 제한되는 경우 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                3. 환불이 제한되는 경우
              </h2>
              <p className="mb-3">
                다음 각 호에 해당하는 경우 환불이 불가합니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  결제 후 서비스 이용 이력이 존재하는 경우
                  <br />
                  <span className="text-sm text-neutral-500">
                    (로그인, 기능 사용, 데이터 조회, 알림 설정 등)
                  </span>
                </li>
                <li>결제일 이후 단순 변심에 의한 해지 요청</li>
                <li>
                  서비스 이용 환경, 외부 플랫폼 정책 변경 등에 대한 불만
                </li>
              </ul>
            </section>

            {/* 4. 예외적 환불이 가능한 경우 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                4. 예외적 환불이 가능한 경우
              </h2>
              <p className="mb-3">
                다음의 경우에는 관계 법령에 따라 환불이 이루어질 수 있습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  회사의 귀책사유로 서비스 제공이 현저히 불가능한 경우
                </li>
                <li>결제 이후 서비스 자체가 제공되지 않은 경우</li>
                <li>법령상 환불이 필수적으로 요구되는 경우</li>
              </ul>
            </section>

            {/* 5. 중복결제 및 오결제 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                5. 중복결제 및 오결제
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 시스템 오류 또는 결제 수단의 장애 등으로 인해 동일 건에
                  대해 중복결제가 발생한 경우, 회사는 확인 후 중복된 금액을 즉시
                  환불합니다.
                </li>
                <li>
                  ② 회원의 실수 등으로 의도하지 않은 결제가 이루어진 경우,
                  서비스 이용 이력이 없는 것이 확인되면 환불이 가능합니다.
                </li>
              </ol>
            </section>

            {/* 6. 미성년자 결제 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                6. 미성년자 결제
              </h2>
              <p>
                미성년자가 법정대리인의 동의 없이 유료서비스를 결제한 경우,
                민법 제5조에 따라 미성년자 본인 또는 법정대리인이 해당 결제를
                취소할 수 있습니다. 단, 미성년자가 성년자로 위장하거나
                법정대리인의 동의가 있었던 것으로 믿게 한 경우에는 취소가
                제한될 수 있습니다.
              </p>
            </section>

            {/* 7. 구독 해지 및 결제 종료 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                7. 구독 해지 및 결제 종료
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회원은 언제든지 서비스 내 설정을 통해 구독을 해지할 수
                  있습니다.
                </li>
                <li>
                  ② 해지는 다음 결제일부터 적용되며, 이미 결제된 이용 기간
                  동안은 정상적으로 서비스를 이용할 수 있습니다.
                </li>
                <li>
                  ③ 해지 시, 이미 결제된 이용 요금은 환불되지 않습니다.
                </li>
              </ol>
            </section>

            {/* 8. 자동결제 관련 안내 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                8. 자동결제 관련 안내
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 유료 서비스는 월 단위 자동결제로 운영됩니다.
                </li>
                <li>
                  ② 회원은 결제 시 자동결제 방식에 동의한 것으로 간주됩니다.
                </li>
                <li>
                  ③ 결제 실패, 결제수단 변경 등으로 인한 불이익에 대한 책임은
                  회원에게 있습니다.
                </li>
              </ol>
            </section>

            {/* 9. 환불 요청 방법 및 처리 기간 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                9. 환불 요청 방법 및 처리 기간
              </h2>
              <p className="mb-3">
                환불 관련 문의는 아래 고객센터를 통해 접수할 수 있습니다.
              </p>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-1.5 mb-4">
                <p>
                  <span className="font-semibold text-neutral-800">
                    이메일:
                  </span>{' '}
                  <a
                    href="mailto:business@whiplace.com"
                    className="text-[#405D99] hover:underline"
                  >
                    business@whiplace.com
                  </a>
                </p>
                <p>
                  <span className="font-semibold text-neutral-800">
                    전화번호:
                  </span>{' '}
                  010-8431-6128
                </p>
              </div>
              <ol className="list-none space-y-3">
                <li>
                  ① 환불 요청 접수 후, 회사는 영업일 기준 <strong>3일 이내</strong>에
                  환불 가능 여부를 안내합니다.
                </li>
                <li>
                  ② 환불이 승인된 경우, 승인일로부터 영업일 기준{' '}
                  <strong>7일 이내</strong>에 원래 결제 수단으로 환급됩니다.
                </li>
                <li>
                  ③ 결제 수단에 따라 환급 소요 기간이 상이할 수 있으며, 카드사
                  또는 결제 대행사의 사정에 따라 추가 기간이 소요될 수 있습니다.
                </li>
              </ol>
              <p className="mt-4 text-sm text-neutral-500">
                ※ 환불 가능 여부는 본 환불정책 및 관련 법령에 따라 판단됩니다.
              </p>
            </section>

            {/* 10. 정책의 변경 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                10. 정책의 변경
              </h2>
              <p>
                본 환불정책은 법령, 서비스 내용, 운영 정책에 따라 변경될 수
                있으며, 변경 시 사전에 서비스 화면을 통해 공지합니다.
              </p>
            </section>

            {/* 부칙 */}
            <section className="pt-4 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                본 환불정책은 2026년 2월 9일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
