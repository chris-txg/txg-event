"use client";

import { useRef } from "react";
import Link from "next/link";

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!heroRef.current || !glowRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    glowRef.current.style.left = `${x}px`;
    glowRef.current.style.top = `${y}px`;
    glowRef.current.style.opacity = "1";
  };

  const handlePointerLeave = () => {
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  };

  const scrollToServices = () => {
    const el = document.getElementById("services");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      id="top"
      ref={heroRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative overflow-hidden isolate rounded-[26px] min-h-[440px] px-7 sm:px-12 md:px-16 py-12 sm:py-16 md:py-20 shadow-[0_22px_58px_rgba(66,24,39,0.18)] border border-white/20 transition-all duration-300"
      style={{
        backgroundImage: `
          linear-gradient(108deg, rgba(45, 17, 29, 0.96) 0%, rgba(91, 32, 53, 0.88) 54%, rgba(132, 58, 82, 0.64) 100%),
          url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=85')
        `,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      {/* Pointer glow tracker */}
      <span
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-[1] w-[380px] h-[380px] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 230, 242, 0.45) 0%, rgba(225, 125, 155, 0.22) 40%, rgba(118, 45, 70, 0) 70%)",
        }}
      />

      {/* Background concentric geometric decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[120px] -top-[210px] w-[440px] h-[440px] rounded-full border border-white/10 shadow-[0_0_0_42px_rgba(255,255,255,0.025),0_0_0_88px_rgba(255,255,255,0.02)]"
      />

      <div className="relative z-10 max-w-[760px]">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#F0C7D4] text-[11px] font-bold tracking-wider uppercase mb-5 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#F0C7D4] animate-hero-pulse" />
          A smarter way to bring events to life
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-[58px] font-extrabold text-[#FFF8FA] leading-[1.08] tracking-[-0.045em] mb-5">
          One Platform. Every Event.
          <br className="hidden sm:inline" />
          <span className="text-[#F0C7D4]"> From Research to Reality.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#F8E9EE]/90 leading-relaxed max-w-[660px] mb-8 font-normal">
          Research your event idea, understand your audience, discover trusted
          service providers, and manage your event from planning to execution —
          all in one place.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3.5">
          <Link
            href="/register"
            className="px-6 py-3.5 text-sm font-bold text-white bg-[#8E3855] border border-[#A84A63] rounded-xl hover:bg-[#A84A63] hover:border-[#B85B75] shadow-[0_8px_22px_rgba(27,7,16,0.22)] hover:shadow-[0_12px_28px_rgba(27,7,16,0.32)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 inline-block text-center"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={scrollToServices}
            className="px-6 py-3.5 text-sm font-semibold text-[#FFF8FA] bg-white/10 border border-white/40 rounded-xl hover:bg-white/20 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Explore Our Services
          </button>
        </div>
      </div>
    </section>
  );
}
