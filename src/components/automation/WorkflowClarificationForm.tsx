"use client";

import { useState } from "react";
import { Send, ArrowLeft, HelpCircle } from "lucide-react";

interface WorkflowClarificationFormProps {
  questions: string[];
  originalPrompt: string;
  onSubmitAnswers: (answers: { question: string; answer: string }[]) => void;
  onBackToPrompt: () => void;
  isSubmitting?: boolean;
}

export default function WorkflowClarificationForm({
  questions,
  originalPrompt,
  onSubmitAnswers,
  onBackToPrompt,
  isSubmitting = false
}: WorkflowClarificationFormProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (index: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [index]: text }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify at least one question has been answered
    const answeredList = questions.map((q, idx) => ({
      question: q,
      answer: (answers[idx] || "").trim()
    }));

    const hasAnyAnswer = answeredList.some((item) => item.answer.length > 0);

    if (!hasAnyAnswer) {
      setError("Please provide an answer to at least one question so DIGILO can construct your workflow accurately.");
      return;
    }

    onSubmitAnswers(answeredList);
  };

  return (
    <div className="border border-yellow-500/30 bg-yellow-950/10 p-6 sm:p-8 rounded-sm relative overflow-hidden flex flex-col gap-6">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-yellow-500/90 font-bold block">
              AI Clarification Required
            </span>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground">
              A Few Quick Details Are Needed
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToPrompt}
          className="text-xs font-mono text-foreground/50 hover:text-foreground flex items-center gap-1.5 transition-colors self-start shrink-0 pt-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Edit Prompt
        </button>
      </div>

      <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
        DIGILO identified that your prompt needs a few specific clarifications before it can generate a safe, strictly typed automation plan. Please answer the questions below:
      </p>

      {/* Original prompt reference */}
      <div className="bg-foreground/[0.02] border border-foreground/10 p-3.5 rounded-sm">
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 block mb-1">
          Your Original Prompt
        </span>
        <p className="text-xs text-foreground/80 italic line-clamp-3">
          &ldquo;{originalPrompt}&rdquo;
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-background/80 border border-foreground/15 p-4 rounded-sm space-y-2">
            <label className="text-xs font-semibold text-foreground/90 block leading-snug">
              <span className="text-yellow-400 font-mono mr-2">Q{idx + 1}.</span>
              {q}
            </label>
            <textarea
              value={answers[idx] || ""}
              onChange={(e) => handleAnswerChange(idx, e.target.value)}
              placeholder="Type your answer here..."
              rows={2}
              className="w-full bg-foreground/5 border border-foreground/15 text-foreground text-xs p-3 rounded-sm focus:outline-none focus:border-yellow-400 resize-y"
              disabled={isSubmitting}
            />
          </div>
        ))}

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-sm text-xs text-red-300 font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToPrompt}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-3 border border-foreground/20 text-foreground/80 hover:bg-foreground/5 text-xs font-bold uppercase tracking-[0.15em] transition-colors rounded-sm"
          >
            Cancel & Revise Prompt
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-[0.2em] transition-colors duration-200 flex items-center justify-center gap-2 rounded-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? "Generating Plan..." : "Submit Answers & Generate Workflow"}
          </button>
        </div>
      </form>
    </div>
  );
}
