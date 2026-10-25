"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Workflow } from "@/types/automation";
import { useAuth } from "@/components/auth/AuthContext";
import { 
  Sparkles, 
  Layers, 
  Activity, 
  Play, 
  Pause, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Database, 
  MessageSquare, 
  Mail,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

interface WorkflowItem extends Workflow {
  executionCount?: number;
  successRate?: number | null;
  lastRunAt?: string;
}

export default function DashboardOverviewPage() {
  const { user, workspace } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/automation/workflows");
      const data = await res.json();
      if (data.success && Array.isArray(data.workflows)) {
        setWorkflows(data.workflows);
      }
    } catch (err) {
      console.warn("Failed to fetch workflows:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || w.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalExecutions = workflows.reduce((sum, w) => sum + (w.executionCount || 0), 0);

  const getStepIcon = (action: string) => {
    if (action.includes("ai")) return <Sparkles className="w-3.5 h-3.5 text-accent" />;
    if (action.includes("sheet")) return <Database className="w-3.5 h-3.5 text-emerald-400" />;
    if (action.includes("slack")) return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
    if (action.includes("gmail") || action.includes("mail")) return <Mail className="w-3.5 h-3.5 text-amber-400" />;
    return <Layers className="w-3.5 h-3.5 text-foreground/70" />;
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col pt-24 pb-20 bg-background min-h-screen">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col gap-8">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-foreground/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-sm bg-accent/10 border border-accent/30 text-accent">
                  ENTERPRISE CONTROL PLANE
                </span>
                <span className="text-xs font-mono text-foreground/50">
                  {workspace?.name || "Client Workspace"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                Automation Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 max-w-xl font-normal mt-1">
                Monitor live automations, test isolated dry runs, inspect execution traces, and optimize pipelines.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-refresh-workflows"
                onClick={fetchWorkflows}
                className="p-2.5 rounded-sm border border-foreground/15 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title="Refresh Workflows"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/automation"
                id="btn-new-automation-link"
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Automation</span>
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-foreground/15 bg-background/80 p-5 rounded-sm shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Total Workflows
              </span>
              <p className="text-3xl font-bold font-mono text-foreground">
                {workflows.length}
              </p>
              <span className="text-[10px] font-mono text-foreground/40 mt-1 block">
                Staged & configured
              </span>
            </div>

            <div className="border border-foreground/15 bg-background/80 p-5 rounded-sm shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Active Live
              </span>
              <p className="text-3xl font-bold font-mono text-accent">
                {activeCount}
              </p>
              <span className="text-[10px] font-mono text-accent/70 mt-1 block">
                Listening for triggers
              </span>
            </div>

            <div className="border border-foreground/15 bg-background/80 p-5 rounded-sm shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Total Runs
              </span>
              <p className="text-3xl font-bold font-mono text-foreground">
                {totalExecutions.toLocaleString()}
              </p>
              <span className="text-[10px] font-mono text-foreground/40 mt-1 block">
                Verified telemetry
              </span>
            </div>

            <div className="border border-foreground/15 bg-background/80 p-5 rounded-sm shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Integrations Vault
              </span>
              <p className="text-3xl font-bold font-mono text-emerald-400">
                AES-256
              </p>
              <span className="text-[10px] font-mono text-emerald-400/70 mt-1 block">
                Encrypted at rest
              </span>
            </div>
          </div>

          {/* Workflows Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-search-workflows"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows by name or description..."
                className="w-full bg-background border border-foreground/20 pl-9 pr-3 py-2 text-xs font-mono rounded-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["all", "active", "paused", "setup_required", "draft"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-sm transition-all shrink-0 ${
                    statusFilter === st
                      ? "bg-accent text-background font-bold"
                      : "bg-foreground/5 text-foreground/60 hover:text-foreground hover:bg-foreground/10 border border-foreground/10"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Workflows Grid / Cards */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Activity className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs font-mono text-foreground/60">
                Loading tenant workflows from control plane...
              </p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="border border-foreground/15 bg-background/50 rounded-sm py-16 px-6 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-foreground">
                No Workflows Found
              </h3>
              <p className="text-xs sm:text-sm text-foreground/50 max-w-md font-normal leading-relaxed">
                Describe a business workflow in natural language, and DIGILO AI will formulate triggers, pipeline steps, and execute it.
              </p>
              <Link
                href="/automation"
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110 shadow-md"
              >
                <span>Formulate First Automation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWorkflows.map((wf) => {
                const isActive = wf.status === "active";
                const isPaused = wf.status === "paused";
                const isSetupReq = wf.status === "setup_required";

                return (
                  <div
                    key={wf.id}
                    id={`workflow-card-${wf.id}`}
                    className="border border-foreground/15 hover:border-accent/50 bg-background/90 rounded-sm p-5 shadow-lg hover:shadow-accent/5 transition-all flex flex-col justify-between gap-5 group"
                  >
                    <div>
                      {/* Top Bar with Status Badge & Version */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded-sm border ${
                            isActive
                              ? "bg-accent/15 border-accent text-accent"
                              : isPaused
                              ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400"
                              : isSetupReq
                              ? "bg-amber-500/15 border-amber-500 text-amber-300"
                              : "bg-foreground/10 border-foreground/20 text-foreground/70"
                          }`}
                        >
                          {wf.status?.replace("_", " ") || "DRAFT"}
                        </span>

                        <span className="text-[10px] font-mono text-foreground/40">
                          {wf.version || "v1.0.0"}
                        </span>
                      </div>

                      {/* Workflow Name */}
                      <h3 className="text-base font-bold uppercase tracking-tight text-foreground group-hover:text-accent transition-colors line-clamp-1">
                        {wf.name}
                      </h3>

                      {/* Workflow Description */}
                      <p className="text-xs text-foreground/60 line-clamp-2 mt-1.5 leading-relaxed font-normal">
                        {wf.description}
                      </p>

                      {/* Trigger Badge */}
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-foreground/70 bg-foreground/[0.03] px-2.5 py-1.5 rounded-sm border border-foreground/10">
                        <Radio className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{wf.trigger.source || "Webhook"}: {wf.trigger.event}</span>
                      </div>

                      {/* Action Steps Mini Pipeline */}
                      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto py-1">
                        {wf.steps.map((st, i) => (
                          <div
                            key={st.id || i}
                            className="flex items-center gap-1 px-2 py-1 bg-foreground/5 border border-foreground/10 rounded-sm text-[10px] font-mono text-foreground/80 shrink-0"
                            title={`${st.name} (${st.action})`}
                          >
                            {getStepIcon(st.action)}
                            <span className="truncate max-w-[80px]">{st.action.split(".")[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Metadata & Studio Action */}
                    <div className="pt-4 border-t border-foreground/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/50">
                        <span>{wf.executionCount || 0} runs</span>
                        <span>•</span>
                        <span className={wf.successRate ? "text-accent" : ""}>
                          {wf.successRate !== null && wf.successRate !== undefined ? `${wf.successRate}%` : "N/A"}
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/workflows/${wf.id}`}
                        id={`btn-open-studio-${wf.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground/10 hover:bg-accent hover:text-background text-foreground text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
