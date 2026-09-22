"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/config";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

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
      projectType: formData.get("projectType"),
      budget: formData.get("budget"),
      message: formData.get("message"),
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
      } else {
        setStatus({ type: "error", message: result.error });
      }
    } catch (err) {
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
              Let's build<br/>something<br/>worth<br/>remembering.
            </h2>
            
            {siteConfig.whatsAppNumber && (
              <div className="mt-16">
                <p className="text-foreground/60 mb-4 uppercase tracking-widest text-sm font-medium">Prefer direct chat?</p>
                <a 
                  href={`https://wa.me/${siteConfig.whatsAppNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-transparent border border-foreground hover:border-accent hover:text-accent px-8 py-5 font-bold uppercase tracking-widest transition-colors duration-300"
                >
                  <MessageSquare className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  Chat on WhatsApp
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
                    defaultValue=""
                    className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none appearance-none"
                  >
                    <option value="" disabled className="bg-background text-foreground/50">Select a service...</option>
                    <option value="Graphic Design" className="bg-background">Graphic Design</option>
                    <option value="Video Editing" className="bg-background">Video Editing</option>
                    <option value="Web Development" className="bg-background">Web Development</option>
                    <option value="Bulk Contract" className="bg-background">Bulk Project Contract</option>
                    <option value="AI & Automation" className="bg-background">AI & Automation</option>
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

              <div className="space-y-2 group">
                <label htmlFor="projectType" className="text-xs font-bold uppercase tracking-widest text-foreground/50 transition-colors group-focus-within:text-accent">Project Type</label>
                <input 
                  type="text" 
                  id="projectType" 
                  name="projectType" 
                  className="w-full bg-transparent border-b border-foreground/20 py-3 focus:outline-none focus:border-accent transition-colors rounded-none placeholder:text-foreground/20"
                  placeholder="e.g. Rebranding, E-commerce, Corporate Video..."
                />
              </div>

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
                  <span>Message sent successfully. We'll get back to you shortly.</span>
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
