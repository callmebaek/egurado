'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
            개인정보처리방침
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            시행일자: 2026년 2월 9일
          </p>

          <div className="space-y-10 text-sm md:text-base text-neutral-700 leading-relaxed">
            {/* 1. 개인정보의 처리 목적 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                1. 개인정보의 처리 목적
              </h2>
              <p className="mb-3">
                회사는 다음 목적을 위하여 개인정보를 처리합니다.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>회원 가입 및 본인 인증</li>
                <li>서비스 제공 및 유료 결제 처리</li>
                <li>알림 서비스 제공</li>
                <li>서비스 품질 개선 및 데이터 분석</li>
                <li>법령 및 약관 위반 행위 대응</li>
              </ul>
            </section>

            {/* 2. 처리하는 개인정보의 항목 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                2. 처리하는 개인정보의 항목
              </h2>

              <h3 className="font-semibold text-neutral-800 mb-2">
                필수 수집 항목
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 mb-4">
                <li>이메일 주소</li>
                <li>닉네임</li>
                <li>
                  휴대전화번호 (로그인 인증, 비밀번호 변경 인증)
                </li>
              </ul>

              <h3 className="font-semibold text-neutral-800 mb-2">
                자동 수집 항목
              </h3>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>서비스 이용 기록</li>
                <li>접속 로그</li>
                <li>
                  이용 형태, 설정 정보 등 서비스 사용 데이터(메타데이터)
                </li>
              </ul>
            </section>

            {/* 3. 개인정보의 보유 및 이용 기간 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                3. 개인정보의 보유 및 이용 기간
              </h2>
              <p>
                개인정보는 회원 탈퇴 시까지 보유·이용합니다.
              </p>
              <p className="mt-2">
                단, 관련 법령에 따라 보관이 필요한 경우 해당 법령에서 정한 기간
                동안 보관합니다.
              </p>
              <div className="mt-4 bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-800 mb-2 text-sm">
                  법령에 따른 보관 기간
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-600">
                  <li>
                    계약 또는 청약철회 등에 관한 기록: <strong>5년</strong>{' '}
                    (전자상거래 등에서의 소비자보호에 관한 법률)
                  </li>
                  <li>
                    대금결제 및 재화 등의 공급에 관한 기록: <strong>5년</strong>{' '}
                    (전자상거래 등에서의 소비자보호에 관한 법률)
                  </li>
                  <li>
                    소비자의 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong>{' '}
                    (전자상거래 등에서의 소비자보호에 관한 법률)
                  </li>
                  <li>
                    웹사이트 방문 기록(접속 로그): <strong>3개월</strong>{' '}
                    (통신비밀보호법)
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. 개인정보의 제3자 제공 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                4. 개인정보의 제3자 제공
              </h2>
              <p>
                회사는 회원의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
              </p>
              <p className="mt-2">
                다만, 법령에 의한 요청이 있는 경우에는 예외로 합니다.
              </p>
            </section>

            {/* 5. 개인정보 처리의 위탁 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                5. 개인정보 처리의 위탁
              </h2>
              <p>
                회사는 서비스 제공을 위하여 개인정보 처리 업무를 외부 업체에
                위탁할 수 있으며, 이 경우 관련 법령에 따라 관리·감독합니다.
              </p>
            </section>

            {/* 6. 정보주체의 권리 및 행사 방법 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                6. 정보주체의 권리 및 행사 방법
              </h2>
              <p className="mb-3">
                회원은 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수
                있습니다.
              </p>
              <p className="mb-2">
                권리 행사는 다음의 방법으로 가능합니다.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  서비스 내 고객센터(문의사항 페이지)를 통한 요청
                </li>
                <li>
                  이메일 요청:{' '}
                  <a
                    href="mailto:business@whiplace.com"
                    className="text-[#405D99] hover:underline"
                  >
                    business@whiplace.com
                  </a>
                </li>
              </ul>
              <p className="mt-3 text-sm text-neutral-500">
                회사는 요청을 접수한 날로부터 10일 이내에 조치 결과를
                안내합니다.
              </p>
            </section>

            {/* 7. 개인정보의 안전성 확보 조치 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                7. 개인정보의 안전성 확보 조치
              </h2>
              <p className="mb-3">
                회사는 개인정보 보호를 위하여 다음과 같은 관리적·기술적
                보호조치를 시행하고 있습니다.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>비밀번호 암호화:</strong> 회원의 비밀번호는 일방향
                  암호화하여 저장·관리합니다.
                </li>
                <li>
                  <strong>SSL/TLS 통신 암호화:</strong> 데이터 전송 시 암호화된
                  통신(HTTPS)을 적용합니다.
                </li>
                <li>
                  <strong>접근 권한 관리:</strong> 개인정보에 대한 접근 권한을
                  최소한의 인원으로 제한합니다.
                </li>
                <li>
                  <strong>보안 프로그램 운영:</strong> 해킹 등 외부 침입에
                  대비한 보안 시스템을 운영합니다.
                </li>
              </ul>
            </section>

            {/* 8. 쿠키(Cookie)의 사용 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                8. 쿠키(Cookie)의 사용
              </h2>
              <ol className="list-none space-y-3">
                <li>
                  ① 회사는 회원의 로그인 상태 유지, 서비스 이용 환경 개선 등을
                  위하여 쿠키(Cookie)를 사용합니다.
                </li>
                <li>
                  ② 쿠키는 웹사이트 운영에 이용되는 서버가 회원의 브라우저에
                  보내는 소량의 정보로, 회원의 컴퓨터 하드디스크에 저장됩니다.
                </li>
                <li>
                  ③ 회원은 웹 브라우저의 설정을 통해 쿠키의 저장을 거부하거나
                  삭제할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 로그인이
                  필요한 일부 서비스 이용에 제한이 있을 수 있습니다.
                </li>
              </ol>
              <div className="mt-3 bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600">
                <p className="font-semibold text-neutral-800 mb-1">
                  쿠키 설정 거부 방법
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Chrome: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트
                    데이터
                  </li>
                  <li>Safari: 환경설정 → 개인정보 보호 → 쿠키 및 웹사이트 데이터</li>
                  <li>
                    Edge: 설정 → 쿠키 및 사이트 권한 → 쿠키 및 사이트 데이터
                  </li>
                </ul>
              </div>
            </section>

            {/* 9. 만 14세 미만 아동의 개인정보 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                9. 만 14세 미만 아동의 개인정보
              </h2>
              <p>
                회사는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 본
                서비스는 자영업자 및 소상공인을 대상으로 하며, 만 14세 미만의
                아동이 서비스에 가입한 사실이 확인될 경우 해당 계정을 즉시
                삭제합니다.
              </p>
            </section>

            {/* 10. 개인정보 보호책임자 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                10. 개인정보 보호책임자
              </h2>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-1.5">
                <p>
                  <span className="font-semibold text-neutral-800">
                    성명:
                  </span>{' '}
                  백성민
                </p>
                <p>
                  <span className="font-semibold text-neutral-800">
                    직책:
                  </span>{' '}
                  대표이사
                </p>
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
              </div>
            </section>

            {/* 11. 개인정보처리방침의 변경 */}
            <section>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-3">
                11. 개인정보처리방침의 변경
              </h2>
              <p>
                본 방침은 관련 법령 또는 회사 정책 변경 시 개정될 수 있으며,
                변경 시 사전에 공지합니다.
              </p>
            </section>

            {/* 부칙 */}
            <section className="pt-4 border-t border-neutral-200">
              <p className="text-neutral-500 text-sm">
                본 개인정보처리방침은 2026년 2월 9일부터 시행합니다.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
