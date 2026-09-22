export default function About() {
  return (
    <section id="about" className="py-32 px-6 bg-foreground text-background scroll-mt-20">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          
          <div className="lg:col-span-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-accent mb-8">
              ABOUT DIGILO
            </h2>
            <div className="h-[1px] w-12 bg-accent mb-8"></div>
          </div>
          
          <div className="lg:col-span-8">
            <h3 className="text-4xl md:text-5xl lg:text-7xl font-bold uppercase tracking-tighter leading-[0.9] mb-12">
              WE AUTOMATE.<br />
              WE BUILD.<br />
              WE SCALE.
            </h3>
            
            <div className="max-w-2xl">
              <p className="text-lg md:text-2xl text-background/80 font-medium mb-8">
                Digilo is an AI automation and development agency helping businesses automate repetitive processes, build digital products and scale their technology operations.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 border-t border-background/20 pt-16">
                <div>
                  <h4 className="text-xl font-bold uppercase tracking-tight mb-4">What we do</h4>
                  <ul className="space-y-3 text-background/70 font-medium">
                    <li>AI Automation</li>
                    <li>Website Development</li>
                    <li>App Development</li>
                    <li>Bulk Project Contracts</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xl font-bold uppercase tracking-tight mb-4">Our Approach</h4>
                  <p className="text-background/70 font-medium leading-relaxed">
                    We believe in pushing the boundaries of digital aesthetics while maintaining robust, production-ready technical standards. No fluff, just results.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
