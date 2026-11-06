"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(
      activeTab === "login"
        ? "Demo: Signed in successfully! Redirecting..."
        : "Demo: Account registered successfully! Redirecting..."
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-[#FBF7F8]">
      {/* Return to landing link */}
      <div className="w-full max-w-[960px] mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#762D46] hover:text-[#A84A63] transition-colors"
        >
          <span>←</span>
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Left Branded Card */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white flex flex-col justify-between min-h-[460px] bg-gradient-to-br from-[#421827] via-[#5C2337] to-[#7B354F] shadow-[0_16px_40px_rgba(66,24,39,0.18)] border border-white/10">
          {/* Subtle concentric background circle decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 w-64 h-64 rounded-full border border-white/15 shadow-[0_0_0_28px_rgba(255,255,255,0.035),0_0_0_58px_rgba(255,255,255,0.025)]"
          />

          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#421827] grid place-items-center font-black text-base shadow-sm">
              E
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight">
              Event Manager
            </span>
          </Link>

          <div className="relative z-10 my-8">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#F0C7D4] mb-3">
              Plan with confidence
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
              Research first.
              <br />
              Make every event count.
            </h1>
            <p className="text-sm text-[#F8E9EE]/90 leading-relaxed max-w-[380px]">
              Understand your audience, validate demand, and move from idea to
              event with clarity.
            </p>
          </div>

          <div className="text-xs text-[#F0C7D4]/80">
            A connected platform for individuals, professionals, and organisations.
          </div>
        </div>

        {/* Right Form Card */}
        <div className="rounded-3xl p-6 sm:p-8 bg-white border border-[#E9DDE1] shadow-[0_12px_36px_rgba(66,24,39,0.08)] flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-[#E9DDE1] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setStatusMessage(null);
                }}
                className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "login"
                    ? "text-[#762D46] border-[#762D46]"
                    : "text-[#75666D] border-transparent hover:text-[#30232A]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setStatusMessage(null);
                }}
                className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "register"
                    ? "text-[#762D46] border-[#762D46]"
                    : "text-[#75666D] border-transparent hover:text-[#30232A]"
                }`}
              >
                Create account
              </button>
            </div>

            {statusMessage && (
              <div className="mb-4 p-3 rounded-xl bg-[#E8F2E9] text-[#52765F] text-xs font-bold text-center">
                {statusMessage}
              </div>
            )}

            {/* Login Tab */}
            {activeTab === "login" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#30232A]">
                    Welcome back
                  </h2>
                  <p className="text-xs text-[#75666D] mt-0.5">
                    Sign in to continue to your workspace.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#762D46] mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    defaultValue="david@example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/15"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#762D46] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    defaultValue="password123"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-sm text-[#30232A] focus:outline-none focus:border-[#762D46] focus:ring-2 focus:ring-[#762D46]/15"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#75666D] pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded text-[#762D46] focus:ring-[#762D46]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setStatusMessage("Demo: Reset email sent.")}
                    className="text-[#762D46] hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-sm font-bold shadow-[0_4px_14px_rgba(118,45,70,0.2)] hover:shadow-[0_6px_20px_rgba(118,45,70,0.3)] transition-all"
                >
                  Login to workspace
                </button>

                <div className="relative py-1 text-center text-xs text-[#75666D]">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E9DDE1]" />
                  </div>
                  <span className="relative bg-white px-2">or</span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full py-2.5 rounded-xl border border-[#DDE3DA] hover:border-[#C99EAD] bg-white text-xs font-bold text-[#30232A] hover:bg-[#F8EEF1] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </form>
            ) : (
              /* Register Tab */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <h2 className="text-xl font-extrabold text-[#30232A]">
                    Create your account
                  </h2>
                  <p className="text-xs text-[#75666D] mt-0.5">
                    Start your event feasibility & management journey.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#762D46] mb-1">
                      First name
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue="David"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-xs text-[#30232A] focus:outline-none focus:border-[#762D46]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#762D46] mb-1">
                      Last name
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue="Campbell"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-xs text-[#30232A] focus:outline-none focus:border-[#762D46]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#762D46] mb-1">
                    Official email
                  </label>
                  <input
                    type="email"
                    required
                    defaultValue="david@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-xs text-[#30232A] focus:outline-none focus:border-[#762D46]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#762D46] mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      defaultValue="password123"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-xs text-[#30232A] focus:outline-none focus:border-[#762D46]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#762D46] mb-1">
                      Account type
                    </label>
                    <select className="w-full px-3 py-2 rounded-xl border border-[#DDE3DA] bg-[#FFFCFD] text-xs text-[#30232A] focus:outline-none focus:border-[#762D46]">
                      <option>Individual / Professional</option>
                      <option>Corporate Customer</option>
                      <option>Educational Institution</option>
                      <option>Association / Organisation</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#75666D] pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    defaultChecked
                    className="rounded text-[#762D46] focus:ring-[#762D46]"
                  />
                  I agree to the Terms of Service and Privacy Policy.
                </label>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#762D46] hover:bg-[#542037] text-white text-sm font-bold shadow-[0_4px_14px_rgba(118,45,70,0.2)] hover:shadow-[0_6px_20px_rgba(118,45,70,0.3)] transition-all"
                >
                  Create account
                </button>
              </form>
            )}
          </div>

          <p className="text-[11px] text-[#75666D] text-center mt-6">
            Demo workspace · Any credentials will authenticate
          </p>
        </div>
      </div>
    </div>
  );
}

