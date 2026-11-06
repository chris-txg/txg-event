import ScrollProgress from "@/components/landing/ScrollProgress";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyUs from "@/components/landing/WhyUs";
import Footer from "@/components/landing/Footer";

export default function Home() {
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
