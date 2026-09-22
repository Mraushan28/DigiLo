import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import SelectedWork from "@/components/sections/SelectedWork";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import { siteConfig } from "@/lib/config";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Hero />

        {/* MARQUEE */}
        <div className="w-full bg-accent text-background py-4 overflow-hidden flex whitespace-nowrap border-y border-foreground/10">
          <div className="animate-marquee inline-block font-bold uppercase tracking-[0.2em] text-sm md:text-lg">
            AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash;
          </div>
        </div>

        {/* CAPABILITIES */}
        <section className="py-32 px-6">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-foreground/10 pb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/50">
                One team. Four core focuses.
              </h2>
              <p className="max-w-md text-foreground/70 mt-4 md:mt-0 font-medium">
                We build intelligent systems and scale technology operations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
              {['AI AUTOMATION', 'WEBSITE DEV', 'APP DEV', 'BULK CONTRACTS'].map((cap, i) => (
                <div key={cap} className="group relative">
                  <span className="text-accent font-mono text-xs block mb-4">0{i + 1}</span>
                  <h3 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight mb-4 group-hover:text-accent transition-colors duration-300">{cap}</h3>
                  <div className="h-[1px] w-full bg-foreground/20 group-hover:bg-accent transition-colors duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Services />
        
        <SelectedWork />

        <About />

        {/* CLIENTS SECTION */}
        <section className="py-24 px-6 border-t border-foreground/10 bg-background text-foreground">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 mb-16 text-center">
              Selected Collaborations
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-32">
              <span className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-foreground/60 hover:text-foreground transition-colors duration-300 cursor-default">
                NextOdyssey
              </span>
              <span className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-foreground/60 hover:text-foreground transition-colors duration-300 cursor-default">
                Amulya Academy
              </span>
            </div>
          </div>
        </section>

        {/* BULK CONTRACTS CTA */}
        <section className="py-40 px-6 bg-background text-foreground text-center relative overflow-hidden group border-t border-foreground/10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] group-hover:bg-[position:100%_100%] transition-all duration-[4s] ease-out"></div>
          
          {/* Subtle grid pattern background to represent workflow */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '4rem 4rem' }}></div>
          
          <div className="container mx-auto max-w-5xl relative z-10 flex flex-col items-center">
            <span className="text-accent font-mono text-sm uppercase tracking-[0.2em] mb-8 block">Agency Partnership</span>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter uppercase mb-8 leading-[0.9]">
              NEED MORE DELIVERY CAPACITY?
            </h2>
            <p className="text-lg md:text-xl mb-12 text-foreground/70 max-w-2xl font-medium">
              Digilo works with companies and agencies that need reliable development and automation capacity for recurring or high-volume projects.
            </p>
            <a 
              href={siteConfig.contractsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group/btn flex items-center gap-4 bg-accent text-background px-8 py-5 text-sm md:text-base font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors duration-300"
            >
              EXPLORE BULK CONTRACTS 
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-2" />
            </a>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
    </>
  );
}
