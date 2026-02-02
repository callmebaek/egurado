import { TopBanner } from '@/components/landing/TopBanner';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { ServiceIntroSection } from '@/components/landing/ServiceIntroSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { GuaranteeSection } from '@/components/landing/GuaranteeSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 탑 배너 (베타 알림) */}
      <TopBanner />
      
      {/* 헤더 */}
      <LandingHeader />

      {/* 메인 콘텐츠 */}
      <main>
        {/* 히어로 섹션 (TurboTax 스타일 - floating 로그인 카드 포함) */}
        <HeroSection />


        {/* 서비스 소개 */}
        <ServiceIntroSection />

        {/* 가격 */}
        <PricingSection />

        {/* 보장 섹션 (TurboTax 스타일) */}
        <GuaranteeSection />

        {/* About Us */}
        <AboutSection />
      </main>

      {/* 푸터 */}
      <Footer />
    </div>
  );
}
