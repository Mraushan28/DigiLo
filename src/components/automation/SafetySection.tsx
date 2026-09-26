"use client";

import { motion } from "framer-motion";
import { Eye, ShieldCheck, Beaker } from "lucide-react";

const columns = [
  {
    icon: <Eye className="w-6 h-6" />,
    title: "REVIEW",
    desc: "See exactly what DIGILO plans to do."
  },
  {
    icon: <Beaker className="w-6 h-6" />,
    title: "TEST",
    desc: "Validate the workflow before it touches real data."
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "APPROVE",
    desc: "Nothing important goes live without your approval."
  }
];

export default function SafetySection() {
  return (
    <section className="py-32 px-6 bg-background text-foreground border-b border-foreground/10">
      <div className="container mx-auto max-w-7xl">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20 text-center flex flex-col items-center"
        >
          <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-6 block">
            Control & Safety
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter">
            YOU STAY IN CONTROL.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {columns.map((col, idx) => (
            <motion.div 
              key={col.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-full border border-foreground/20 flex items-center justify-center mb-8 text-foreground group-hover:text-accent group-hover:border-accent transition-colors duration-500">
                {col.icon}
              </div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-4">
                {col.title}
              </h3>
              <p className="text-foreground/70 font-medium max-w-xs leading-relaxed">
                {col.desc}
              </p>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
