export default function WhyUs() {
  return (
    <section className="mt-14 sm:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      {/* Left Column: Heading & Value Proposition */}
      <div className="py-2">
        <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#A84A63] mb-2">
          Unified Platform
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#30232A] tracking-tight leading-tight mb-4">
          Why Event Manager?
        </h2>
        <p className="text-sm sm:text-base text-[#75666D] leading-relaxed mb-6">
          Bring research, planning, vendor procurement, and live event delivery
          into one connected customer journey. Eliminate guesswork and make
          data-informed decisions before committing major budget resources.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-[#542037]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F4E5EA] text-[#762D46] grid place-items-center text-xs">✓</span>
            Pre-event demand validation
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F4E5EA] text-[#762D46] grid place-items-center text-xs">✓</span>
            Verified venue directory
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F4E5EA] text-[#762D46] grid place-items-center text-xs">✓</span>
            Transparent budget estimates
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#F4E5EA] text-[#762D46] grid place-items-center text-xs">✓</span>
            Live attendee tracking
          </div>
        </div>
      </div>

      {/* Right Column: Support Card */}
      <div className="p-7 sm:p-9 rounded-2xl bg-gradient-to-br from-white to-[#FAF3F6] border border-[#EADDE2] shadow-[0_12px_30px_rgba(74,29,44,0.06)] hover:border-[#D8B9C5] hover:shadow-[0_16px_36px_rgba(74,29,44,0.1)] transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-[#F8EFF2] text-[#762D46] grid place-items-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#30232A] mb-3">
          Self-service or managed support
        </h3>
        <p className="text-sm text-[#75666D] leading-relaxed mb-5">
          Use our intuitive self-service tools independently to survey audiences
          and compare suppliers, or request hands-on event management expertise
          from seasoned coordinators whenever you need additional operational support.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4E5EA] text-[#762D46] text-xs font-bold">
          <span>● Flexible Engagement Models</span>
        </div>
      </div>
    </section>
  );
}

