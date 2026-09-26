"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "DESCRIBE",
    desc: "Tell DIGILO what happens manually."
  },
  {
    num: "02",
    title: "UNDERSTAND",
    desc: "AI breaks your process into triggers, actions and decisions."
  },
  {
    num: "03",
    title: "BUILD",
    desc: "DIGILO creates the automation workflow."
  },
  {
    num: "04",
    title: "RUN",
    desc: "Approve it, deploy it and let the system handle the work."
  }
];

const visualFlow = [
  "YOUR BUSINESS",
  "DESCRIBE",
  "DIGILO AI",
  "AUTOMATION PLAN",
  "APPROVE",
  "RUN"
];

export default function AutomationSteps() {
  return (
    <section className="py-32 px-6 bg-background text-foreground border-b border-foreground/10 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          
          {/* Left Column - Content */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter mb-6 leading-tight">
                FROM BUSINESS PROCESS <br className="hidden lg:block" />
                <span className="text-foreground/40">TO AUTOMATION.</span>
              </h2>
              <p className="text-lg md:text-xl text-foreground/70 font-medium max-w-xl">
                You don&apos;t need to understand workflows, APIs or automation tools. Just explain what happens in your business.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {steps.map((step, index) => (
                <motion.div 
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group relative"
                >
                  <span className="text-accent font-mono text-xs block mb-4">
                    {step.num} &mdash; {step.title}
                  </span>
                  <div className="h-[1px] w-full bg-foreground/10 group-hover:bg-accent transition-colors duration-500 mb-6" />
                  <p className="text-foreground/80 font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column - Visual Flow */}
          <div className="lg:col-span-4 lg:col-start-9 relative flex justify-center lg:justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-sm border border-foreground/10 bg-background/50 backdrop-blur p-8 relative flex flex-col items-center py-16"
            >
              {/* Vertical line connecting nodes */}
              <div className="absolute top-16 bottom-16 left-1/2 -translate-x-1/2 w-[1px] bg-foreground/10" />

              {visualFlow.map((node, i) => (
                <div key={node} className="relative z-10 flex flex-col items-center w-full">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    className={`px-6 py-3 w-4/5 text-center text-xs font-bold uppercase tracking-widest border transition-colors duration-300
                      ${node === 'DIGILO AI' ? 'bg-accent text-background border-accent' : 'bg-background text-foreground border-foreground/20'}
                    `}
                  >
                    {node}
                  </motion.div>
                  
                  {i < visualFlow.length - 1 && (
                    <div className="py-4 bg-background">
                      <ArrowDown className="w-4 h-4 text-foreground/30" />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
