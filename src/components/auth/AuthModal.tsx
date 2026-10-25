"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { Workflow } from "@/types/automation";

interface AuthModalProps {
  currentDraft?: Workflow | null;
  onSuccess?: () => void;
}

export default function AuthModal({ currentDraft, onSuccess }: AuthModalProps) {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, refreshAuth } = useAuth();
  
  const [mode, setMode] = useState<"login" | "signup">(authModalMode || "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync mode from context when modal opens
  if (authModalMode !== mode && !isSubmitting) {
    setMode(authModalMode);
  }

  if (!isAuthModalOpen) return null;

  const handleSaveDraftSession = async () => {
    if (!currentDraft) return;
    try {
      await fetch("/api/automation/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: currentDraft })
      });
    } catch {
      // Non-fatal
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      // 1. Ensure draft is preserved in session cookie before auth call
      await handleSaveDraftSession();

      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup" 
        ? { name, email, password }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Please verify your credentials.");
      }

      setSuccessNotice(
        data.claimedDraft
          ? `✓ Account ready! Preserved "${data.claimedDraft.name}" in your workspace.`
          : "✓ Successfully authenticated."
      );

      if (data.claimedWorkflowId) {
        setSuccessNotice("✓ Authenticated! Opening your workflow dashboard...");
        await refreshAuth();
        setTimeout(() => {
          window.location.href = data.redirectUrl || `/dashboard/workflows/${data.claimedWorkflowId}`;
        }, 500);
        return;
      }

      await refreshAuth();

      setTimeout(() => {
        closeAuthModal();
        if (onSuccess) onSuccess();
      }, 700);

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await handleSaveDraftSession();

      // Check if server has Google OAuth configured
      const checkRes = await fetch("/api/auth/google", {
        headers: { Accept: "application/json" }
      });
      const data = await checkRes.json();

      if (data.configured && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }

      // If Google client ID not yet configured in local env, use fallback mock SSO
      if (data.mockAuthUrl) {
        window.location.href = data.mockAuthUrl;
        return;
      }

      // Direct fallback
      const directRes = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || "user@google.com",
          name: name || "Google User"
        })
      });
      const directData = await directRes.json();
      if (directData.success) {
        await refreshAuth();
        closeAuthModal();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(directData.error || "Google authentication failed.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Google authentication error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-background border border-foreground/20 w-full max-w-md rounded-sm shadow-2xl relative overflow-hidden"
        >
          {/* Accent glow line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-accent via-accent/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-foreground/40 hover:text-foreground p-1 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            {/* Modal Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-bold px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-sm">
                  DIGILO TENANT AUTH
                </span>
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">
                {mode === "signup" ? "Create Your Workspace" : "Welcome Back"}
              </h2>
              <p className="text-xs text-foreground/60 mt-1">
                {mode === "signup"
                  ? "Provision an isolated multi-tenant workspace for your team."
                  : "Sign in to access your automations and integrations."}
              </p>
            </div>

            {/* Unauthenticated Draft Preservation Badge */}
            {currentDraft && (
              <div className="mb-6 p-3 rounded-sm bg-accent/5 border border-accent/25 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-accent">Active Draft Preserved: </span>
                  <span className="text-foreground/80">{currentDraft.name}</span>
                  <p className="text-[11px] text-foreground/50 mt-0.5">
                    Your generated workflow steps and integrations will be claimed to your workspace.
                  </p>
                </div>
              </div>
            )}

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-sm bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successNotice && (
              <div className="mb-5 p-3 rounded-sm bg-accent/10 border border-accent text-accent text-xs flex items-center gap-2.5 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/60 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-foreground/5 border border-foreground/20 rounded-sm py-2.5 pl-10 pr-3 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/60 mb-1.5">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full bg-foreground/5 border border-foreground/20 rounded-sm py-2.5 pl-10 pr-3 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-foreground/60 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-foreground/5 border border-foreground/20 rounded-sm py-2.5 pl-10 pr-3 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-accent text-background hover:bg-white text-xs font-bold uppercase tracking-[0.2em] rounded-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : mode === "signup" ? (
                  <>
                    Create Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-foreground/10" />
              </div>
              <span className="relative bg-background px-3 text-[10px] font-mono uppercase tracking-widest text-foreground/40">
                OR
              </span>
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-3 border border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5 text-xs font-bold uppercase tracking-wider text-foreground rounded-sm transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 7 10.1 7z"
                />
              </svg>
              Continue with Google SSO
            </button>

            {/* Toggle Mode Footer */}
            <div className="mt-6 pt-5 border-t border-foreground/10 text-center">
              {mode === "signup" ? (
                <p className="text-xs text-foreground/60">
                  Already have a workspace?{" "}
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="text-accent font-bold hover:underline ml-1"
                  >
                    Sign in here
                  </button>
                </p>
              ) : (
                <p className="text-xs text-foreground/60">
                  Need a workspace?{" "}
                  <button
                    type="button"
                    onClick={() => openAuthModal("signup")}
                    className="text-accent font-bold hover:underline ml-1"
                  >
                    Create account
                  </button>
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
