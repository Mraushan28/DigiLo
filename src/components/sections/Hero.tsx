"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Database, MessageSquare, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-4 md:px-8 relative overflow-hidden bg-[#0A0A0A] text-white">
      {/* Background subtle radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-[#C8FF00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Animated Workflow Visual Graphic */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-4xl mx-auto flex flex-row items-center justify-between mb-12 px-3 md:px-6 py-4 md:py-6 border border-[#222222] bg-[#111111]/90 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden"
        >
          <div 
            className="absolute inset-0 opacity-[0.04]" 
            style={{ 
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
              backgroundSize: '1rem 1rem' 
            }} 
          />
          
          <WorkflowNode 
            stepNum="TRIGGER" 
            label="WEBHOOK" 
            sub="Receives: lead_submitted"
            icon={<Zap className="w-5 h-5 text-[#C8FF00]" />} 
            highlight 
          />
          <WorkflowConnector />
          <WorkflowNode 
            stepNum="STEP 1" 
            label="AI ANALYSIS" 
            sub="Classifies: Hot/Warm/Cold"
            icon={<Sparkles className="w-5 h-5 text-[#3B82F6]" />} 
          />
          <WorkflowConnector />
          <WorkflowNode 
            stepNum="STEP 2" 
            label="GOOGLE SHEETS" 
            sub="Sheet: CRM → Tab: Leads"
            icon={<Database className="w-5 h-5 text-[#22C55E]" />} 
          />
          <WorkflowConnector />
          <WorkflowNode 
            stepNum="STEP 3" 
            label="SLACK" 
            sub="Channel: #leads"
            icon={<MessageSquare className="w-5 h-5 text-[#A855F7]" />} 
          />
        </motion.div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1A1A1A] border border-[#222222] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#C8FF00] animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C8FF00] font-bold">
            DIGILO AI AUTOMATION ENGINE
          </span>
        </div>

        {/* Master Headline (PRD v3.1 Spec) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6 uppercase max-w-5xl mx-auto text-white">
          Automate Your Business.<br />
          <span className="text-[#C8FF00]">Just Describe It.</span>
        </h1>
        
        {/* Subheadline (PRD v3.1 Spec) */}
        <p className="text-base sm:text-xl md:text-2xl font-normal mb-8 max-w-3xl px-4 text-[#A0A0A0] leading-relaxed">
          Type what you want automated. DIGILO AI builds the workflow, connects your tools, and makes it live — in minutes.
        </p>
        
        {/* CTAs Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto mb-6">
          <Link 
            href="/automation" 
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-[#C8FF00] hover:bg-[#b2e600] text-black px-8 py-4 text-sm font-bold uppercase tracking-wider rounded transition-all shadow-lg shadow-[#C8FF00]/15"
          >
            Start Building Free <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#how-it-works" 
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-transparent border border-white hover:border-[#C8FF00] text-white hover:text-[#C8FF00] px-8 py-4 text-sm font-bold uppercase tracking-wider rounded transition-all"
          >
            Watch Demo
          </a>
        </div>

        {/* Trust Text (PRD v3.1 Spec) */}
        <p className="text-xs font-mono uppercase tracking-wider text-[#555555] flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
          No credit card. No code. No technical skills needed.
        </p>

      </div>
    </section>
  );
}

function WorkflowNode({ 
  stepNum, 
  label, 
  sub, 
  icon, 
  highlight = false 
}: { 
  stepNum: string; 
  label: string; 
  sub: string; 
  icon: React.ReactNode; 
  highlight?: boolean; 
}) {
  return (
    <div className={`relative z-10 flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-lg border ${
      highlight 
        ? 'border-l-4 border-l-[#C8FF00] border-[#222222] bg-[#1A1A1A] shadow-md' 
        : 'border-[#222222] bg-[#141414]'
    } transition-all max-w-[130px] sm:max-w-[170px]`}>
      <span className="text-[9px] font-mono uppercase text-[#A0A0A0] tracking-wider mb-1">{stepNum}</span>
      <div className="mb-1.5">{icon}</div>
      <span className="text-[10px] sm:text-xs font-bold tracking-tight uppercase text-white truncate max-w-full">
        {label}
      </span>
      <span className="text-[9px] font-mono text-[#555555] truncate max-w-full mt-0.5 hidden sm:block">
        {sub}
      </span>
    </div>
  );
}

function WorkflowConnector() {
  return (
    <div className="flex flex-1 items-center justify-center relative px-1 sm:px-2">
      <div className="h-[2px] w-full bg-gradient-to-r from-[#222222] via-[#C8FF00]/40 to-[#222222]" />
      <span className="text-[#C8FF00] text-xs font-mono select-none px-1">→</span>
    </div>
  );
}
