import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { ArrowRight } from "lucide-react";

export default function Footer() {
  const { socialLinks } = siteConfig;

  return (
    <footer className="bg-background text-foreground py-20 px-6 border-t border-foreground/10">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-24">
          
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-6 text-2xl md:text-3xl font-black tracking-tighter">
              DIGIL<span className="text-accent">O</span>
            </Link>
            <p className="text-foreground/60 font-medium max-w-xs mb-6">
              AI Automation. Software. Scale.
            </p>
            <a href="mailto:digilotech@gmail.com" className="inline-block text-sm font-medium hover:text-accent transition-colors">
              digilotech@gmail.com
            </a>
          </div>

          {/* Explore Column */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 mb-8">
              Explore
            </h4>
            <ul className="space-y-4 font-medium text-foreground/80">
              <li><Link href="#services" className="hover:text-accent transition-colors">Services</Link></li>
              <li><Link href="#work" className="hover:text-accent transition-colors">Work</Link></li>
              <li><Link href="#about" className="hover:text-accent transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Process</Link></li>
              <li><Link href="#contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Services Column */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 mb-8">
              Services
            </h4>
            <ul className="space-y-4 font-medium text-foreground/80">
              <li>AI Automation</li>
              <li>Software Development</li>
              <li>
                <a href={siteConfig.contractsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors flex items-center gap-1 group">
                  Bulk Contracts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </a>
              </li>
            </ul>
          </div>

          {/* Social Column */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 mb-8">
              Social
            </h4>
            <ul className="space-y-4 font-medium uppercase text-sm tracking-widest text-foreground/80">
              {Object.entries(socialLinks).map(([network, url]) => (
                <li key={network}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 hover:text-accent transition-colors">
                      {network} <ArrowRight className="w-4 h-4 -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                  ) : (
                    <span className="text-foreground/40 cursor-not-allowed flex items-center gap-2">
                      {network} <ArrowRight className="w-4 h-4 -rotate-45 opacity-50" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-foreground/10 text-xs font-medium text-foreground/40">
          <p>&copy; {new Date().getFullYear()} Digilo. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
