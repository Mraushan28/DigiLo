"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, FileText, BarChart3, Users, Network, Briefcase } from "lucide-react";

const examples = [
  {
    title: "Lead Management",
    icon: <Users className="w-5 h-5" />,
    flow: ["New lead", "AI qualification", "CRM", "Sales notification"]
  },
  {
    title: "Customer Support",
    icon: <MessageSquare className="w-5 h-5" />,
    flow: ["Customer message", "AI understands", "Finds answer", "Responds / escalates"]
  },
  {
    title: "Sales Follow-up",
    icon: <Briefcase className="w-5 h-5" />,
    flow: ["New prospect", "Research", "Personalized message", "Follow-up", "CRM update"]
  },
  {
    title: "Document Processing",
    icon: <FileText className="w-5 h-5" />,
    flow: ["Document received", "Extract data", "AI analysis", "Database update"]
  },
  {
    title: "Reporting",
    icon: <BarChart3 className="w-5 h-5" />,
    flow: ["Data collected", "AI analysis", "Generate report", "Send to team"]
  },
  {
    title: "Internal Operations",
    icon: <Network className="w-5 h-5" />,
    flow: ["Task created", "Assign", "Process", "Update", "Notify"]
  }
];

export default function AutomationExamples() {
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
            Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter max-w-3xl">
            WHAT CAN DIGILO AUTOMATE?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((item, idx) => (
            <motion.div 
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group border border-foreground/10 bg-background hover:bg-foreground/5 p-8 transition-colors duration-500 flex flex-col h-full cursor-default"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 border border-foreground/20 flex items-center justify-center text-foreground group-hover:text-accent group-hover:border-accent transition-colors duration-300">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold uppercase tracking-wide">
                  {item.title}
                </h3>
              </div>

              <div className="mt-auto flex flex-col gap-3 relative">
                {/* Connecting subtle line behind the flow items */}
                <div className="absolute left-2.5 top-3 bottom-4 w-[1px] bg-foreground/10 group-hover:bg-accent/30 transition-colors duration-500" />
                
                {item.flow.map((step, stepIdx) => (
                  <div key={stepIdx} className="flex items-center gap-4 relative z-10">
                    <div className="w-5 h-5 rounded-full bg-background border border-foreground/30 flex items-center justify-center group-hover:border-accent/50 transition-colors duration-300 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 group-hover:bg-accent transition-colors duration-300" />
                    </div>
                    <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors duration-300">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
