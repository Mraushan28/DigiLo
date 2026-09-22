"use client";

import { useState } from "react";

const services = [
  {
    id: "01",
    title: "Graphic Design",
    description: "Brand Identity, Logo Design, Marketing Materials, UI/Visual Design, and Creative Campaigns.",
  },
  {
    id: "02",
    title: "Video Editing",
    description: "Social Media Videos, YouTube Reels, Motion Graphics, and Corporate Advertisements.",
  },
  {
    id: "03",
    title: "Web Development",
    description: "Business Websites, Landing Pages, E-commerce, Web Applications, and Custom Platforms.",
  },
  {
    id: "04",
    title: "Bulk Contracts",
    description: "Recurring project requirements, agency-to-agency collaboration, and dedicated project teams.",
  },
  {
    id: "05",
    title: "AI & Automation",
    description: "Automate repetitive work, connect your tools, and build intelligent workflows that help your business move faster.",
    visual: (
      <div className="flex items-center gap-3 mt-4 text-accent opacity-80">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-[pulse_3s_ease-in-out_infinite]">
          <rect x="2" y="14" width="6" height="6" rx="1" />
          <rect x="16" y="14" width="6" height="6" rx="1" />
          <rect x="9" y="4" width="6" height="6" rx="1" />
          <path d="M5 14v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" className="animate-[dash_2s_linear_infinite]" style={{ strokeDasharray: '4', strokeDashoffset: '0' }} />
          <path d="M12 10V10" />
        </svg>
        <div className="h-[1px] w-8 bg-accent/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-full bg-accent animate-[translateX_2s_linear_infinite] -translate-x-full"></div>
        </div>
      </div>
    )
  },
];

export default function Services() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section id="services" className="py-32 px-6 relative border-t border-foreground/10">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-24">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight">Services</h2>
          <p className="max-w-md text-foreground/60 mt-4 md:mt-0 text-lg">
            We operate at the intersection of design, motion, and technology to deliver premium digital solutions.
          </p>
        </div>

        <div className="flex flex-col border-t border-foreground/20">
          {services.map((service) => (
            <div
              key={service.id}
              onMouseEnter={() => setHovered(service.id)}
              onMouseLeave={() => setHovered(null)}
              className="group relative flex flex-col md:flex-row md:items-center justify-between py-12 border-b border-foreground/20 cursor-pointer transition-colors duration-500 hover:bg-foreground/5 px-4 md:px-8 -mx-4 md:-mx-8"
            >
              <div className="flex items-center gap-8 md:gap-16">
                <span className="text-xl md:text-3xl font-mono text-foreground/40 group-hover:text-accent transition-colors duration-300">
                  {service.id}
                </span>
                <h3 className="text-3xl md:text-6xl font-bold uppercase tracking-tighter">
                  {service.title}
                </h3>
              </div>
              
              <div className={`mt-6 md:mt-0 md:max-w-md overflow-hidden transition-all duration-500 ease-in-out ${
                hovered === service.id ? 'opacity-100 max-h-60 md:translate-x-0' : 'opacity-60 max-h-20 md:opacity-0 md:translate-x-8'
              }`}>
                <p className="text-foreground/80 text-lg">{service.description}</p>
                {'visual' in service && service.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
