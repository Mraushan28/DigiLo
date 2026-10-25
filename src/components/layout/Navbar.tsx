"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

export default function Navbar() {
  const { user, workspace, openAuthModal, logout } = useAuth();
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
    { name: "AI Automations", href: "/automation" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Services", href: "/#services" },
    { name: "Work", href: "/#work" },
    { name: "About", href: "/#about" },
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
        <Link href="/" className="z-50 text-2xl md:text-3xl font-black tracking-tighter">
          DIGIL<span className="text-accent">O</span>
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

        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-accent truncate max-w-[140px]">
                  {workspace?.name || "Workspace"}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] font-mono uppercase tracking-wider text-foreground/50 hover:text-red-400 transition-colors px-2.5 py-1 border border-foreground/15 rounded-sm hover:border-red-500/30"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:text-accent border border-foreground/20 hover:border-accent/40 px-3.5 py-1.5 rounded-sm transition-all"
            >
              Sign In
            </button>
          )}

          <a
            href="https://wa.me/917707052307?text=Hi%20Digilo%2C%20I'd%20like%20to%20discuss%20a%20project."
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:text-accent transition-colors duration-300"
          >
            WHATSAPP US
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
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
          {user ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <span className="text-sm font-mono text-accent">
                {user.name} ({workspace?.name || "Workspace"})
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-xs font-mono uppercase tracking-widest text-red-400 hover:underline"
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthModal("login");
              }}
              className="text-sm font-bold uppercase tracking-widest text-foreground hover:text-accent mt-4"
            >
              Sign In
            </button>
          )}

          <a
            href="https://wa.me/917707052307?text=Hi%20Digilo%2C%20I'd%20like%20to%20discuss%20a%20project."
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="text-accent mt-6 flex items-center gap-3 text-lg font-bold uppercase tracking-widest"
          >
            WHATSAPP US <ArrowRight className="w-6 h-6" />
          </a>
        </nav>
      </div>
    </header>
  );
}
