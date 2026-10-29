"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { GenerateAutomationResponse } from "@/types/automation";

import WorkflowReviewApproval from "./WorkflowReviewApproval";
import WorkflowClarificationForm from "./WorkflowClarificationForm";

const LOADING_MESSAGES = [
  "Analyzing your request...",
  "Building workflow steps...",
  "Validating integrations...",
];

export default function AutomationHero() {
  const [prompt, setPrompt] = useState(
    "Whenever a new lead comes from my website, save it to Google Sheets, analyze it with AI and notify my sales team on Slack."
  );
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
      }, 700);
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
        body: JSON.stringify({ prompt }),
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
          error:
            data.error || {
              code: "UNKNOWN",
              message: "We couldn't generate your automation. Please try again.",
            },
        });
      }
    } catch {
      setResponse({
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message:
            "We couldn't generate your automation. Please check your connection and try again.",
        },
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
        body: JSON.stringify({ prompt, clarificationAnswers: answers }),
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
          error:
            data.error || {
              code: "UNKNOWN",
              message: "Failed to generate workflow from clarification answers.",
            },
        });
      }
    } catch {
      setResponse({
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message: "Network error submitting clarification answers.",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0A0A0A] text-white">
      {/* 1. TOP PROMPT AREA: COMPACT & VISIBLE WITHOUT SCROLLING (PRD v3.1 Spec) */}
      <section
        id="section-prompt-hero"
        aria-label="Automation Prompt Section"
        className="pt-28 sm:pt-32 pb-8 sm:pb-12 px-6 border-b border-[#222222] bg-[#0D0D0D] relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(200,255,0,0.08),transparent_70%)]" />

        <div className="container mx-auto max-w-4xl relative z-10 flex flex-col items-center text-center">
          {/* Eyebrow (PRD v3.1 Spec) */}
          <span className="text-[#C8FF00] font-mono text-xs uppercase tracking-[0.25em] font-bold mb-2.5 block">
            DIGILO AI AUTOMATION &mdash; AI AUTOMATION BUILDER
          </span>

          {/* Short Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-white leading-[1.05] mb-2.5">
            Tell Us What to Automate.
          </h1>

          {/* Short Supporting Text */}
          <p className="text-sm sm:text-base text-[#A0A0A0] font-normal mb-6 max-w-xl">
            Describe your process. Get a clear automation plan.
          </p>

          {/* Terminal-style Prompt Box Card */}
          <div className="w-full border border-[#222222] bg-[#111111] backdrop-blur-xl p-5 sm:p-6 rounded-lg shadow-2xl flex flex-col gap-4 text-left">
            <div className="relative">
              <textarea
                id="prompt-input"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full p-4 border border-[#222222] bg-[#161616] text-white font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00]/40 transition-all rounded-lg placeholder:text-[#555555] shadow-inner"
                rows={3}
                placeholder="Describe your automation in plain English... e.g. 'Read new rows from Google Sheets and publish them to my website automatically' or 'When someone fills my contact form, classify them with AI as Hot, Warm or Cold, save to Google Sheets, and notify my Slack channel'"
                disabled={isLoading}
              />

              {/* Character Counter (PRD v3.1 Spec) */}
              <div className="flex justify-between items-center mt-1 px-1">
                {validationError ? (
                  <div className="text-xs font-mono text-[#EF4444] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                ) : (
                  <div />
                )}
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#555555]">
                  {prompt.length} characters
                </span>
              </div>
            </div>

            {/* Example Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#222222]">
              <span className="text-[11px] font-mono text-[#555555] mr-1">Try example:</span>
              <button
                type="button"
                onClick={() => {
                  setPrompt(
                    "Whenever a new lead comes from my website, save it to Google Sheets, analyze it with AI and notify my sales team on Slack."
                  );
                  if (validationError) setValidationError(null);
                }}
                className="text-xs font-mono text-[#A0A0A0] hover:text-white hover:border-[#C8FF00]/40 bg-[#1A1A1A] hover:bg-[#222222] px-3 py-1.5 rounded border border-[#222222] transition-all"
              >
                Lead → AI → Sheets → Slack
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(
                    "Read new rows from Google Sheets and publish them to my website automatically."
                  );
                  if (validationError) setValidationError(null);
                }}
                className="text-xs font-mono text-[#A0A0A0] hover:text-white hover:border-[#C8FF00]/40 bg-[#1A1A1A] hover:bg-[#222222] px-3 py-1.5 rounded border border-[#222222] transition-all"
              >
                Sheets → Publisher
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrompt(
                    "Whenever a new website inquiry is submitted, send an automated email notification via Gmail to sales@digilo.space."
                  );
                  if (validationError) setValidationError(null);
                }}
                className="text-xs font-mono text-[#A0A0A0] hover:text-white hover:border-[#C8FF00]/40 bg-[#1A1A1A] hover:bg-[#222222] px-3 py-1.5 rounded border border-[#222222] transition-all"
              >
                Lead → Gmail Alert
              </button>
            </div>

            {/* Full-width Lime CTA Button (PRD v3.1 Spec) */}
            <button
              id="btn-generate-automation"
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#C8FF00] hover:bg-[#b2e600] text-black font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed py-3.5 px-6 text-sm transition-all rounded-lg shadow-lg shadow-[#C8FF00]/15"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Generate Automation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. GENERATED WORKFLOW SECTION (DIRECTLY BENEATH PROMPT AREA) */}
      <section
        id="section-generated-workflow"
        aria-label="Generated Automation Studio"
        className="py-12 px-6 border-b border-[#222222]"
      >
        <div className="container mx-auto max-w-5xl">
          {/* Notification for restored draft */}
          <AnimatePresence>
            {draftRestoredNotice && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-lg bg-[#C8FF00]/10 border border-[#C8FF00]/30 text-xs font-mono text-[#C8FF00] flex items-center justify-between"
              >
                <span>{draftRestoredNotice}</span>
                <span className="text-[10px] text-[#A0A0A0]">Auto-saved from previous session</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#C8FF00] border-t-transparent animate-spin mb-4" />
              <span className="font-mono text-sm uppercase tracking-widest text-[#C8FF00] font-bold">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </span>
              <p className="text-xs text-[#555555] mt-2 font-mono">
                Structuring intent, triggers, actions, and validation schemas...
              </p>
            </div>
          )}

          {/* Clarification Needed */}
          {!isLoading && response?.status === "needs_clarification" && response.questions && (
            <WorkflowClarificationForm
              questions={response.questions}
              originalPrompt={prompt}
              onSubmitAnswers={handleClarificationSubmit}
              onBackToPrompt={() => setResponse(null)}
              isSubmitting={isLoading}
            />
          )}

          {/* Error Message */}
          {!isLoading && response?.status === "error" && (
            <div className="p-6 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-center">
              <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto mb-2" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight mb-1">
                Generation Encountered An Issue
              </h3>
              <p className="text-xs text-[#A0A0A0] max-w-md mx-auto">
                {response.error?.message || "Please rephrase your prompt and try again."}
              </p>
              <button
                onClick={handleGenerate}
                className="mt-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#222222] border border-[#222222] text-white text-xs font-mono uppercase tracking-wider rounded transition-colors"
              >
                Retry Generation
              </button>
            </div>
          )}

          {/* Generated Workflow Review & Approval */}
          {!isLoading && response?.status === "success" && response.workflow && (
            <WorkflowReviewApproval
              initialWorkflow={response.workflow}
              onRegenerate={handleGenerate}
            />
          )}
        </div>
      </section>
    </div>
  );
}
