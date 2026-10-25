"use client";

import { useState } from "react";
import { AISuggestion } from "@/lib/automation/telemetry-service";
import { 
  Lightbulb, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Layers, 
  CheckCircle2,
  X,
  TrendingUp,
  Scale,
  ShieldCheck,
  Check
} from "lucide-react";

interface AIImprovementSuggestionsSectionProps {
  suggestions: AISuggestion[];
  onApplySuggestion: (suggestion: AISuggestion) => Promise<void>;
  applyingId: string | null;
}

export default function AIImprovementSuggestionsSection({
  suggestions,
  onApplySuggestion,
  applyingId,
}: AIImprovementSuggestionsSectionProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedReview, setSelectedReview] = useState<AISuggestion | null>(null);

  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  // Category visual treatment helper
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "security":
        return {
          icon: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
          label: "Security Optimization",
          badgeClass: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
          cardBorder: "border-indigo-500/25 hover:border-indigo-500/50",
          cardBg: "bg-gradient-to-br from-[#101426] to-[#0a0d16]",
          accentDot: "bg-indigo-400",
        };
      case "latency":
      case "performance":
        return {
          icon: <Zap className="w-4 h-4 text-emerald-400" />,
          label: "Performance Optimization",
          badgeClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          cardBorder: "border-emerald-500/25 hover:border-emerald-500/50",
          cardBg: "bg-gradient-to-br from-[#0c1817] to-[#080f11]",
          accentDot: "bg-emerald-400",
        };
      case "reliability":
        return {
          icon: <Layers className="w-4 h-4 text-sky-400" />,
          label: "Reliability Guard",
          badgeClass: "bg-sky-500/15 border-sky-500/30 text-sky-300",
          cardBorder: "border-sky-500/25 hover:border-sky-500/50",
          cardBg: "bg-gradient-to-br from-[#0d1624] to-[#080d16]",
          accentDot: "bg-sky-400",
        };
      case "cost":
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          label: "Cost & Token Efficiency",
          badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          cardBorder: "border-amber-500/25 hover:border-amber-500/50",
          cardBg: "bg-gradient-to-br from-[#191610] to-[#0f0e0a]",
          accentDot: "bg-amber-400",
        };
    }
  };

  return (
    <section 
      id="section-ai-improvement-suggestions"
      aria-label="Section F: AI Improvement Suggestions"
      className="border border-white/12 bg-gradient-to-b from-[#0e131f] to-[#0a0d14] rounded-sm p-6 shadow-2xl flex flex-col gap-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(204,255,0,0.2)]">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              SECTION F: AI Improvement Suggestions
            </h2>
            <p className="text-xs text-slate-400">
              Evidence-based optimizations with human-in-the-loop draft branch creation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-accent font-semibold px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-sm flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero Silent Mutation Policy
          </span>
        </div>
      </div>

      {activeSuggestions.length === 0 ? (
        <div 
          id="suggestions-empty-state"
          className="border border-white/10 bg-[#121826]/40 rounded-sm py-12 px-6 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center text-accent mx-auto shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            All Optimization Suggestions Addressed
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Your workflow configuration adheres to security, latency, and reliability best practices.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeSuggestions.map((sug) => {
            const isApplying = applyingId === sug.id;
            const config = getCategoryConfig(sug.category);

            return (
              <div
                key={sug.id}
                id={`suggestion-card-${sug.id}`}
                className={`border ${config.cardBorder} ${config.cardBg} p-5 rounded-sm transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col gap-4`}
              >
                {/* Header Row: Category Badge + Title + Action Buttons */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-sm border ${config.badgeClass}`}>
                      {config.icon}
                      {config.label}
                    </span>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      {sug.title}
                    </h3>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedReview(sug)}
                      className="px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/12 hover:border-white/20 rounded-sm transition-colors"
                    >
                      Review Details
                    </button>

                    <button
                      type="button"
                      id={`btn-apply-suggestion-${sug.id}`}
                      onClick={() => onApplySuggestion(sug)}
                      disabled={isApplying}
                      className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm bg-accent text-background hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{isApplying ? "Applying..." : "Apply as Draft v1.1"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDismiss(sug.id)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                      title="Dismiss Suggestion"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Evidence & Proposed Action Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                      Observed Evidence
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      {sug.evidence}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                      Proposed Architecture
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      {sug.proposedAction}
                    </p>
                  </div>
                </div>

                {/* Estimated Impact vs Trade-off Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong className="text-slate-400 font-normal">Estimated Impact:</strong> {sug.expectedBenefit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Scale className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span>
                      <strong className="text-slate-500 font-normal">Trade-off:</strong> {sug.potentialTradeOff}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Changes Modal */}
      {selectedReview && (
        <div 
          id="modal-review-suggestion"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-[#0f1422] border border-white/15 p-6 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Review Proposed Modification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono text-slate-300">
              <div className="bg-[#141b29] p-3 border border-white/10 rounded-sm">
                <span className="text-slate-400 uppercase text-[10px] block mb-1">Title</span>
                <p className="font-bold text-white text-sm">{selectedReview.title}</p>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] block mb-1">Proposed Architecture</span>
                <p className="text-slate-200 leading-relaxed">{selectedReview.proposedAction}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block mb-0.5">Estimated Impact</span>
                  <p className="text-emerald-400">{selectedReview.expectedBenefit}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block mb-0.5">Trade-off Consideration</span>
                  <p className="text-slate-400">{selectedReview.potentialTradeOff}</p>
                </div>
              </div>

              <div className="p-3 bg-accent/10 border border-accent/25 rounded-sm">
                <div className="flex items-center gap-1.5 text-accent font-bold text-[11px] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Strict Governance Policy</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Applying this suggestion creates a new Proposed Draft Version (v1.1). Your active production version will not be mutated or interrupted until explicitly tested and activated.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-3.5 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = selectedReview;
                  setSelectedReview(null);
                  await onApplySuggestion(target);
                }}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-accent text-background rounded-sm hover:brightness-110 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
              >
                Confirm & Create Proposed Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
