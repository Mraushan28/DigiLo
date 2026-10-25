"use client";

import { useState } from "react";
import { IExecution, IStepExecutionResult } from "@/lib/mongodb/models/Execution";
import { 
  History, 
  ChevronDown, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  FileText,
  AlertTriangle
} from "lucide-react";

interface ExecutionHistorySectionProps {
  executions: IExecution[];
  total: number;
  onRetryExecution: (executionId: string) => Promise<void>;
  retryingId: string | null;
  onRefresh?: () => void;
}

export default function ExecutionHistorySection({
  executions,
  total,
  onRetryExecution,
  retryingId,
  onRefresh,
}: ExecutionHistorySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section 
      id="section-execution-history"
      aria-label="Section D: Execution History & Step Diagnostics"
      className="border border-foreground/15 bg-background/95 rounded-sm p-6 shadow-xl flex flex-col gap-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-accent" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
              SECTION D: Execution History & Step Diagnostics
            </h2>
          </div>
          <p className="text-[11px] text-foreground/60 font-mono">
            Audited step traces with automated PII masking and actionable error remediation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-foreground/50">
            {total} Total Recorded
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] font-mono text-foreground/60 hover:text-foreground px-2 py-1 rounded-sm border border-foreground/10 hover:border-foreground/20"
            >
              Refresh Logs
            </button>
          )}
        </div>
      </div>

      {executions.length === 0 ? (
        <div 
          id="executions-empty-state"
          className="border border-foreground/10 bg-foreground/[0.01] rounded-sm py-10 px-6 text-center space-y-2"
        >
          <Clock className="w-8 h-8 text-foreground/30 mx-auto" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            No Execution Logs Found
          </h3>
          <p className="text-xs text-foreground/50 max-w-sm mx-auto">
            Test runs and live webhook dispatches will appear here with detailed step-by-step diagnostic timings.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-foreground/10 rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-foreground/10 bg-foreground/[0.02] text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Trigger Summary</th>
                <th className="py-2.5 px-4">Steps Executed</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10 font-mono text-xs">
              {executions.map((ex) => {
                const isExpanded = expandedId === ex.n8nExecutionId;
                const isSuccess = ex.status === "success";

                return (
                  <tr key={ex.n8nExecutionId} className="group hover:bg-foreground/[0.01] transition-colors">
                    <td colSpan={6} className="p-0">
                      <div 
                        onClick={() => toggleExpand(ex.n8nExecutionId)}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer select-none"
                      >
                        {/* Status */}
                        <div className="w-24 shrink-0 flex items-center gap-1.5">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-accent font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" />
                              FAILED
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="w-36 shrink-0 text-foreground/60 text-[11px]">
                          {new Date(ex.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>

                        {/* Duration */}
                        <div className="w-24 shrink-0 text-foreground/80 font-bold text-[11px]">
                          {ex.durationMs || 0}ms
                        </div>

                        {/* Trigger Summary */}
                        <div className="flex-1 truncate px-2 text-foreground/70 text-[11px]">
                          {ex.triggerEvent?.redactedSummary || `${ex.triggerEvent?.source} (${ex.triggerEvent?.event})`}
                        </div>

                        {/* Steps Executed summary */}
                        <div className="w-28 shrink-0 text-[11px] text-foreground/50">
                          {ex.stepResults?.length || 0} step(s)
                        </div>

                        {/* Actions */}
                        <div className="w-32 shrink-0 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {!isSuccess && (
                            <button
                              type="button"
                              id={`btn-retry-${ex.n8nExecutionId}`}
                              onClick={() => onRetryExecution(ex.n8nExecutionId)}
                              disabled={retryingId === ex.n8nExecutionId}
                              className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm bg-foreground/10 hover:bg-foreground/20 text-foreground flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingId === ex.n8nExecutionId ? "animate-spin" : ""}`} />
                              <span>{retryingId === ex.n8nExecutionId ? "..." : "Retry"}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpand(ex.n8nExecutionId)}
                            className="p-1 text-foreground/40 hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Step Drilldown & PII Inspection */}
                      {isExpanded && (
                        <div className="bg-foreground/[0.02] border-t border-foreground/10 p-5 space-y-4">
                          <div className="flex items-center justify-between text-[11px] font-mono text-foreground/60">
                            <span className="font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              Step-by-Step Execution Diagnostics Trace
                            </span>
                            <span>Execution ID: {ex.n8nExecutionId}</span>
                          </div>

                          <div className="space-y-2.5">
                            {ex.stepResults?.map((step: IStepExecutionResult, stepIdx: number) => {
                              const stepSuccess = step.status === "success";

                              return (
                                <div
                                  key={step.stepId || stepIdx}
                                  className={`border rounded-sm p-3.5 ${
                                    stepSuccess
                                      ? "border-foreground/15 bg-background"
                                      : "border-red-500/40 bg-red-950/20"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {stepSuccess ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                      )}
                                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                                        Step {stepIdx + 1}: {step.stepName}
                                      </span>
                                      <span className="text-[10px] text-foreground/40 font-mono">
                                        ({step.action})
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold text-foreground/70">
                                      {step.durationMs}ms
                                    </span>
                                  </div>

                                  {/* Error Remediation Hint (PRD Section 4.4) */}
                                  {step.errorMessage && (
                                    <div className="mt-2 p-3 bg-red-950/40 border border-red-500/30 rounded-sm text-xs space-y-1">
                                      <p className="text-red-300 font-bold flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                        Error: {step.errorMessage}
                                      </p>
                                      {step.errorRemediation && (
                                        <p className="text-foreground/80 text-[11px] pl-5">
                                          💡 Remediation: {step.errorRemediation}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Output Summary with Masked PII */}
                                  {step.outputSummary && (
                                    <div className="mt-2 text-[11px] font-mono bg-foreground/5 p-2 rounded-sm text-foreground/70 overflow-x-auto max-h-24">
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(step.outputSummary, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
