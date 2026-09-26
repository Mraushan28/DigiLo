"use client";

import { motion } from "framer-motion";
import { Link2 } from "lucide-react";

const integrations = [
  "Google Sheets",
  "Gmail",
  "Slack",
  "WhatsApp",
  "CRM",
  "Notion",
  "Webhook",
  "OpenAI"
];

export default function IntegrationGrid() {
  return (
    <section className="py-32 px-6 bg-background text-foreground border-b border-foreground/10 relative overflow-hidden">
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '4rem 4rem' }} />

      <div className="container mx-auto max-w-5xl relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-6 block flex items-center justify-center gap-2">
            <Link2 className="w-4 h-4" />
            Integrations
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter mb-6">
            CONNECT THE TOOLS <br className="hidden md:block" />
            YOU ALREADY USE.
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 font-medium max-w-2xl mx-auto">
            DIGILO connects your existing business tools and turns them into one automated workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {integrations.map((tool, idx) => (
            <motion.div
              key={tool}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="group aspect-square md:aspect-auto md:h-32 border border-foreground/10 bg-background/50 backdrop-blur hover:bg-foreground/5 hover:border-accent/50 transition-all duration-300 flex items-center justify-center relative cursor-default overflow-hidden"
            >
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="font-bold uppercase tracking-widest text-foreground/80 group-hover:text-foreground relative z-10 text-center px-4">
                {tool}
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
