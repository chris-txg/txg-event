"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 h-[3.5px] z-50 pointer-events-none transition-[width] duration-75 ease-out"
      style={{
        width: `${scrollProgress}%`,
        background: "linear-gradient(90deg, #A84A63, #F0C7D4, #FFFFFF, #F0C7D4, #C77C93)",
        boxShadow: "0 0 10px rgba(240, 199, 212, 0.9), 0 0 20px rgba(168, 74, 99, 0.6)",
      }}
    />
  );
}
