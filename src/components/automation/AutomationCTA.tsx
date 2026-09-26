"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageSquare } from "lucide-react";
import { siteConfig } from "@/lib/config";

export default function AutomationCTA() {
  return (
    <section className="py-40 px-6 bg-background text-foreground text-center relative overflow-hidden group">
      
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(204,255,0,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] group-hover:bg-[position:100%_100%] transition-all duration-[4s] ease-out" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '4rem 4rem' }} />

      <div className="container mx-auto max-w-5xl relative z-10 flex flex-col items-center">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-8 block">
            Start Automating
          </span>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter uppercase mb-8 leading-[0.9]">
            WHAT DOES YOUR <br className="hidden md:block" />
            TEAM DO MANUALLY?
          </h2>
          <p className="text-lg md:text-xl mb-12 text-foreground/70 max-w-2xl font-medium">
            Tell DIGILO how your business works. We&apos;ll show you what can be automated.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <button className="group/btn flex items-center justify-center gap-4 bg-accent text-background px-8 py-5 text-sm md:text-base font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors duration-300">
              Start Building 
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-2" />
            </button>
            <a 
              href={`https://wa.me/${siteConfig.whatsAppNumber.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-4 bg-transparent border border-foreground/20 text-foreground px-8 py-5 text-sm md:text-base font-bold uppercase tracking-[0.2em] hover:bg-foreground/5 transition-colors duration-300"
            >
              <MessageSquare className="w-5 h-5" />
              Talk to DIGILO
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
