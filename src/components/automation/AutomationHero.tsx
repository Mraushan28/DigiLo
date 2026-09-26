"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Play, Zap, ArrowDown } from "lucide-react";

export default function AutomationHero() {
  return (
    <section className="pt-40 pb-24 px-6 relative overflow-hidden border-b border-foreground/10 bg-background text-foreground">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-6 block">
              DIGILO AI AUTOMATION
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter uppercase mb-8 leading-[0.9]">
              Tell Us What You Do. <br className="hidden md:block" />
              We&apos;ll Find What <br className="hidden md:block" />
              to Automate.
            </h1>
            <p className="text-lg md:text-xl text-foreground/70 max-w-xl font-medium mb-12">
              Describe how your business works in plain language. DIGILO analyzes the process, identifies repetitive tasks, and turns them into intelligent automations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <button className="group flex items-center justify-center gap-4 bg-accent text-background px-8 py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors duration-300">
                Describe Your Workflow
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
              </button>
              <button className="flex items-center justify-center gap-4 bg-transparent border border-foreground/20 text-foreground px-8 py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-foreground/5 transition-colors duration-300">
                <Play className="w-4 h-4" />
                See How It Works
              </button>
            </div>
          </motion.div>

          {/* Right Column - Interface Prototype */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="border border-foreground/10 bg-background/50 backdrop-blur-xl p-8 relative overflow-hidden">
              
              {/* Subtle top gradient */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

              <div className="mb-6">
                <label className="text-xs font-mono uppercase tracking-[0.1em] text-foreground/50 mb-3 block">Describe your process</label>
                <div className="p-4 border border-foreground/10 bg-foreground/5 text-foreground/80 font-medium leading-relaxed">
                  "Whenever a new lead comes from my website, save it to Google Sheets, analyze it with AI and notify my sales team on Slack."
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 bg-foreground/10 hover:bg-foreground/20 text-foreground py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors duration-300 mb-8 border border-foreground/10">
                <Zap className="w-4 h-4 text-accent" />
                Generate Automation
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* AI Analysis State */}
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-[0.1em] text-foreground/50 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    DIGILO AI UNDERSTANDS
                  </h3>
                  <ul className="space-y-3">
                    {['Trigger detected', 'Data processing required', 'AI analysis required', 'Notification required'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-accent shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Automation Plan */}
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-[0.1em] text-foreground/50 mb-4">
                    AUTOMATION PLAN
                  </h3>
                  <div className="flex flex-col">
                    {['Website Lead', 'Google Sheets', 'AI Qualification', 'Slack Notification'].map((step, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-full text-center border border-foreground/10 bg-background py-2 text-xs font-medium text-foreground/90 uppercase tracking-widest">
                          {step}
                        </div>
                        {i < 3 && <ArrowDown className="w-4 h-4 text-foreground/30 my-2" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
