import { portfolioProjects } from "@/lib/data";
import Image from "next/image";

export default function SelectedWork() {
  return (
    <section id="work" className="py-32 px-6 border-t border-foreground/10 scroll-mt-20">
      <div className="container mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-16 md:mb-24">Selected Work</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-24 md:gap-x-8 md:gap-y-32">
          {portfolioProjects.map((project, index) => {
            // Editorial layout
            let colSpanClass = "md:col-span-12";
            let aspectClass = "aspect-[4/3] md:aspect-[16/9]";
            
            if (index % 4 === 1) {
              colSpanClass = "md:col-span-7";
              aspectClass = "aspect-[4/5] md:aspect-[4/3]";
            } else if (index % 4 === 2) {
              colSpanClass = "md:col-span-5 md:mt-32";
              aspectClass = "aspect-[4/5] md:aspect-[3/4]";
            } else if (index % 4 === 3) {
              colSpanClass = "md:col-span-12";
              aspectClass = "aspect-[4/3] md:aspect-[21/9]";
            }

            return (
              <div 
                key={project.title} 
                className={`group flex flex-col cursor-pointer ${colSpanClass}`}
              >
                <div className={`relative overflow-hidden bg-foreground/5 mb-8 ${aspectClass}`}>
                  <Image
                    src={project.media}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out md:group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 100vw"
                  />
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-4 py-2 text-[10px] font-mono tracking-[0.2em] uppercase rounded-full border border-foreground/10 text-foreground z-10">
                    {project.category}
                  </div>
                  <div className="absolute inset-0 border border-foreground/10 pointer-events-none transition-colors duration-500 md:group-hover:border-accent/50"></div>
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-accent font-mono text-xs block mb-3">0{index + 1}</span>
                    <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-3 transition-colors duration-300 md:group-hover:text-accent">
                      {project.title}
                    </h3>
                    <p className="text-foreground/70 text-sm md:text-base max-w-sm font-medium">{project.description}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full">
                    <span className="text-foreground/40 font-mono text-xs mb-2">{project.year}</span>
                    <span className="text-accent opacity-0 -translate-x-4 transition-all duration-300 md:group-hover:opacity-100 md:group-hover:translate-x-0 hidden md:block text-xs font-bold uppercase tracking-[0.2em] mt-8">
                      View Project &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
