"use client";

import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, Play, Settings2, Sparkles } from "lucide-react";

const workflowSteps = [
  { type: "TRIGGER", label: "New Website Lead", isAi: false },
  { type: "ACTION", label: "AI Qualification", isAi: true },
  { type: "ACTION", label: "Google Sheets", isAi: false },
  { type: "ACTION", label: "Gmail Notification", isAi: false },
];

export default function WorkflowBuilderPreview() {
  return (
    <section className="py-32 px-6 bg-background text-foreground border-b border-foreground/10">
      <div className="container mx-auto max-w-6xl">
        
        <div className="border border-foreground/20 bg-background overflow-hidden rounded-sm shadow-2xl">
          
          {/* Builder Header */}
          <div className="border-b border-foreground/10 bg-foreground/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-foreground/50" />
              <h2 className="text-sm font-mono uppercase tracking-[0.2em] font-bold">
                AUTOMATION BUILDER
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-foreground/50">Draft</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px]">
            
            {/* Main Canvas */}
            <div className="lg:col-span-3 p-12 lg:p-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative flex flex-col items-center">
              
              <div className="absolute inset-0 bg-background/90" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '2rem 2rem' }} />

              <div className="relative z-10 w-full max-w-sm flex flex-col">
                {workflowSteps.map((step, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-full bg-background border border-foreground/20 p-4 relative group hover:border-accent/50 transition-colors duration-300 cursor-pointer">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 block mb-2">
                        {step.type}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm tracking-wide">
                          {step.label}
                        </span>
                        {step.isAi && (
                          <Sparkles className="w-4 h-4 text-accent" />
                        )}
                      </div>
                    </div>
                    {idx < workflowSteps.length - 1 && (
                      <div className="h-10 flex items-center justify-center">
                        <div className="w-[1px] h-full bg-foreground/20" />
                        <ArrowDown className="w-4 h-4 text-foreground/40 absolute" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="border-t lg:border-t-0 lg:border-l border-foreground/10 bg-background p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.1em] text-foreground/50 mb-6">
                  AUTOMATION STATUS
                </h3>
                
                <ul className="space-y-4 mb-12">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-foreground/40" />
                    <span className="text-sm font-medium tracking-wide">4 steps</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-foreground/40" />
                    <span className="text-sm font-medium tracking-wide">3 integrations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium tracking-wide">AI enabled</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <button className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-foreground/5 transition-colors duration-300 w-full">
                  <Play className="w-4 h-4" />
                  Test Workflow
                </button>
                <button className="flex items-center justify-center gap-2 bg-accent text-background py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors duration-300 w-full">
                  Approve & Deploy
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
