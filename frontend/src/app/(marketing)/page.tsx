import ScrollProgress from "@/features/landing/components/ScrollProgress";
import Header from "@/features/landing/components/Header";
import Hero from "@/features/landing/components/Hero";
import Services from "@/features/landing/components/Services";
import HowItWorks from "@/features/landing/components/HowItWorks";
import WhyUs from "@/features/landing/components/WhyUs";
import Footer from "@/features/landing/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F8]">
      {/* Scroll indicator along top edge */}
      <ScrollProgress />

      {/* Sticky Burgundy Glass Topbar */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <Hero />
        <Services />
        <HowItWorks />
        <WhyUs />
      </main>

      {/* Burgundy Footer */}
      <Footer />
    </div>
  );
}
