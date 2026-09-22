"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/config";
import { MessageSquare, ArrowRight } from "lucide-react";

function getWhatsAppUrl(number: string, message: string = "Hi Digilo, I would like to discuss a project.") {
  const cleanNumber = number.replace(/[^\d+]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [selectedService, setSelectedService] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: "" });

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      service: formData.get("service"),
      budget: formData.get("budget"),
      message: formData.get("message"),
      ...(selectedService === "AI Automation" && {
        automationGoal: formData.get("automationGoal"),
        currentTools: formData.get("currentTools"),
        mainGoal: formData.get("mainGoal"),
        workflowVolume: formData.get("workflowVolume")
      }),
      ...(selectedService === "Software Development" && {
        softwareGoal: formData.get("softwareGoal")
      })
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setStatus({ type: "success", message: result.message });
        (e.target as HTMLFormElement).reset();
        setSelectedService("");
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } catch {
      setStatus({ type: "error", message: "Something went wrong. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="py-32 px-6 border-t border-foreground/10 bg-foreground/5 scroll-mt-20">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-8 leading-none">
              READY TO<br/>AUTOMATE?
            </h2>
            <p className="text-xl text-foreground/80 font-medium mb-12 max-w-md">
              Tell us what you&apos;re doing manually. We&apos;ll help you figure out what can be automated.
            </p>
            
            {siteConfig.whatsAppNumber && (
              <div className="mt-16">
                <p className="text-foreground/60 mb-4 uppercase tracking-widest text-sm font-medium">Prefer direct chat?</p>
                <a 
                  href={getWhatsAppUrl(siteConfig.whatsAppNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-transparent border border-foreground hover:border-accent hover:text-accent px-8 py-5 font-bold uppercase tracking-widest transition-colors duration-300"
                >
                  <MessageSquare className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  Chat on WhatsApp &rarr;
                </a>
              </div>
            )}
          </div>

          <div className="bg-background p-8 md:p-12 border border-foreground/10 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Name *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="space-y-2 group">
                  <label htmlFor="company" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Company</label>
                  <input 
                    type="text" 
                    id="company" 
                    name="company" 
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                    placeholder="Company Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Email *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div className="space-y-2 group">
                  <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Phone</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label htmlFor="service" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Service *</label>
                  <select 
                    id="service" 
                    name="service" 
                    required 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none appearance-none"
                  >
                    <option value="" disabled className="bg-background text-foreground/50">Select a service...</option>
                    <option value="AI Automation" className="bg-background">AI Automation</option>
                    <option value="Software Development" className="bg-background">Software Development</option>
                    <option value="Bulk Project Contract" className="bg-background">Bulk Project Contract</option>
                    <option value="Other" className="bg-background">Other</option>
                  </select>
                </div>
                
                <div className="space-y-2 group">
                  <label htmlFor="budget" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Budget</label>
                  <select 
                    id="budget" 
                    name="budget" 
                    defaultValue=""
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none appearance-none"
                  >
                    <option value="" disabled className="bg-background text-foreground/50">Select budget range...</option>
                    <option value="Under $5k" className="bg-background">Under $5k</option>
                    <option value="$5k - $10k" className="bg-background">$5k - $10k</option>
                    <option value="$10k - $25k" className="bg-background">$10k - $25k</option>
                    <option value="$25k+" className="bg-background">$25k+</option>
                  </select>
                </div>
              </div>

              {selectedService === "AI Automation" && (
                <div className="p-6 bg-foreground/5 border border-foreground/10 space-y-8">
                  <div className="space-y-2 group">
                    <label htmlFor="automationGoal" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">What would you like to automate? *</label>
                    <textarea 
                      id="automationGoal" 
                      name="automationGoal" 
                      required 
                      rows={3}
                      className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none resize-none placeholder:text-foreground/20"
                      placeholder="Example: We receive leads from our website and WhatsApp and currently enter them manually into our CRM."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 group">
                      <label htmlFor="currentTools" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Current tools</label>
                      <input 
                        type="text" 
                        id="currentTools" 
                        name="currentTools" 
                        className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                        placeholder="CRM, Sheets, WhatsApp, etc."
                      />
                    </div>
                    
                    <div className="space-y-2 group">
                      <label htmlFor="mainGoal" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Main goal</label>
                      <select 
                        id="mainGoal" 
                        name="mainGoal" 
                        defaultValue=""
                        className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none appearance-none"
                      >
                        <option value="" disabled className="bg-background text-foreground/50">Select primary goal...</option>
                        <option value="Reduce manual work" className="bg-background">Reduce manual work</option>
                        <option value="Save time" className="bg-background">Save time</option>
                        <option value="Improve lead management" className="bg-background">Improve lead management</option>
                        <option value="Improve customer support" className="bg-background">Improve customer support</option>
                        <option value="Connect tools" className="bg-background">Connect tools</option>
                        <option value="Other" className="bg-background">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedService === "Software Development" && (
                <div className="p-6 bg-foreground/5 border border-foreground/10 space-y-8">
                  <div className="space-y-2 group">
                    <label htmlFor="softwareGoal" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">What are you looking to build? *</label>
                    <textarea 
                      id="softwareGoal" 
                      name="softwareGoal" 
                      required 
                      rows={3}
                      className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none resize-none placeholder:text-foreground/20"
                      placeholder="Example: We need a custom internal dashboard for our operations team..."
                    />
                  </div>
                </div>
              )}

              {selectedService !== "AI Automation" && selectedService !== "Software Development" && (
                <div className="space-y-2 group">
                  <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Message *</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={4}
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none resize-none placeholder:text-foreground/20"
                    placeholder="Tell us about your project..."
                  />
                </div>
              )}

              {status.message && (
                <div className={`p-4 text-sm font-medium border ${status.type === 'success' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {status.message}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || status.type === 'success'}
                className="group relative w-full overflow-hidden bg-foreground text-background py-5 font-bold uppercase tracking-widest hover:bg-accent disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Sending...</span>
                ) : status.type === 'success' ? (
                  <span>Message sent successfully. We&apos;ll get back to you shortly.</span>
                ) : (
                  <>
                    Send Message
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
