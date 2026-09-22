"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Services", href: "#services" },
    { name: "Work", href: "#work" },
    { name: "About", href: "#about" },
    { name: "Process", href: "#" }, // Placeholder for now or later integration
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${
        isScrolled
          ? "bg-background/95 py-3 border-foreground/10"
          : "bg-transparent py-5 border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="z-50 relative w-[100px] h-[32px] md:w-[120px] md:h-[40px]">
          <Image 
            src="/logo.png" 
            alt="Digilo" 
            fill 
            className="object-contain object-left" 
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center">
          <Link
            href="#contact"
            className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:text-accent transition-colors duration-300"
          >
            Start a Project
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden z-50 p-2 -mr-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-background z-40 flex flex-col justify-center items-center transition-transform duration-500 ease-in-out ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col items-center gap-10 text-2xl font-bold uppercase tracking-tight">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="text-accent mt-8 flex items-center gap-3 text-lg"
          >
            Start a Project <ArrowRight className="w-6 h-6" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
