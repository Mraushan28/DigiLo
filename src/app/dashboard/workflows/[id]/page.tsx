"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Workflow, WorkflowStep, IntegrationStatusInfo } from "@/types/automation";
import { AnalyticsSummary, AISuggestion } from "@/lib/automation/telemetry-service";
import { IExecution } from "@/lib/mongodb/models/Execution";

import VisualWorkflowCanvas from "@/components/dashboard/VisualWorkflowCanvas";
import WorkflowControlsSection from "@/components/dashboard/WorkflowControlsSection";
import VerifiedAnalyticsSection from "@/components/dashboard/VerifiedAnalyticsSection";
import ExecutionHistorySection from "@/components/dashboard/ExecutionHistorySection";
import AIWorkflowAnalysisSection from "@/components/dashboard/AIWorkflowAnalysisSection";
import AIImprovementSuggestionsSection from "@/components/dashboard/AIImprovementSuggestionsSection";

import { 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Sparkles,
  Layers
} from "lucide-react";

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workflowId = resolvedParams.id;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [liveIntegrations, setLiveIntegrations] = useState<IntegrationStatusInfo[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("ws_default");
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    timeframe: "7d",
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    successRate: null,
    avgDurationMs: 0,
    leadsIngested: 0,
    sheetsRowsWritten: 0,
    notificationsDelivered: 0,
    dailyTrends: [],
    isEmpty: true,
  });

  const [executions, setExecutions] = useState<IExecution[]>([]);
  const [totalExecutions, setTotalExecutions] = useState(0);

  const [aiAnalysis, setAiAnalysis] = useState<{
    intakeSummary: string;
    transformationSummary: string;
    distributionSummary: string;
    operationalHealth: string;
  } | undefined>(undefined);

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [applyingSugId, setApplyingSugId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Workflow details
  const fetchWorkflowData = async () => {
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}`);
      const data = await res.json();
      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        if (data.liveIntegrations) {
          setLiveIntegrations(data.liveIntegrations);
        }
      } else {
        setErrorMessage(data.error?.message || "Failed to load workflow.");
      }
    } catch (err) {
      console.warn("Failed to fetch workflow:", err);
      setErrorMessage("Could not connect to workflow server.");
    }
  };

  // 2. Fetch Analytics
  const fetchAnalytics = async (tf: "24h" | "7d" | "30d") => {
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/analytics?timeframe=${tf}`);
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.warn("Failed to fetch analytics:", err);
    }
  };

  // 3. Fetch Execution Logs
  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/executions?page=1&limit=20`);
      const data = await res.json();
      if (data.success && Array.isArray(data.executions)) {
        setExecutions(data.executions);
        setTotalExecutions(data.total || data.executions.length);
      }
    } catch (err) {
      console.warn("Failed to fetch executions:", err);
    }
  };

  // 4. Fetch AI Suggestions
  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/suggest`);
      const data = await res.json();
      if (data.success) {
        if (data.narrativeAnalysis) {
          setAiAnalysis(data.narrativeAnalysis);
        }
        if (Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch suggestions:", err);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchWorkflowData(),
      fetchAnalytics(timeframe),
      fetchExecutions(),
      fetchSuggestions(),
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();
  }, [workflowId]);

  const handleTimeframeChange = async (tf: "24h" | "7d" | "30d") => {
    setTimeframe(tf);
    await fetchAnalytics(tf);
  };

  // Action: Test Workflow (Dry Run)
  const handleTestWorkflow = async () => {
    setIsTesting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Dry-run test completed successfully! Step telemetry logged.");
        await Promise.all([
          fetchAnalytics(timeframe),
          fetchExecutions(),
          fetchSuggestions(),
        ]);
      } else {
        setErrorMessage(data.error?.message || "Test run failed.");
      }
    } catch (err) {
      setErrorMessage("Failed to trigger dry-run test.");
    } finally {
      setIsTesting(false);
    }
  };

  // Action: Toggle Active / Pause
  const handleToggleActive = async () => {
    if (!workflow) return;
    setIsToggling(true);
    setErrorMessage(null);

    const isCurrentlyActive = workflow.status === "active";
    const endpoint = isCurrentlyActive
      ? `/api/automation/workflows/${workflowId}/pause`
      : `/api/automation/workflows/${workflowId}/activate`;

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        showToast(data.message || (isCurrentlyActive ? "Workflow paused." : "Workflow is now live and active!"));
      } else {
        setErrorMessage(data.error?.message || "Failed to update workflow lifecycle.");
      }
    } catch (err) {
      setErrorMessage("Network error while updating workflow state.");
    } finally {
      setIsToggling(false);
    }
  };

  // Action: Save Proposed Settings from Drawer
  const handleSaveProposedSettings = async (updatedSteps: WorkflowStep[]) => {
    if (!workflow) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: updatedSteps }),
      });

      const data = await res.json();
      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        showToast(data.message || "Proposed settings saved.");
      } else {
        setErrorMessage(data.error?.message || "Failed to update settings.");
      }
    } catch (err) {
      setErrorMessage("Error saving proposed settings.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Action: Apply AI Improvement Suggestion
  const handleApplySuggestion = async (sug: AISuggestion) => {
    setApplyingSugId(sug.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId: sug.id,
          patch: sug.proposedWorkflowPatch || {},
        }),
      });

      const data = await res.json();
      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        showToast(data.message || "Suggestion applied as proposed version.");
      } else {
        setErrorMessage(data.error?.message || "Failed to apply suggestion.");
      }
    } catch (err) {
      setErrorMessage("Error applying suggestion.");
    } finally {
      setApplyingSugId(null);
    }
  };

  // Action: Retry Execution
  const handleRetryExecution = async (executionId: string) => {
    setRetryingId(executionId);
    try {
      const res = await fetch(`/api/automation/workflows/${workflowId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Execution retry succeeded.");
        await Promise.all([fetchAnalytics(timeframe), fetchExecutions()]);
      } else {
        setErrorMessage(data.error?.message || "Retry failed.");
      }
    } catch (err) {
      setErrorMessage("Failed to retry execution.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col pt-24 pb-24 bg-background min-h-screen">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col gap-8">
          
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-foreground/10">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                id="link-back-dashboard"
                className="p-2 border border-foreground/15 rounded-sm hover:border-accent text-foreground/70 hover:text-foreground transition-colors"
                title="Back to All Workflows"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-accent">
                    WORKFLOW STUDIO
                  </span>
                  <span className="text-[10px] font-mono text-foreground/40">
                    ID: {workflowId}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground truncate max-w-xl">
                  {workflow?.name || "Workflow Studio"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="btn-refresh-all-data"
                onClick={loadAllData}
                className="p-2 border border-foreground/15 text-foreground/70 hover:text-foreground rounded-sm transition-colors"
                title="Refresh All Studio Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>

              <Link
                href="/automation"
                className="px-3.5 py-1.5 border border-foreground/20 hover:border-accent text-xs font-mono font-bold uppercase tracking-wider rounded-sm text-foreground/80 hover:text-foreground transition-all"
              >
                Planner View
              </Link>
            </div>
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div 
              id="toast-notification"
              className="p-4 bg-accent/15 border border-accent rounded-sm text-accent text-xs font-mono flex items-center gap-2.5 animate-in slide-in-from-top duration-200 shadow-xl"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div 
              id="error-banner"
              className="p-4 bg-red-950/40 border border-red-500/40 rounded-sm text-red-300 text-xs font-mono flex items-center justify-between gap-2.5 shadow-xl"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading && !workflow ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <Activity className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs font-mono text-foreground/60">
                Loading workflow graph and verified telemetry...
              </p>
            </div>
          ) : workflow ? (
            <div className="flex flex-col gap-8">
              
              {/* STRICT SECTION A: VISUAL WORKFLOW CANVAS (Top of Page) */}
              <VisualWorkflowCanvas
                workflow={workflow}
                isActiveVersion={workflow.status === "active"}
                activeVersionTag={workflow.version || "v1.0.0"}
                draftVersionTag="Draft v1.1.0"
                onSaveProposedSettings={handleSaveProposedSettings}
                isSaving={isSavingDraft}
              />

              {/* STRICT SECTION B: WORKFLOW CONTROLS & STATUS */}
              <WorkflowControlsSection
                workflow={workflow}
                liveIntegrations={liveIntegrations}
                onTestWorkflow={handleTestWorkflow}
                onToggleActive={handleToggleActive}
                isTesting={isTesting}
                isToggling={isToggling}
                workspaceId={workspaceId}
                hasSuccessfulTest={executions.some((e) => e.status === "success") || analytics.successfulRuns > 0}
                onRefreshIntegrations={fetchWorkflowData}
                onWorkflowUpdated={(updated) => setWorkflow(updated)}
              />

              {/* STRICT SECTION C: VERIFIED ANALYTICS DASHBOARD */}
              <VerifiedAnalyticsSection
                analytics={analytics}
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
              />

              {/* STRICT SECTION D: EXECUTION HISTORY & STEP DIAGNOSTICS */}
              <ExecutionHistorySection
                executions={executions}
                total={totalExecutions}
                onRetryExecution={handleRetryExecution}
                retryingId={retryingId}
                onRefresh={fetchExecutions}
              />

              {/* STRICT SECTION E: AI WORKFLOW ANALYSIS */}
              <AIWorkflowAnalysisSection
                analysis={aiAnalysis}
              />

              {/* STRICT SECTION F: AI IMPROVEMENT SUGGESTIONS */}
              <AIImprovementSuggestionsSection
                suggestions={suggestions}
                onApplySuggestion={handleApplySuggestion}
                applyingId={applyingSugId}
              />

            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                Workflow Not Found
              </h2>
              <p className="text-xs text-foreground/50 max-w-sm mx-auto">
                The requested automation could not be resolved in this tenant workspace.
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block px-4 py-2 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm"
              >
                Return to Dashboard
              </Link>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
