import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLanguage } from '../../types/scientific';

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

const QUOTE_COPY: Record<
  SupportedLanguage,
  { quote: string; attribution: string }
> = {
  en: {
    quote:
      'TrendScope was founded on a commitment to scientific truth that honors our changing planet. We transform raw NASA satellite observations from MODIS Terra (MOD13Q1 NDVI & MOD11C3 Day/Night LST) into peer-verifiable statistical evidence. No speculation, no fabricated trends — just rigorous Earth system intelligence that proves where change is real.',
    attribution:
      'TRENDSCOPE AI — NASA Space Apps Challenge • DISCOVER → INVESTIGATE → UNDERSTAND',
  },
  ar: {
    quote:
      'تأسست منصة TrendScope على التزام صارم بالحقيقة العلمية لرصد كوكبنا المتغير. نحن نحول أرصاد أقمار ناسا الصناعية من مهمتي MODIS MOD13Q1 للغطاء النباتي و MOD11C3 لحرارة سطح الأرض (نهاراً وليلاً) إلى أدلة إحصائية رصينة وقابلة للتحقق. لا تخمين ولا اتجاهات مختلقة — بل ذكاء كوكبي دقيق يثبت أين يحدث التغير الحقيقي.',
    attribution:
      'TRENDSCOPE AI — تحدي ناسا لتطبيقات الفضاء • اكتشف ← حقّق ← افهم',
  },
  de: {
    quote:
      'TrendScope wurde auf dem Anspruch wissenschaftlicher Präzision gegründet, um unseren sich verändernden Planeten zu verstehen. Wir verwandeln NASA-Satellitenbeobachtungen von MODIS Terra (MOD13Q1 NDVI & MOD11C3 Tag/Nacht LST) in überprüfbare statistische Evidenz. Keine Spekulation – sondern fundierte Erdsystem-Intelligenz.',
    attribution:
      'TRENDSCOPE AI — NASA Space Apps Challenge • ENTDECKEN → UNTERSUCHEN → VERSTEHEN',
  },
  fr: {
    quote:
      'TrendScope repose sur un engagement envers la rigueur scientifique face à notre planète en mutation. Nous transformons les observations satellitaires NASA de MODIS Terra (MOD13Q1 NDVI & MOD11C3 LST Jour/Nuit) en preuves statistiques vérifiables. Aucune spéculation — uniquement une intelligence planétaire rigoureuse.',
    attribution:
      'TRENDSCOPE AI — NASA Space Apps Challenge • DÉCOUVRIR → ENQUÊTER → COMPRENDRE',
  },
};

export const QuoteSection: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const content = QUOTE_COPY[lang] || QUOTE_COPY.en;

  const sectionRef = useRef<HTMLElement>(null);
  const rainbowRef = useRef<HTMLImageElement>(null);
  const leftCloudRef = useRef<HTMLImageElement>(null);
  const rightCloudRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    let currentRainbowY = 120;
    let currentLeftX = -200;
    let currentLeftY = 0;
    let currentRightX = 200;
    let currentRightY = 0;

    const animate = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const progress = clamp(
          0,
          1,
          (windowHeight - rect.top) / (windowHeight + rect.height)
        );

        // 1. Rainbow target: +120px to -160px
        const targetRainbowY = 120 - progress * 280;
        currentRainbowY = lerp(currentRainbowY, targetRainbowY, 0.06);

        if (rainbowRef.current) {
          rainbowRef.current.style.transform = `translate3d(0, ${currentRainbowY.toFixed(2)}px, 0)`;
        }

        // 2 & 3. Clouds target: in view when progress is 0.12 - 0.92
        const inView = progress >= 0.12 && progress <= 0.92;
        const targetLeftX = inView ? 0 : -200;
        const targetRightX = inView ? 0 : 200;
        const targetCloudY = progress * -50;

        currentLeftX = lerp(currentLeftX, targetLeftX, 0.04);
        currentLeftY = lerp(currentLeftY, targetCloudY, 0.04);

        currentRightX = lerp(currentRightX, targetRightX, 0.04);
        currentRightY = lerp(currentRightY, targetCloudY, 0.04);

        const leftOpacity = clamp(0, 1, 1 - Math.abs(currentLeftX) / 200);
        const rightOpacity = clamp(0, 1, 1 - Math.abs(currentRightX) / 200);

        if (leftCloudRef.current) {
          leftCloudRef.current.style.transform = `translate3d(${currentLeftX.toFixed(2)}px, ${currentLeftY.toFixed(2)}px, 0)`;
          leftCloudRef.current.style.opacity = leftOpacity.toFixed(3);
        }

        if (rightCloudRef.current) {
          rightCloudRef.current.style.transform = `translate3d(${currentRightX.toFixed(2)}px, ${currentRightY.toFixed(2)}px, 0) scaleX(-1)`;
          rightCloudRef.current.style.opacity = rightOpacity.toFixed(3);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      id="quote-section"
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #010A17 0%, #0A4267 30%, #20658E 60%, #6BADC4 100%)',
      }}
    >
      {/* 1. Rainbow Image */}
      <img
        ref={rainbowRef}
        src="https://soft-zoom-63098134.figma.site/_assets/v11/8d520a7515d06cbfc403d0125e3d05b1a7ccd29c.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 w-full pointer-events-none will-change-transform"
        style={{ transform: 'translate3d(0, 120px, 0)' }}
      />

      {/* 2. Left Cloud */}
      <img
        ref={leftCloudRef}
        src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
        alt=""
        aria-hidden="true"
        className="absolute left-0 bottom-[10%] z-20 hidden sm:block w-[500px] md:w-[650px] pointer-events-none will-change-transform"
        style={{
          marginLeft: '-50%',
          opacity: 0,
          transform: 'translate3d(-200px, 0, 0)',
        }}
      />

      {/* 3. Right Cloud */}
      <img
        ref={rightCloudRef}
        src="https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png"
        alt=""
        aria-hidden="true"
        className="absolute right-0 bottom-[15%] z-20 hidden sm:block w-[500px] md:w-[650px] pointer-events-none will-change-transform"
        style={{
          marginRight: '-75%',
          opacity: 0,
          transform: 'translate3d(200px, 0, 0) scaleX(-1)',
        }}
      />

      {/* 4. Quote Content Adapted to EARTHPULSE AI — z-40 above rainbow & clouds so every line is crystal clear */}
      <div className="relative z-40 max-w-4xl px-6 pt-24 md:pt-32 text-center">
        <blockquote
          className="font-instrument text-white text-xl sm:text-2xl md:text-4xl lg:text-[42px] leading-[1.45] md:leading-[1.55]"
          style={{
            textShadow: '0 4px 28px rgba(1, 10, 23, 0.85), 0 1px 6px rgba(0, 0, 0, 0.65)',
          }}
        >
          &ldquo;{content.quote}&rdquo;
        </blockquote>

        <p
          className="mt-6 md:mt-8 text-white/95 text-xs sm:text-sm md:text-base rtl:tracking-normal ltr:tracking-widest uppercase rtl:font-sans ltr:font-mono"
          style={{
            textShadow: '0 2px 14px rgba(1, 10, 23, 0.9)',
          }}
        >
          {content.attribution}
        </p>
      </div>
    </section>
  );
};
