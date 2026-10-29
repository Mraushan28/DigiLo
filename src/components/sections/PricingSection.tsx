"use client";

import Link from "next/link";
import { 
  MessageSquare, 
  Workflow, 
  Zap, 
  Check, 
  ArrowRight, 
  Sparkles,
  Layers,
  Database,
  Mail
} from "lucide-react";

export default function PricingSection() {
  const steps = [
    {
      step: "01",
      title: "Describe your automation",
      desc: "Type what you want automated in plain English. No code, no complex builders, no technical jargon.",
      icon: <MessageSquare className="w-6 h-6 text-[#C8FF00]" />
    },
    {
      step: "02",
      title: "AI builds your workflow",
      desc: "DIGILO AI formulates a schema-valid workflow, maps data fields, and provisions all necessary pipeline steps.",
      icon: <Workflow className="w-6 h-6 text-[#C8FF00]" />
    },
    {
      step: "03",
      title: "Connect & Go Live",
      desc: "One-time authorization for your tools. Run an isolated dry-run test, and activate to production with a click.",
      icon: <Zap className="w-6 h-6 text-[#C8FF00]" />
    }
  ];

  const integrations = [
    { name: "Website Webhook", icon: <Zap className="w-5 h-5 text-[#C8FF00]" />, status: "Ready" },
    { name: "OpenAI GPT-4o", icon: <Sparkles className="w-5 h-5 text-[#3B82F6]" />, status: "Integrated" },
    { name: "Google Sheets", icon: <Database className="w-5 h-5 text-[#22C55E]" />, status: "OAuth 2.0" },
    { name: "Slack", icon: <MessageSquare className="w-5 h-5 text-[#A855F7]" />, status: "OAuth 2.0" },
    { name: "Gmail", icon: <Mail className="w-5 h-5 text-[#EF4444]" />, status: "Coming Soon" }
  ];

  const plans = [
    {
      name: "Starter",
      price: "₹999",
      period: "/month",
      desc: "For freelancers & solo founders starting with automated operations.",
      features: [
        "3 active production workflows",
        "Basic execution analytics",
        "Webhook intake & data transformation",
        "Google Sheets & Slack connectors",
        "Standard email support",
      ],
      cta: "Start Building Free",
      isPopular: false,
    },
    {
      name: "Growth",
      price: "₹2,999",
      period: "/month",
      desc: "For small businesses scaling lead intake and multi-step workflows.",
      features: [
        "10 active production workflows",
        "Full analytics & execution history",
        "AI Urgency & Intent Classification",
        "Automated dry-run test sandbox",
        "Priority support with SLA guarantee",
      ],
      cta: "Start 14-Day Trial",
      isPopular: true,
    },
    {
      name: "Agency",
      price: "₹9,999",
      period: "/month",
      desc: "For agencies & teams deploying automations across multiple client workspaces.",
      features: [
        "Unlimited production workflows",
        "Multi-tenant workspace isolation",
        "White-label client reporting & alerts",
        "Dedicated automation architect support",
        "Custom integration development",
      ],
      cta: "Contact Sales",
      isPopular: false,
    },
  ];

  return (
    <div className="w-full bg-[#0A0A0A] text-white">
      {/* SECTION 2 — HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 border-t border-[#222222]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#C8FF00] font-bold block mb-2">
              THREE SIMPLE STEPS
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-[#A0A0A0] max-w-xl mx-auto mt-3">
              From natural language description to live production pipeline in under 3 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div 
                key={s.step} 
                className="p-8 rounded-lg border border-[#222222] bg-[#111111] hover:border-[#C8FF00]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-mono font-bold text-[#C8FF00]">{s.step}</span>
                    <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#222222]">
                      {s.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-3">
                    {s.title}
                  </h3>
                  <p className="text-sm text-[#A0A0A0] leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 — SUPPORTED INTEGRATIONS */}
      <section className="py-16 px-6 border-t border-[#222222] bg-[#0D0D0D]">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#A0A0A0] mb-8">
            Works with your existing tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {integrations.map((item) => (
              <div 
                key={item.name}
                className="flex items-center gap-3 px-5 py-3 rounded-lg bg-[#111111] border border-[#222222] text-sm font-medium text-white shadow-sm"
              >
                {item.icon}
                <span>{item.name}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1A1A1A] text-[#A0A0A0] border border-[#222222]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — PRICING (PRD v3.1 Spec) */}
      <section id="pricing" className="py-24 px-6 border-t border-[#222222]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#C8FF00] font-bold block mb-2">
              TRANSPARENT PRICING
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white">
              Automate More, Pay Less
            </h2>
            <p className="text-sm sm:text-base text-[#A0A0A0] max-w-xl mx-auto mt-3">
              Simple fixed monthly pricing with zero surprise per-execution surcharges.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`relative flex flex-col justify-between p-8 rounded-lg border transition-all ${
                  plan.isPopular 
                    ? "bg-[#111111] border-[#C8FF00] shadow-[0_0_30px_rgba(200,255,0,0.12)] lg:-translate-y-2"
                    : "bg-[#111111] border-[#222222] hover:border-[#333333]"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#C8FF00] text-black font-mono text-[10px] font-bold uppercase tracking-wider shadow-md">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-xs text-[#A0A0A0] min-h-[36px] mb-6">
                    {plan.desc}
                  </p>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                    <span className="text-xs font-mono text-[#A0A0A0]">{plan.period}</span>
                  </div>

                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs text-[#A0A0A0]">
                        <Check className="w-4 h-4 text-[#C8FF00] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/automation"
                  className={`w-full py-3.5 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    plan.isPopular
                      ? "bg-[#C8FF00] hover:bg-[#b2e600] text-black shadow-lg shadow-[#C8FF00]/15"
                      : "bg-[#1A1A1A] hover:bg-[#222222] text-white border border-[#222222]"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — CTA BANNER (PRD v3.1 Spec) */}
      <section className="py-20 px-6 border-t border-[#222222]">
        <div className="container mx-auto max-w-5xl">
          <div className="relative p-8 sm:p-12 rounded-lg bg-gradient-to-r from-[#111111] via-[#161616] to-[#111111] border border-[#C8FF00]/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8FF00]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C8FF00] font-bold block mb-2">
                READY TO SCALE YOUR BUSINESS?
              </span>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                Ready to automate?
              </h2>
              <p className="text-xs sm:text-sm text-[#A0A0A0] mt-2 max-w-md">
                Describe your workflow in 30 seconds and activate with one click.
              </p>
            </div>

            <div className="relative z-10 w-full sm:w-auto">
              <Link
                href="/automation"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C8FF00] hover:bg-[#b2e600] text-black px-8 py-4 font-bold text-xs uppercase tracking-wider rounded transition-all shadow-xl shadow-[#C8FF00]/20"
              >
                Start for Free →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

