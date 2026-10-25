"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { GenerateAutomationResponse } from "@/types/automation";

import WorkflowReviewApproval from "./WorkflowReviewApproval";
import WorkflowClarificationForm from "./WorkflowClarificationForm";

const LOADING_MESSAGES = [
  "Understanding your requirement...",
  "Identifying the trigger...",
  "Planning workflow steps...",
  "Checking available integrations...",
  "Validating automation..."
];

export default function AutomationHero() {
  const [prompt, setPrompt] = useState("Whenever a new lead comes from my website, save it to Google Sheets, analyze it with AI and notify my sales team on Slack.");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [response, setResponse] = useState<GenerateAutomationResponse | null>(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);

  // Restore draft workflow on initial mount if available in encrypted session cookie
  useEffect(() => {
    async function loadSavedDraft() {
      try {
        const res = await fetch("/api/automation/draft");
        if (res.ok) {
          const data = await res.json();
          if (data.hasDraft && data.draft) {
            setResponse({
              status: "success",
              workflow: data.draft,
            });
            setDraftRestoredNotice(`Draft restored: "${data.draft.name}"`);
            setTimeout(() => setDraftRestoredNotice(null), 5000);
          }
        }
      } catch {
        // Non-fatal
      }
    }
    loadSavedDraft();
  }, []);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const saveDraftCookie = async (wf: unknown) => {
    if (!wf) return;
    try {
      await fetch("/api/automation/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: wf }),
      });
    } catch {
      // Non-fatal
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setValidationError("Please enter a description of what you want to automate.");
      return;
    }
    
    setValidationError(null);
    setIsLoading(true);
    setResponse(null);
    setLoadingMsgIdx(0);
    setDraftRestoredNotice(null);

    try {
      const res = await fetch("/api/automation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      if (data.success) {
        setResponse(data);
        if (data.workflow) {
          saveDraftCookie(data.workflow);
        }
      } else {
        setResponse({
          status: "error",
          error: data.error || { code: "UNKNOWN", message: "We couldn't generate your automation. Please try again." }
        });
      }
    } catch {
      setResponse({
        status: "error",
        error: { code: "NETWORK_ERROR", message: "We couldn't generate your automation. Please check your connection and try again." }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (answers: { question: string; answer: string }[]) => {
    setIsLoading(true);
    setLoadingMsgIdx(0);

    try {
      const res = await fetch("/api/automation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, clarificationAnswers: answers })
      });
      const data = await res.json();

      if (data.success) {
        setResponse(data);
        if (data.workflow) {
          saveDraftCookie(data.workflow);
        }
      } else {
        setResponse({
          status: "error",
          error: data.error || { code: "UNKNOWN", message: "Failed to generate workflow from clarification answers." }
        });
      }
    } catch {
      setResponse({
        status: "error",
        error: { code: "NETWORK_ERROR", message: "Network error submitting clarification answers." }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-background text-foreground">
      
      {/* 1. TOP PROMPT AREA: COMPACT & VISIBLE WITHOUT SCROLLING */}
      <section 
        id="section-prompt-hero"
        aria-label="Automation Prompt Section"
        className="pt-28 sm:pt-32 pb-8 sm:pb-12 px-6 border-b border-foreground/10 bg-foreground/[0.015] relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.08),transparent_70%)]" />

        <div className="container mx-auto max-w-4xl relative z-10 flex flex-col items-center text-center">
          {/* Eyebrow */}
          <span className="text-accent font-mono text-xs uppercase tracking-[0.25em] font-bold mb-2.5 block">
            DIGILO AI AUTOMATION
          </span>

          {/* Short Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-white leading-[1.05] mb-2.5">
            Tell Us What to Automate.
          </h1>

          {/* Short Supporting Text */}
          <p className="text-sm sm:text-base text-slate-300 font-normal mb-6 max-w-xl">
            Describe your process. Get a clear automation plan.
          </p>

          {/* Prompt Input Box Card */}
          <div className="w-full border border-white/12 bg-gradient-to-br from-[#121724] to-[#0c101a] backdrop-blur-xl p-5 sm:p-6 rounded-sm shadow-[0_16px_50px_rgba(0,0,0,0.6)] flex flex-col gap-4 text-left">
            <div>
              <textarea 
                id="prompt-input"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full p-4 border border-white/15 bg-[#141b29] text-white font-normal text-sm sm:text-base leading-relaxed resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all rounded-sm placeholder:text-slate-500 shadow-inner"
                rows={3}
                placeholder="e.g. Read new rows from Google Sheets and publish them to my website automatically..."
                disabled={isLoading}
              />

              {validationError && (
                <div className="mt-2 text-xs font-mono text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 mr-1">
                  Try example:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Read new rows from Google Sheets and publish them to my website automatically.");
                    if (validationError) setValidationError(null);
                  }}
                  className="text-xs font-mono text-slate-300 hover:text-white hover:border-accent/40 bg-[#161e2e] hover:bg-[#1a2334] px-3 py-1.5 rounded-sm border border-white/10 transition-all shadow-sm"
                >
                  Sheets → Publisher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Whenever a new lead comes from my website, save it to Google Sheets, analyze it with AI and notify my sales team on Slack.");
                    if (validationError) setValidationError(null);
                  }}
                  className="text-xs font-mono text-slate-300 hover:text-white hover:border-accent/40 bg-[#161e2e] hover:bg-[#1a2334] px-3 py-1.5 rounded-sm border border-white/10 transition-all shadow-sm"
                >
                  Lead → AI → Sheets → Slack
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Whenever a new website inquiry is submitted, send an automated email notification via Gmail to sales@digilo.tech.");
                    if (validationError) setValidationError(null);
                  }}
                  className="text-xs font-mono text-slate-300 hover:text-white hover:border-accent/40 bg-[#161e2e] hover:bg-[#1a2334] px-3 py-1.5 rounded-sm border border-white/10 transition-all shadow-sm"
                >
                  Lead → Gmail Alert
                </button>
              </div>

              <button 
                id="btn-generate-automation"
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center justify-center gap-2 bg-accent hover:brightness-110 text-background font-mono font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-6 text-xs transition-all rounded-sm shadow-[0_0_20px_rgba(204,255,0,0.2)] shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Generate Automation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. GENERATED WORKFLOW SECTION (DIRECTLY BENEATH PROMPT AREA) */}
      <section 
        id="section-generated-workflow"
        aria-label="Generated Workflow Section"
        className="w-full py-12 sm:py-16 px-4 sm:px-6 min-h-[350px] bg-gradient-to-b from-[#0b0e15] via-[#0d121c] to-[#090c12] border-t border-white/[0.08] relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.04),transparent_70%)]" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <AnimatePresence mode="wait">
            
            {/* Loading State */}
            {isLoading && (
              <motion.div 
                key="loading-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="border border-white/10 bg-gradient-to-br from-[#121724] to-[#0c101a] p-12 rounded-sm flex flex-col items-center justify-center text-center shadow-2xl"
              >
                <span className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-foreground mb-1.5">
                  Formulating Automation Plan...
                </h3>
                <p className="text-xs font-mono text-accent h-4">
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
              </motion.div>
            )}

            {/* Error State */}
            {!isLoading && response?.status === "error" && (
              <motion.div 
                key="error-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/20 border border-red-900/50 p-8 rounded-sm flex flex-col items-center justify-center text-center shadow-xl"
              >
                <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 mb-1.5">
                  Automation Generation Error
                </h3>
                <p className="text-red-200 text-xs font-medium max-w-md mb-5">
                  {response.error?.message}
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors border border-red-800"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Clarification State */}
            {!isLoading && response?.status === "needs_clarification" && (
              <motion.div 
                key="clarification-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <WorkflowClarificationForm
                  questions={response.questions || [
                    "Can you specify what trigger event initiates this workflow?",
                    "Which specific tools should be used for storage or notifications?"
                  ]}
                  originalPrompt={prompt}
                  onSubmitAnswers={handleClarificationSubmit}
                  onBackToPrompt={() => setResponse(null)}
                  isSubmitting={isLoading}
                />
              </motion.div>
            )}

            {/* Generated Workflow Review & Approval */}
            {!isLoading && response?.status === "success" && response.workflow && (
              <motion.div 
                key="workflow-review-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col gap-4"
              >
                {draftRestoredNotice && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-accent/10 border border-accent/30 text-accent text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{draftRestoredNotice} (preserved from pending draft session)</span>
                  </div>
                )}

                <WorkflowReviewApproval
                  key={`${response.workflow.name}-${response.workflow.steps.map(s => s.action).join("_")}-${response.workflow.updatedAt || ""}`}
                  initialWorkflow={response.workflow}
                  onRegenerate={handleGenerate}
                  onWorkflowChange={(updated) => {
                    setResponse((prev) => (prev ? { ...prev, workflow: updated } : prev));
                    saveDraftCookie(updated);
                  }}
                />
              </motion.div>
            )}

            {/* Default Placeholder when no prompt has been submitted */}
            {!isLoading && !response && (
              <div className="border border-white/10 bg-gradient-to-br from-[#111622]/60 to-[#0c1018]/60 p-12 rounded-sm flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-[#182133] border border-white/15 flex items-center justify-center text-accent mb-4 shadow-inner">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1.5">
                  Automation Plan Generator Ready
                </h3>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Enter your business process above and click &ldquo;Generate Automation&rdquo;. DIGILO will formulate triggers, pipeline action steps, and required integrations.
                </p>
              </div>
            )}

          </AnimatePresence>
        </div>
      </section>

    </div>
  );
}
