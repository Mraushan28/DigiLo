"use client";

import { motion } from "framer-motion";

export default function Services() {
  return (
    <section id="services" className="py-32 px-6 relative border-t border-foreground/10">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-24">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight">Services</h2>
          <p className="max-w-md text-foreground/60 mt-4 md:mt-0 text-lg">
            We automate repetitive processes, build digital products, and scale technology operations.
          </p>
        </div>

        {/* 01 - AI AUTOMATION - Primary Service (50% Visual Emphasis) */}
        <div className="mb-24 md:mb-32">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 mb-16">
            <div className="lg:w-1/3">
              <span className="text-xl md:text-3xl font-mono text-accent mb-4 block">01</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-none text-accent">
                DIGILO AI<br/>AUTOMATION
              </h3>
            </div>
            <div className="lg:w-2/3">
              <h4 className="text-2xl md:text-4xl font-bold uppercase tracking-tight mb-6">
                AUTOMATE. INTEGRATE. GROW.
              </h4>
              <p className="text-xl md:text-2xl text-foreground/80 font-medium mb-12 max-w-3xl">
                From lead generation to internal operations, Digilo builds AI-powered workflows that connect your tools, eliminate repetitive tasks and help your team focus on higher-value work.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-foreground/20">
                <ServiceDetail title="AI Agents" desc="Intelligent agents designed to handle specific tasks and operations autonomously." />
                <ServiceDetail title="WhatsApp Automation" desc="Automate customer interactions, notifications, and sales flows directly on WhatsApp." />
                <ServiceDetail title="AI Voice Agents" desc="Deploy conversational AI voice agents for inbound and outbound calls." />
                <ServiceDetail title="Lead & Sales Automation" desc="Capture, qualify, enrich and route leads automatically." />
                <ServiceDetail title="CRM Automation" desc="Automatically update, organize and manage customer data." />
                <ServiceDetail title="Customer Support Automation" desc="Build AI-powered assistants for 24/7 customer support and issue resolution." />
                <ServiceDetail title="Business Workflow Automation" desc="Connect your tools and eliminate repetitive manual tasks across your organization." />
                <ServiceDetail title="AI Data & Document Processing" desc="Extract, transform, and analyze data from documents automatically." />
                <ServiceDetail title="E-commerce Automation" desc="Streamline order processing, inventory updates, and customer communications." />
                <ServiceDetail title="Custom AI Solutions" desc="Build custom AI workflows around your specific business processes." />
              </div>
            </div>
          </div>

          {/* BEFORE / AFTER Visual */}
          <div className="bg-foreground/5 border border-foreground/10 p-8 md:p-12 rounded-2xl overflow-hidden relative">
            <h5 className="text-sm font-bold uppercase tracking-widest text-foreground/50 mb-8">WORKFLOW DEMONSTRATION</h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h6 className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-6">BEFORE (Manual)</h6>
                <div className="flex flex-col gap-3">
                  <FlowStep text="New Lead" />
                  <FlowArrow />
                  <FlowStep text="Manual Data Entry" />
                  <FlowArrow />
                  <FlowStep text="Manual Qualification" />
                  <FlowArrow />
                  <FlowStep text="Manual Email" />
                  <FlowArrow />
                  <FlowStep text="Manual CRM Update" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute top-0 bottom-0 -left-6 w-px bg-foreground/10 hidden lg:block"></div>
                <h6 className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-6">AFTER (Automated)</h6>
                <div className="flex flex-col gap-3">
                  <FlowStep text="New Lead" active />
                  <FlowArrow active />
                  <FlowStep text="AI Qualification" active />
                  <FlowArrow active />
                  <FlowStep text="CRM Update" active />
                  <FlowArrow active />
                  <FlowStep text="Personalized Email" active />
                  <FlowArrow active />
                  <FlowStep text="Sales Notification" active />
                </div>
              </div>
            </div>
          </div>
          
          {/* Packages */}
          <div className="mt-16 mb-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-foreground/20 bg-background flex flex-col">
              <h5 className="text-xl font-bold uppercase tracking-tight mb-2">Starter</h5>
              <div className="text-accent font-mono text-lg mb-6">₹5,000–₹12,000</div>
              <p className="text-foreground/70 font-medium flex-grow mb-8">One simple automation.</p>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/40 border-t border-foreground/10 pt-4">Maintenance & support billed separately</div>
            </div>
            
            <div className="p-8 border border-accent/50 bg-accent/5 flex flex-col relative">
              <div className="absolute top-0 right-0 bg-accent text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1">Popular</div>
              <h5 className="text-xl font-bold uppercase tracking-tight mb-2">Business</h5>
              <div className="text-accent font-mono text-lg mb-6">₹15,000–₹40,000</div>
              <p className="text-foreground/70 font-medium flex-grow mb-8">Multiple workflows + AI + integrations.</p>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/40 border-t border-foreground/10 pt-4">Maintenance & support billed separately</div>
            </div>
            
            <div className="p-8 border border-foreground/20 bg-background flex flex-col">
              <h5 className="text-xl font-bold uppercase tracking-tight mb-2">Custom</h5>
              <div className="text-accent font-mono text-lg mb-6">₹40,000+</div>
              <p className="text-foreground/70 font-medium flex-grow mb-8">Complete business automation system.</p>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground/40 border-t border-foreground/10 pt-4">Maintenance & support billed separately</div>
            </div>
          </div>

          <div className="mt-12 text-center p-12 bg-accent/10 border border-accent/20">
            <h4 className="text-2xl font-bold uppercase tracking-tight mb-4 text-accent">WHAT SHOULD WE AUTOMATE?</h4>
            <p className="text-foreground/80 mb-8 max-w-xl mx-auto">
              Tell us what your team does manually. We'll help identify where AI and automation can save time and reduce repetitive work.
            </p>
            <a href="#contact" className="inline-block bg-accent text-background px-8 py-4 font-bold uppercase tracking-widest hover:bg-white transition-colors">
              Discuss an Automation &rarr;
            </a>
          </div>
        </div>

        {/* Secondary Services */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-foreground/20 pt-24">
          <SecondaryService 
            num="02" 
            title="WEBSITE DEVELOPMENT" 
            headline="WE BUILD WEB PRODUCTS, NOT JUST WEB PAGES."
            items={["Business Websites", "Corporate Websites", "Landing Pages", "E-commerce", "Web Applications", "SaaS Platforms", "Dashboards", "Admin Panels", "API Integration", "Database Integration", "Authentication", "Custom Web Systems"]}
          />
          <SecondaryService 
            num="03" 
            title="APP DEVELOPMENT" 
            headline="FROM IDEA TO WORKING APPLICATION."
            items={["Android Applications", "iOS Applications", "Cross-platform Apps", "Business Apps", "Customer Apps", "Internal Company Apps", "MVP Development", "API & Backend", "Authentication", "Push Notifications", "Admin Dashboards"]}
          />
          <SecondaryService 
            num="04" 
            title="BULK PROJECT CONTRACTS" 
            headline="NEED MORE DELIVERY CAPACITY?"
            items={["Website development", "App development", "AI automation", "API integrations", "Recurring development", "Multiple project delivery", "Dedicated project teams"]}
            isContracts
          />
        </div>
      </div>
    </section>
  );
}

function ServiceDetail({ title, desc }: { title: string, desc: string }) {
  return (
    <div>
      <h5 className="text-lg font-bold uppercase tracking-tight mb-2 text-foreground">{title}</h5>
      <p className="text-foreground/60 text-sm font-medium">{desc}</p>
    </div>
  );
}

function FlowStep({ text, active = false }: { text: string, active?: boolean }) {
  return (
    <div className={`py-3 px-4 rounded border text-sm font-medium uppercase tracking-wide flex justify-between items-center ${active ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-background border-foreground/10 text-foreground/70'}`}>
      {text}
      {active && <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>}
    </div>
  );
}

function FlowArrow({ active = false }: { active?: boolean }) {
  return (
    <div className="flex justify-center -my-1 relative z-10">
      <div className={`w-0.5 h-4 ${active ? 'bg-accent' : 'bg-foreground/20'}`}></div>
      {active && (
        <motion.div 
          className="absolute top-0 w-0.5 h-4 bg-white"
          animate={{ opacity: [0, 1, 0], y: [0, 8, 16] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

function SecondaryService({ num, title, headline, items, isContracts = false }: { num: string, title: string, headline: string, items: string[], isContracts?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-mono text-foreground/40 mb-4 block">{num}</span>
      <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter mb-4">{title}</h3>
      <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/60 mb-8 border-b border-foreground/10 pb-4">{headline}</h4>
      <ul className="space-y-2 mb-8 flex-grow">
        {items.map((item, i) => (
          <li key={i} className="text-foreground/70 text-sm font-medium flex items-center gap-2">
            <span className="w-1 h-1 bg-foreground/30"></span> {item}
          </li>
        ))}
      </ul>
      {isContracts && (
        <a href="https://nextodyssey.space/" target="_blank" rel="noopener noreferrer" className="inline-block mt-auto bg-transparent border border-foreground/20 text-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors text-center">
          Explore Bulk Contracts &rarr;
        </a>
      )}
    </div>
  );
}
