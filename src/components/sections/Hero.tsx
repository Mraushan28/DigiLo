"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const words = ["DESIGN", "MOTION", "CODE", "SCALE"];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000); // slightly slower for a more premium feel
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-24 px-4 md:px-8 relative overflow-hidden">
      <div className="text-center z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
        
        <div className="relative h-[clamp(4rem,15vw,14rem)] w-full flex items-center justify-center overflow-hidden mb-2 md:mb-6">
          <AnimatePresence mode="wait">
            <motion.h1
              key={words[index]}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute text-[clamp(4rem,18vw,14rem)] font-bold tracking-tighter leading-none uppercase text-accent"
            >
              {words[index]}
            </motion.h1>
          </AnimatePresence>
        </div>

        <h2 className="text-[clamp(4rem,18vw,14rem)] font-bold tracking-tighter leading-none mb-10 md:mb-16 uppercase">
          DIGILO
        </h2>
        
        <p className="text-lg md:text-3xl lg:text-4xl font-medium mb-12 max-w-2xl px-4 text-foreground/90">
          We design. We build. We move ideas forward.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[10px] md:text-xs lg:text-sm font-medium text-foreground/50 tracking-[0.2em] uppercase">
          <span>Graphic Design</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Video</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Web</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Scale</span>
        </div>
      </div>
    </section>
  );
}
