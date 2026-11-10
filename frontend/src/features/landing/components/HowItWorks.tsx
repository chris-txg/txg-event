export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Research",
      desc: "Validate your event idea and test real audience demand before spending capital.",
    },
    {
      num: "02",
      title: "Plan",
      desc: "Shape the schedule, budget framework, attendee capacity, and critical milestones.",
    },
    {
      num: "03",
      title: "Discover",
      desc: "Find and compare suitable venues, audiovisual teams, caterers, and vendors.",
    },
    {
      num: "04",
      title: "Execute",
      desc: "Coordinate operations, track check-ins, and deliver an unforgettable experience.",
    },
  ];

  return (
    <section className="mt-14 sm:mt-20 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-white/95 to-[#FAF2F5]/95 border border-[#EADDE2] shadow-[0_14px_38px_rgba(74,29,44,0.055)]">
      <div className="mb-8">
        <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#A84A63] mb-1.5">
          Simple process
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#30232A] tracking-tight">
          How it works
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-[#F8EEF1] hover:-translate-y-1 transition-all duration-200"
          >
            {/* Step Number Badge */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F2E2E8] text-[#762D46] font-black text-sm grid place-items-center transition-all duration-200 group-hover:bg-[#762D46] group-hover:text-white group-hover:scale-105 group-hover:rotate-[-4deg]">
              {step.num}
            </div>

            {/* Step text */}
            <div>
              <h3 className="text-base font-bold text-[#30232A] mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-[#75666D] leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
