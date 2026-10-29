"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthContext";
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Layers,
  Database,
  Send
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { user, refreshAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Compute password strength for signup
  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup" ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      setSuccessNotice(
        data.claimedDraft
          ? `✓ Account ready! Preserved "${data.claimedDraft.name}" in your workspace.`
          : "✓ Successfully authenticated."
      );

      await refreshAuth();

      setTimeout(() => {
        if (data.claimedWorkflowId) {
          router.push(data.redirectUrl || `/dashboard/workflows/${data.claimedWorkflowId}`);
        } else {
          router.push("/dashboard");
        }
      }, 600);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const checkRes = await fetch("/api/auth/google", {
        headers: { Accept: "application/json" },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.url) {
          window.location.href = checkData.url;
          return;
        }
      }

      window.location.href = "/api/auth/google";
    } catch {
      setErrorMsg("Unable to initiate Google sign-in. Please try email login.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0A0A0A] text-white">
      {/* Left Brand Visual Side */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#0D0D0D] via-[#111111] to-[#0A0A0A] border-r border-[#222222] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C8FF00]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-block text-2xl font-bold tracking-[0.2em] uppercase text-white hover:text-[#C8FF00] transition-colors">
            DIGILO
          </Link>
          <p className="text-xs font-mono uppercase tracking-widest text-[#A0A0A0] mt-2">
            AI WORKFLOW CONTROL PLANE
          </p>
        </div>

        {/* Center Animated Workflow Graph Visual */}
        <div className="relative z-10 my-auto py-12 max-w-md">
          <div className="text-xs font-mono uppercase tracking-widest text-[#C8FF00] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C8FF00] animate-ping" />
            Live Automation Pipeline
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Trigger Node */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4 rounded-lg bg-[#111111] border-l-4 border-l-[#C8FF00] border border-[#222222] shadow-xl"
            >
              <div className="flex items-center justify-between text-[#A0A0A0] mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#C8FF00]">TRIGGER</span>
                <span className="text-[10px] text-[#555555]">HTTP POST</span>
              </div>
              <div className="font-semibold text-white flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#C8FF00]" />
                Website Webhook Intake
              </div>
              <div className="text-[11px] text-[#A0A0A0] mt-1">Payload: lead_submitted (contact inquiry)</div>
            </motion.div>

            <div className="flex justify-center py-0.5 text-[#555555]">↓</div>

            {/* AI Node */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 rounded-lg bg-[#111111] border border-[#222222] shadow-xl"
            >
              <div className="flex items-center justify-between text-[#A0A0A0] mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#3B82F6]">STEP 1 — AI</span>
                <span className="text-[10px] text-[#22C55E]">99.4% CONFIDENCE</span>
              </div>
              <div className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                Intent & Urgency Classification
              </div>
              <div className="text-[11px] text-[#A0A0A0] mt-1">Output: Hot / High Intent / Enterprise</div>
            </motion.div>

            <div className="flex justify-center py-0.5 text-[#555555]">↓</div>

            {/* Sheets Node */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4 rounded-lg bg-[#111111] border border-[#222222] shadow-xl"
            >
              <div className="flex items-center justify-between text-[#A0A0A0] mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#22C55E]">STEP 2 — CRM</span>
                <span className="text-[10px] text-[#A0A0A0]">OAUTH 2.0</span>
              </div>
              <div className="font-semibold text-white flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[#22C55E]" />
                Google Sheets Sync
              </div>
              <div className="text-[11px] text-[#A0A0A0] mt-1">Appends row to: Lead CRM → Leads Tab</div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-6 border-t border-[#222222]">
          <p className="text-xl font-bold tracking-tight text-white">
            "Describe it. Automate it. Done."
          </p>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Zero-code natural language workflow orchestration for high-velocity teams.
          </p>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 max-w-xl mx-auto w-full">
        {/* Mobile Header */}
        <div className="md:hidden mb-8">
          <Link href="/" className="text-xl font-bold tracking-[0.2em] uppercase text-white">
            DIGILO
          </Link>
          <p className="text-xs font-mono uppercase text-[#A0A0A0] mt-1">AI WORKFLOW CONTROL PLANE</p>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <div className="inline-block px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#222222] text-[10px] font-mono uppercase tracking-wider text-[#C8FF00] mb-3">
            {mode === "login" ? "SECURE CLIENT ACCESS" : "CREATE WORKSPACE"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {mode === "login" ? "Welcome back" : "Start automating for free"}
          </h1>
          <p className="text-sm text-[#A0A0A0] mt-2">
            {mode === "login"
              ? "Sign in to manage your active automations and telemetry."
              : "Set up your tenant workspace and connect your workflows."}
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-2.5 text-xs text-[#EF4444]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-6 p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-start gap-2.5 text-xs text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Google SSO Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white hover:bg-neutral-100 text-black font-semibold text-sm transition-all focus:outline-none mb-6 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#222222]" />
          </div>
          <span className="relative px-3 bg-[#0A0A0A] text-xs font-mono uppercase tracking-wider text-[#555555]">
            or continue with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rahul Raushan"
                  className="w-full bg-[#111111] border border-[#222222] focus:border-[#C8FF00] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#555555] outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#C8FF00] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#555555] outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#A0A0A0]">
                Password
              </label>
              {mode === "login" && (
                <a href="#forgot" className="text-xs text-[#A0A0A0] hover:text-[#C8FF00] transition-colors">
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#111111] border border-[#222222] focus:border-[#C8FF00] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#555555] outline-none transition-colors font-mono"
              />
            </div>

            {/* Password strength bar for signup */}
            {mode === "signup" && password && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full bg-[#222222] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 25
                        ? "bg-[#EF4444] w-1/4"
                        : strength <= 50
                        ? "bg-[#FFD600] w-2/4"
                        : strength <= 75
                        ? "bg-blue-400 w-3/4"
                        : "bg-[#22C55E] w-full"
                    }`}
                  />
                </div>
                <div className="text-[10px] font-mono text-[#A0A0A0]">
                  {strength <= 25 && "Weak password"}
                  {strength === 50 && "Moderate password"}
                  {strength === 75 && "Good password"}
                  {strength === 100 && "Strong password"}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[#C8FF00] hover:bg-[#b2e600] text-black font-bold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#C8FF00]/10"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === "login" ? (
              <>
                Log In <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-[#A0A0A0]">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setSuccessNotice(null);
                }}
                className="text-[#C8FF00] font-semibold hover:underline ml-1"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessNotice(null);
                }}
                className="text-[#C8FF00] font-semibold hover:underline ml-1"
              >
                Log in
              </button>
            </p>
          )}
        </div>

        {/* Terms note */}
        <p className="mt-8 text-[11px] text-center text-[#555555]">
          By continuing, you agree to DIGILO's{" "}
          <Link href="/terms" className="underline hover:text-[#A0A0A0]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-[#A0A0A0]">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

