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
          ? "bg-[#0A0A0A]/95 backdrop-blur-md py-3.5 border-[#222222]"
          : "bg-transparent py-5 border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="z-50 text-2xl md:text-3xl font-black tracking-tighter text-white">
          DIGIL<span className="text-[#C8FF00]">O</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-[#A0A0A0] hover:text-white transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right CTA Area (PRD v3.1 Spec) */}
        <div className="hidden md:flex items-center gap-5">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-[#C8FF00] truncate max-w-[140px]">
                  {workspace?.name || "Workspace"}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-red-400 transition-colors px-2.5 py-1 border border-[#222222] rounded hover:border-red-500/30"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth"
                className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/automation"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#C8FF00] hover:bg-[#b2e600] text-black text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md shadow-[#C8FF00]/10"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden z-50 p-2 -mr-2 text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-[#0A0A0A] z-40 flex flex-col justify-center items-center transition-transform duration-500 ease-in-out ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col items-center gap-8 text-xl font-bold uppercase tracking-tight">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#A0A0A0] hover:text-white transition-colors"
            >
              {link.name}
            </Link>
          ))}
          {user ? (
            <div className="flex flex-col items-center gap-2 mt-4">
              <span className="text-sm font-mono text-[#C8FF00]">
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
            <div className="flex flex-col items-center gap-4 mt-4">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold uppercase tracking-widest text-[#A0A0A0] hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/automation"
                onClick={() => setMobileMenuOpen(false)}
                className="px-6 py-3 bg-[#C8FF00] text-black text-sm font-bold uppercase tracking-widest rounded"
              >
                Get Started →
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
