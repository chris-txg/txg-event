export default function Footer() {
  return (
    <footer className="mt-20 py-10 px-4 bg-[#421827] text-[#F8E9EE] text-center border-t border-[rgba(255,235,241,0.12)]">
      <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-4">
        {/* Brand row */}
        <div className="flex items-center gap-2 font-bold text-base text-white">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F0D9E1] to-[#D9AEBE] text-[#542037] grid place-items-center font-black text-xs">
            E
          </div>
          <span>Event Manager</span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#F0C7D4]">
          <a href="#services" className="hover:text-white transition-colors">
            About Us
          </a>
          <span>·</span>
          <a href="#services" className="hover:text-white transition-colors">
            Contact
          </a>
          <span>·</span>
          <a href="#services" className="hover:text-white transition-colors">
            Services
          </a>
          <span>·</span>
          <a href="#services" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="#services" className="hover:text-white transition-colors">
            Terms of Service
          </a>
        </div>

        {/* Copyright */}
        <p className="text-[11px] text-[#D8B9C5] mt-2">
          © 2026 Event Manager. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
