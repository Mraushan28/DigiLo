"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-24 px-4 md:px-8 relative overflow-hidden">
      <div className="text-center z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Animated Workflow Visual */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-row items-center justify-between mb-16 px-2 md:px-4 py-6 md:py-8 border border-foreground/10 bg-foreground/5 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '1rem 1rem' }}></div>
          
          <WorkflowNode label="FORM" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <WorkflowConnector />
          <WorkflowNode label="AI" highlight icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          <WorkflowConnector />
          <WorkflowNode label="DATABASE" icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          <WorkflowConnector />
          <WorkflowNode label="CRM" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </div>

        <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-bold tracking-tighter leading-[0.9] mb-8 uppercase max-w-5xl mx-auto break-words">
          AUTOMATE THE WORK.<br/>BUILD WHAT&apos;S NEXT.
        </h1>
        
        <p className="text-[clamp(1rem,3vw,1.5rem)] font-medium mb-12 max-w-2xl px-4 text-foreground/80">
          Digilo builds AI-powered automations and software that help businesses work faster, smarter and at scale.
        </p>
        
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6">
          <a href="#services" className="bg-accent text-background px-8 py-4 text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white transition-colors">
            Automate Your Business &rarr;
          </a>
          <a href="#contact" className="bg-transparent border border-foreground/20 text-foreground px-8 py-4 text-sm md:text-base font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors">
            Start a Project &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}

function WorkflowNode({ label, icon, highlight = false }: { label: string, icon: string, highlight?: boolean }) {
  return (
    <div className={`relative z-10 flex flex-col items-center justify-center p-2 sm:p-3 md:p-6 rounded-xl border ${highlight ? 'border-accent bg-accent/10 shadow-[0_0_30px_rgba(204,255,0,0.15)]' : 'border-foreground/20 bg-background'} transition-all`}>
      <svg className={`w-5 h-5 sm:w-6 sm:h-6 md:w-12 md:h-12 mb-1 sm:mb-2 md:mb-3 ${highlight ? 'text-accent' : 'text-foreground/70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold tracking-widest uppercase ${highlight ? 'text-accent' : 'text-foreground/70'}`}>
        {label}
      </span>
    </div>
  );
}

function WorkflowConnector() {
  return (
    <div className="flex flex-1 items-center justify-center relative px-1 sm:px-2">
      <div className="h-[2px] w-full bg-foreground/10 relative overflow-hidden">
        <motion.div 
          className="absolute top-0 left-0 h-full w-1/2 bg-accent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="absolute right-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-foreground/20"></div>
    </div>
  );
}
