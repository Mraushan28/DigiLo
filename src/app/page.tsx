import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import PricingSection from "@/components/sections/PricingSection";
import Services from "@/components/sections/Services";
import SelectedWork from "@/components/sections/SelectedWork";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Hero />

        {/* MARQUEE */}
        <div className="w-full bg-[#C8FF00] text-black py-4 overflow-hidden flex whitespace-nowrap border-y border-white/10 font-bold uppercase tracking-[0.2em] text-sm md:text-lg">
          <div className="animate-marquee inline-block">
            AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash; AUTOMATE &mdash; BUILD &mdash; SCALE &mdash; AI &mdash;
          </div>
        </div>

        {/* PRD v3.1: HOW IT WORKS, SUPPORTED INTEGRATIONS, PRICING & CTA BANNER */}
        <PricingSection />

        {/* CAPABILITIES */}
        <section className="py-24 px-6 border-t border-[#222222]">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-[#222222] pb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#A0A0A0]">
                Two core capabilities.
              </h2>
              <p className="max-w-md text-[#A0A0A0] mt-4 md:mt-0 font-medium">
                We build intelligent automation systems and high-performance software solutions.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
              {[
                { name: 'AI AUTOMATION', desc: 'AI-powered workflow planning, integration, and business process automation through the Digilo platform.' },
                { name: 'SOFTWARE DEVELOPMENT', desc: 'Custom websites, web applications, and software solutions built for business scale.' },
              ].map((cap, i) => (
                <div key={cap.name} className="group relative p-6 border border-[#222222] bg-[#111111] hover:border-[#C8FF00]/40 rounded-lg transition-all">
                  <span className="text-[#C8FF00] font-mono text-xs block mb-4">0{i + 1}</span>
                  <h3 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight mb-3 group-hover:text-[#C8FF00] transition-colors duration-300">{cap.name}</h3>
                  <p className="text-[#A0A0A0] text-sm font-normal leading-relaxed mb-4">{cap.desc}</p>
                  <div className="h-[1px] w-full bg-[#222222] group-hover:bg-[#C8FF00] transition-colors duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Services />
        
        <SelectedWork />

        <About />

        {/* CLIENTS SECTION */}
        <section className="py-20 px-6 border-t border-[#222222] bg-[#0A0A0A] text-white">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#555555] mb-12 text-center">
              Selected Collaborations
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-32">
              <span className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-[#A0A0A0] hover:text-white transition-colors duration-300 cursor-default">
                NextOdyssey
              </span>
              <span className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-[#A0A0A0] hover:text-white transition-colors duration-300 cursor-default">
                Amulya Academy
              </span>
            </div>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
    </>
  );
}
