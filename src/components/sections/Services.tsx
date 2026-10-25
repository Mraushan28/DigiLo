"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Code2, ArrowRight } from "lucide-react";

export default function Services() {
  return (
    <section id="services" className="py-32 px-6 relative border-t border-foreground/10">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-24">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-accent block mb-2 font-semibold">
              Capabilities & Offerings
            </span>
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight">Services</h2>
          </div>
          <p className="max-w-md text-foreground/60 mt-4 md:mt-0 text-lg leading-relaxed">
            We automate repetitive business workflows with AI and engineer high-performance software solutions.
          </p>
        </div>

        {/* 01 - AI AUTOMATION */}
        <div className="mb-24 md:mb-32">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 mb-16">
            <div className="lg:w-1/3">
              <span className="text-xl md:text-3xl font-mono text-accent mb-4 block">01</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-none text-accent">
                AI AUTOMATION
              </h3>
            </div>
            <div className="lg:w-2/3">
              <h4 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-6 text-foreground">
                AI-Powered Workflow Planning, Integration, and Process Automation.
              </h4>
              <p className="text-lg md:text-xl text-foreground/80 font-normal mb-8 max-w-3xl leading-relaxed">
                Describe your business process in plain English. The Digilo AI Automation platform generates validated, step-by-step workflow architectures, connects your core business tools, and executes reliable automation pipelines.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-foreground/20">
                <ServiceDetail title="AI Workflow Generation" desc="Describe any business task in natural language. Digilo formulates triggers, AI analysis steps, and automated actions instantly." />
                <ServiceDetail title="Lead Intake & Qualification" desc="Automatically capture, enrich, prioritize with AI, and route website leads to sales teams in seconds." />
                <ServiceDetail title="Multi-Tool Integrations" desc="Pre-built, secure connectors for Google Sheets, Slack, Gmail, and HTTP Webhooks with granular permission scopes." />
                <ServiceDetail title="n8n Pipeline Engine" desc="Production-grade workflow orchestration powered by self-hosted n8n instances with isolated credentials." />
                <ServiceDetail title="Telemetry & Sandbox Testing" desc="Run non-destructive test runs, measure execution durations, and detect configuration errors before going live." />
                <ServiceDetail title="AI Optimization Governance" desc="Receive telemetry-backed improvement suggestions that create isolated draft versions with zero silent mutations." />
              </div>

              <div className="mt-10">
                <Link 
                  href="/automation"
                  className="inline-flex items-center gap-3 bg-accent text-background px-8 py-4 font-bold uppercase tracking-widest hover:bg-white transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch AI Automation Studio &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Workflow Demonstration Visual */}
          <div className="bg-foreground/5 border border-foreground/10 p-8 md:p-12 rounded-2xl overflow-hidden relative">
            <h5 className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/50 mb-8 font-semibold">
              WORKFLOW TRANSFORMATION
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h6 className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/40 mb-6">
                  BEFORE (Fragmented Manual Effort)
                </h6>
                <div className="flex flex-col gap-3">
                  <FlowStep text="Form Submitted" />
                  <FlowArrow />
                  <FlowStep text="Manual Copy-Paste to Sheet" />
                  <FlowArrow />
                  <FlowStep text="Subjective Lead Triage" />
                  <FlowArrow />
                  <FlowStep text="Manual Team Ping on Slack" />
                  <FlowArrow />
                  <FlowStep text="Delayed Email Follow-up" />
                </div>
              </div>
              <div className="relative">
                <div className="absolute top-0 bottom-0 -left-6 w-px bg-foreground/10 hidden lg:block"></div>
                <h6 className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-6">
                  AFTER (Digilo Automated Pipeline)
                </h6>
                <div className="flex flex-col gap-3">
                  <FlowStep text="Inbound Webhook Listener" active />
                  <FlowArrow active />
                  <FlowStep text="Structured AI Lead Qualification" active />
                  <FlowArrow active />
                  <FlowStep text="Google Sheets Real-time Append" active />
                  <FlowArrow active />
                  <FlowStep text="Priority-filtered Slack Notification" active />
                  <FlowArrow active />
                  <FlowStep text="Automated Gmail Confirmation" active />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 02 - SOFTWARE DEVELOPMENT */}
        <div className="border-t border-foreground/20 pt-24">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
            <div className="lg:w-1/3">
              <span className="text-xl md:text-3xl font-mono text-accent mb-4 block">02</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-none text-foreground">
                SOFTWARE DEVELOPMENT
              </h3>
            </div>
            <div className="lg:w-2/3">
              <h4 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-6 text-foreground">
                Custom Websites, Web Applications, and Software Solutions.
              </h4>
              <p className="text-lg md:text-xl text-foreground/80 font-normal mb-8 max-w-3xl leading-relaxed">
                From internal business tooling to customer-facing SaaS products and high-performance web applications, Digilo designs and builds dependable digital products engineered around how your company actually functions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {[
                  "Custom Websites & Landing Experiences",
                  "Full-Stack Web Applications (Next.js, React)",
                  "Internal Business Dashboards & Portals",
                  "API Design & Backend Microservices",
                  "Database Architecture & Query Optimization",
                  "Secure Multi-Tenant Authentication & RBAC",
                  "Third-Party API & SaaS Integrations",
                  "Scalable Cloud Deployment & Monitoring"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3.5 border border-foreground/10 bg-foreground/[0.02] rounded-sm">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />
                    <span className="text-sm font-medium text-foreground/85">{item}</span>
                  </div>
                ))}
              </div>

              <a 
                href="#contact" 
                className="inline-flex items-center gap-3 bg-transparent border border-foreground/30 text-foreground px-8 py-4 font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
              >
                <Code2 className="w-4 h-4" />
                Discuss a Software Project &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceDetail({ title, desc }: { title: string, desc: string }) {
  return (
    <div>
      <h5 className="text-base font-bold uppercase tracking-tight mb-2 text-foreground">{title}</h5>
      <p className="text-foreground/60 text-sm font-normal leading-relaxed">{desc}</p>
    </div>
  );
}

function FlowStep({ text, active = false }: { text: string, active?: boolean }) {
  return (
    <div className={`py-3 px-4 rounded border text-xs sm:text-sm font-mono uppercase tracking-wide flex justify-between items-center ${active ? 'bg-accent/10 border-accent/40 text-accent font-semibold shadow-[0_0_15px_rgba(204,255,0,0.1)]' : 'bg-background border-foreground/10 text-foreground/70'}`}>
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
