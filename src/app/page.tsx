import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
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
                Two core capabilities.
              </h2>
              <p className="max-w-md text-foreground/70 mt-4 md:mt-0 font-medium">
                We build intelligent automation systems and high-performance software solutions.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
              {[
                { name: 'AI AUTOMATION', desc: 'AI-powered workflow planning, integration, and business process automation through the Digilo platform.' },
                { name: 'SOFTWARE DEVELOPMENT', desc: 'Custom websites, web applications, and software solutions built for business scale.' },
              ].map((cap, i) => (
                <div key={cap.name} className="group relative p-6 border border-foreground/10 bg-foreground/[0.015] hover:border-accent/40 rounded-sm transition-all">
                  <span className="text-accent font-mono text-xs block mb-4">0{i + 1}</span>
                  <h3 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight mb-3 group-hover:text-accent transition-colors duration-300">{cap.name}</h3>
                  <p className="text-foreground/60 text-sm font-normal leading-relaxed mb-4">{cap.desc}</p>
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

        <Contact />
      </main>
      <Footer />
    </>
  );
}
