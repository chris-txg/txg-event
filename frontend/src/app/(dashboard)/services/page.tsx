'use client';

import React from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Sparkles,
  ArrowRight,
  Lock,
  Compass,
  Megaphone,
  Palette,
  ShieldCheck,
  Truck,
} from 'lucide-react';

export default function ServicesPage() {
  const services = [
    {
      title: 'Research & Audience Surveys',
      description:
        'Run targeted audience intelligence, survey campaigns, market viability checks, and attendee sentiment studies.',
      icon: ClipboardList,
      href: '/surveys',
      status: 'active',
      badge: 'Available Now',
    },
    {
      title: 'Venue Sourcing & Management',
      description:
        'Curated event spaces, site inspections, floor-plan design, and real-time vendor capacity booking.',
      icon: Compass,
      status: 'upcoming',
      badge: 'Coming Soon',
    },
    {
      title: 'Brand Activation & PR',
      description:
        'Multi-channel promotional marketing, media outreach, influencer partnerships, and on-site activations.',
      icon: Megaphone,
      status: 'upcoming',
      badge: 'Coming Soon',
    },
    {
      title: 'Creative Stage & AV Design',
      description:
        'Audio-visual staging, acoustics, lighting choreography, and immersive digital stage installations.',
      icon: Palette,
      status: 'upcoming',
      badge: 'Coming Soon',
    },
    {
      title: 'Event Security & Protocol',
      description:
        'VIP handling protocols, crowd security, perimeter protection, and emergency management plans.',
      icon: ShieldCheck,
      status: 'upcoming',
      badge: 'Coming Soon',
    },
    {
      title: 'Logistics & Hospitality',
      description:
        'Guest transit, executive accommodation, backstage catering, and inventory freight management.',
      icon: Truck,
      status: 'upcoming',
      badge: 'Coming Soon',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9DDE1]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F4E5EA] text-[#762D46] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A84A63]" />
            Enterprise Event Solutions
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#30232A] tracking-tight">
            Event Management Services
          </h1>
          <p className="text-sm text-[#75666D] mt-1 max-w-2xl">
            Select a specialized service domain to plan, orchestrate, and assess your global events.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => {
          const Icon = svc.icon;
          const isActive = svc.status === 'active';

          if (isActive && svc.href) {
            return (
              <Link
                key={svc.title}
                href={svc.href}
                className="group relative bg-white rounded-2xl p-6 border border-[#E9DDE1] hover:border-[#762D46] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F4E5EA] text-[#762D46] group-hover:bg-[#762D46] group-hover:text-white flex items-center justify-center transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#30232A] group-hover:text-[#762D46] transition-colors mb-2">
                    {svc.title}
                  </h3>
                  <p className="text-sm text-[#75666D] leading-relaxed">
                    {svc.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F8EFF2] flex items-center justify-between text-sm font-semibold text-[#762D46]">
                  <span>Launch Module</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          }

          return (
            <div
              key={svc.title}
              className="relative bg-white/70 rounded-2xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between opacity-80"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {svc.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-stone-700 mb-2">
                  {svc.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {svc.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-400">
                <span>Under Development</span>
                <Lock className="w-3.5 h-3.5 text-stone-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
