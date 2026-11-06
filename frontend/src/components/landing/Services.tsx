import Link from "next/link";

export default function Services() {
  const services = [
    {
      title: "Event Management Services",
      desc: "Professional support for planning and executing events. Vendor coordination, budgeting, and comprehensive event operations.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "Event Venues & Service Providers",
      desc: "Discover venues, hotels, caterers, and event suppliers. Compare services, view profiles, and request competitive quotations.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: "Research & Audience Surveys",
      desc: "Validate event ideas before investing. Build tailored questionnaires, collect audience responses, and analyse real demand data.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: "Corporate Workshops & Conferences",
      desc: "Plan professional workshops, seminars, symposiums, and institutional conferences with structured schedules and speaker tracking.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Event Planning & Management",
      desc: "Organise, coordinate, and monitor the complete lifecycle of your event with real-time visibility from milestone to execution.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <section id="services" className="mt-14 sm:mt-20">
      {/* Section Header */}
      <div className="mb-8">
        <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#A84A63] mb-1.5">
          What we do
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#30232A] tracking-tight">
          Everything your event needs
        </h2>
        <p className="text-sm text-[#75666D] mt-1">
          Choose the service that matches your next step.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((item) => (
          <div
            key={item.title}
            className="group relative isolate overflow-hidden flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#E9DDE1] shadow-[0_10px_28px_rgba(66,24,39,0.055)] hover:border-[#D8B9C5] hover:shadow-[0_18px_38px_rgba(74,29,44,0.11)] hover:-translate-y-1.5 transition-all duration-300 min-h-[220px]"
          >
            {/* Top Accent Line expansion */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#762D46] scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100" />

            <div>
              {/* Service Icon */}
              <div className="w-11 h-11 rounded-xl bg-[#F8EFF2] text-[#762D46] grid place-items-center mb-4 transition-all duration-300 group-hover:bg-[#762D46] group-hover:text-white group-hover:scale-105 group-hover:rotate-[-4deg]">
                {item.icon}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-[#30232A] mb-2 leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-[13px] text-[#75666D] leading-relaxed">
                {item.desc}
              </p>
            </div>

            {/* Action link */}
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#762D46] group-hover:text-[#A84A63] transition-colors"
            >
              <span>Explore</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
