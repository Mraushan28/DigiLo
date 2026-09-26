"use client";

import { motion } from "framer-motion";

const metrics = [
  { value: "42.5", label: "HOURS SAVED" },
  { value: "1,248", label: "TASKS AUTOMATED" },
  { value: "3,820", label: "PROCESSES RUN" },
  { value: "17", label: "ISSUES DETECTED" },
];

export default function ImpactMetrics() {
  return (
    <section className="py-32 px-6 bg-background text-foreground border-b border-foreground/10 relative overflow-hidden">
      <div className="container mx-auto max-w-7xl relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20 flex flex-col items-center text-center"
        >
          <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-6 block">
            Impact / ROI
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter">
            SEE WHAT YOU&apos;RE <br className="hidden md:block" />
            GETTING BACK.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-16">
          {metrics.map((metric, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col items-center justify-center border border-foreground/10 bg-foreground/5 py-12 px-4 hover:border-accent/50 hover:bg-accent/5 transition-colors duration-500"
            >
              <span className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-accent mb-4">
                {metric.value}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/70 text-center">
                {metric.label}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-xs font-mono text-foreground/40 uppercase tracking-widest">
            * Estimated metrics based on workflow activity.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
