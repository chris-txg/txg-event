"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/authentication/context/AuthContext";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/#top" },
    { label: "Services", href: "/#services" },
    { label: "Venues & Providers", href: "/#services" },
    { label: "Research & Surveys", href: "/#services" },
    { label: "Workshops", href: "/#services" },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);
    if (href === "/#top") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (href.startsWith("/#")) {
      e.preventDefault();
      const targetId = href.replace("/#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-[linear-gradient(108deg,#381421_0%,#572037_55%,#702C46_100%)] shadow-[0_10px_28px_rgba(66,24,39,0.22)] border-b border-[rgba(255,235,241,0.22)]"
          : "bg-[linear-gradient(108deg,#421827_0%,#64263D_55%,#7B354F_100%)] shadow-[0_7px_22px_rgba(66,24,39,0.16)] border-b border-[rgba(255,235,241,0.18)]"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 text-white font-extrabold text-[18px] tracking-tight group"
        >
          <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-[#F0D9E1] to-[#D9AEBE] text-[#542037] grid place-items-center font-black text-base shadow-[0_4px_12px_rgba(25,8,15,0.18)] transition-transform duration-200 group-hover:scale-105 group-hover:rotate-[-4deg]">
            E
          </div>
          <span className="text-[#FFF8FA] transition-colors group-hover:text-white">
            Event Manager
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleLinkClick(e, item.href)}
              className="relative text-[13px] font-semibold text-[#F8E9EE] hover:text-white transition-colors duration-200 py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#F0C7D4] after:transition-all after:duration-200 hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="px-4 py-2 text-[13px] font-bold text-[#542037] bg-[#F4E5EA] border border-[#F4E5EA] rounded-xl hover:bg-white hover:border-white shadow-[0_4px_14px_rgba(25,8,15,0.18)] hover:shadow-[0_6px_20px_rgba(25,8,15,0.25)] hover:-translate-y-0.5 transition-all duration-200"
            >
              My Profile ({user?.first_name || 'Account'})
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-[13px] font-semibold text-[#FFF7F9] bg-[rgba(255,255,255,0.09)] border border-[rgba(255,238,244,0.34)] rounded-xl hover:bg-[#F7E8ED] hover:text-[#542037] hover:border-[#F7E8ED] transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-[13px] font-bold text-[#542037] bg-[#F4E5EA] border border-[#F4E5EA] rounded-xl hover:bg-white hover:border-white shadow-[0_4px_14px_rgba(25,8,15,0.18)] hover:shadow-[0_6px_20px_rgba(25,8,15,0.25)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="px-3 py-1.5 text-xs font-semibold text-[#FFF7F9] bg-[rgba(255,255,255,0.09)] border border-[rgba(255,238,244,0.34)] rounded-lg"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-semibold text-[#FFF7F9] bg-[rgba(255,255,255,0.09)] border border-[rgba(255,238,244,0.34)] rounded-lg"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#F8E9EE] rounded-lg hover:bg-white/10"
            aria-label="Toggle navigation"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-5 py-4 bg-[#421827] border-t border-[rgba(255,235,241,0.15)] flex flex-col gap-3">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleLinkClick(e, item.href)}
              className="text-sm font-medium text-[#F8E9EE] hover:text-white py-1.5"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[rgba(255,235,241,0.15)] flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-center text-xs font-bold text-[#542037] bg-[#F4E5EA] rounded-lg"
              >
                My Profile ({user?.first_name || 'Account'})
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-1/2 py-2 text-center text-xs font-semibold text-white bg-white/10 rounded-lg"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-1/2 py-2 text-center text-xs font-bold text-[#542037] bg-[#F4E5EA] rounded-lg"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
