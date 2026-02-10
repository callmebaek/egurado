'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
            윕플(Whiplace) 이용약관
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            시행일자: 2026년 2월 10일
          </p>

          <div className="space-y-10 text-sm md:text-base text-neutral-700 leading-relaxed">
            {/* 제1조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제1조 (목적)
              </h2>
              <p>
                본 약관은 주식회사 노느니(이하 &ldquo;회사&rdquo;)가 운영하는
                윕플(whiplace.com) 서비스(이하 &ldquo;서비스&rdquo;)의 이용과
                관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한
                사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제2조 (용어의 정의)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  <span className="font-semibold text-neutral-800">
                    ① &ldquo;서비스&rdquo;
                  </span>
                  란 회사가 제공하는 자영업자·소상공인을 위한 온라인 플랫폼 매장
                  관리 및 분석 SaaS를 의미합니다.
                </li>
                <li>
                  <span className="font-semibold text-neutral-800">
                    ② &ldquo;회원&rdquo;
                  </span>
                  이란 본 약관에 동의하고 회사가 제공하는 절차에 따라 가입하여
                  서비스를 이용하는 자를 말합니다.
                </li>
                <li>
                  <span className="font-semibold text-neutral-800">
                    ③ &ldquo;유료서비스&rdquo;
                  </span>
                  란 회사가 제공하는 월 구독형 유료 기능을 의미합니다.
                </li>
                <li>
                  <span className="font-semibold text-neutral-800">
                    ④ &ldquo;결제일&rdquo;
                  </span>
                  이란 유료서비스 이용을 위해 최초 결제가 이루어진 날 또는
                  정기결제가 이루어지는 날을 의미합니다.
                </li>
              </ol>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제3조 (약관의 효력 및 변경)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 본 약관은 서비스 화면에 게시하거나 기타 합리적인 방법으로
                  회원에게 공지함으로써 효력이 발생합니다.
                </li>
                <li>
                  ② 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수
                  있으며, 변경 시 적용일자 및 변경 내용을 사전에 공지합니다.
                </li>
                <li>
                  ③ 회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을
                  중단하고 회원탈퇴를 할 수 있습니다.
                </li>
              </ol>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제4조 (서비스의 성격 및 한계)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 본 서비스는 매장 관리 편의 및 정보 분석을 목적으로 제공되는
                  제3자 SaaS 서비스입니다.
                </li>
                <li>
                  ② 본 서비스는 네이버(Naver)와 공식적으로 제휴되거나 인증된
                  서비스가 아닙니다.
                </li>
                <li>
                  ③ 회사는 외부 플랫폼의 정책 변경, 시스템 변경, 제한 조치 등으로
                  인한 서비스 일부 또는 전체의 이용 제한에 대해 책임을 부담하지
                  않습니다.
                </li>
              </ol>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제5조 (회원가입)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회원가입은 이메일 주소 또는 휴대전화번호를 통한 인증 절차를
                  거쳐 이루어집니다.
                </li>
                <li>
                  ② 회원은 정확하고 최신의 정보를 제공해야 하며, 허위 정보
                  제공으로 발생하는 불이익은 회원 본인에게 귀속됩니다.
                </li>
              </ol>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제6조 (유료서비스 및 정기결제)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 유료서비스는 월 단위 구독 방식의 자동결제 서비스로
                  제공됩니다.
                </li>
                <li>
                  ② 회원은 결제 시 자동결제 방식에 동의한 것으로 간주됩니다.
                </li>
                <li>
                  ③ 구독 해지는 언제든지 가능하며, 다음 결제일 이전에 해지한
                  경우 추가 요금은 청구되지 않습니다.
                </li>
                <li>
                  ④ 결제일 이후 해지하는 경우, 이미 결제된 이용 요금은
                  환불되지 않습니다(단, 법령상 환불이 요구되는 경우는 예외).
                </li>
              </ol>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제7조 (청약철회 및 환불)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 본 서비스는 디지털 콘텐츠 및 SaaS 서비스의 특성상, 결제
                  즉시 서비스 이용이 개시됩니다.
                </li>
                <li>
                  ② 회원이 결제 후 서비스를 이용한 경우, 전자상거래법 제17조
                  제2항에 따라 청약철회 및 환불이 제한될 수 있습니다.
                </li>
                <li>
                  ③ 다만, 회사의 귀책사유로 서비스 제공이 현저히 불가능한
                  경우에는 관계 법령에 따라 환불이 이루어질 수 있습니다.
                </li>
              </ol>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제8조 (알림 서비스 및 수신 동의)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회사는 서비스 제공의 일환으로 문자(SMS), 카카오톡, 이메일
                  등을 통한 알림 서비스를 제공할 수 있습니다.
                </li>
                <li>
                  ② 알림 수신 여부는 회원이 서비스 내 설정을 통해 직접
                  선택합니다.
                </li>
                <li>
                  ③ 회원이 알림 수신을 설정한 경우, 해당 수단을 통한 알림
                  수신에 명시적으로 동의한 것으로 간주합니다.
                </li>
              </ol>
            </section>

            {/* 제9조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제9조 (지식재산권)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 서비스에 포함된 소프트웨어, 디자인, 텍스트, 이미지, 데이터
                  분석 결과물 등 일체의 콘텐츠에 대한 저작권 및 지식재산권은
                  회사에 귀속됩니다.
                </li>
                <li>
                  ② 회원은 회사의 사전 서면 동의 없이 서비스의 전부 또는 일부를
                  복제, 배포, 전송, 출판, 방송, 기타 방법으로 이용하거나 제3자에게
                  이용하게 할 수 없습니다.
                </li>
              </ol>
            </section>

            {/* 제10조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제10조 (회원의 의무)
              </h2>
              <p className="mb-3">
                회원은 다음 각 호의 행위를 하여서는 안 됩니다.
              </p>
              <ol className="list-none space-y-2 pl-2">
                <li>① 타인의 개인정보 또는 계정을 도용하는 행위</li>
                <li>
                  ② 서비스 운영을 방해하거나 시스템에 과부하를 발생시키는 행위
                </li>
                <li>
                  ③ 회사의 사전 동의 없이 서비스를 무단으로 크롤링, 스크래핑,
                  자동 수집하는 행위
                </li>
                <li>④ 관련 법령 또는 본 약관을 위반하는 행위</li>
              </ol>
            </section>

            {/* 제11조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제11조 (계정 해지 및 탈퇴)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회원이 서비스 탈퇴를 원하는 경우, 서비스 내 고객센터를 통해
                  탈퇴를 요청할 수 있습니다. 회사는 회원의 데이터 보존 현황을
                  확인한 후 탈퇴 절차를 안내합니다.
                </li>
                <li>
                  ② 회사는 회원이 본 약관을 위반하거나, 서비스 운영에 중대한
                  지장을 초래하는 경우, 사전 통지 후 해당 회원의 서비스 이용을
                  제한하거나 계정을 해지할 수 있습니다.
                </li>
                <li>
                  ③ 계정 해지 또는 탈퇴 시, 회원의 데이터(추적 키워드 설정,
                  수집 데이터 등)는 관련 법령 및 회사 내부 정책에 따라 일정 기간
                  보관 후 삭제됩니다.
                </li>
              </ol>
            </section>

            {/* 제12조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제12조 (개인정보보호)
              </h2>
              <p>
                회원의 개인정보 수집, 이용, 보관 및 파기 등에 관한 사항은 회사가
                별도로 정한{' '}
                <Link
                  href="/privacy"
                  className="text-[#405D99] hover:underline font-medium"
                >
                  개인정보처리방침
                </Link>
                에 따릅니다.
              </p>
            </section>

            {/* 제13조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제13조 (서비스 제공의 중단)
              </h2>
              <p className="mb-3">
                회사는 다음 각 호의 사유가 발생한 경우 서비스 제공을 일시적으로
                중단할 수 있습니다.
              </p>
              <ol className="list-none space-y-2 pl-2">
                <li>① 시스템 점검 또는 유지보수</li>
                <li>② 통신 장애 또는 외부 서비스 장애</li>
                <li>③ 천재지변 등 불가항력적 사유</li>
              </ol>
            </section>

            {/* 제14조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제14조 (책임의 제한)
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회사는 회원이 서비스를 통해 얻은 정보의 정확성, 완전성,
                  특정 목적 적합성을 보장하지 않습니다.
                </li>
                <li>
                  ② 회사는 회원의 영업 성과, 매출, 순위 변화 등에 대해 어떠한
                  보증도 하지 않습니다.
                </li>
              </ol>
            </section>

            {/* 제15조 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                제15조 (준거법 및 관할)
              </h2>
              <p>
                본 약관은 대한민국 법률을 준거법으로 하며, 본 약관과 관련하여
                발생한 분쟁은 회사 본점 소재지를 관할하는 법원을 전속관할로
                합니다.
              </p>
            </section>

            {/* 부칙 */}
            <section className="pt-4 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                본 약관은 2026년 2월 10일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
