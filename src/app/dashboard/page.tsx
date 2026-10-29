"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Workflow } from "@/types/automation";
import { useAuth } from "@/components/auth/AuthContext";
import { 
  Bot,
  LayoutDashboard,
  Plug,
  Settings,
  HelpCircle,
  Plus, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Database, 
  MessageSquare, 
  Mail,
  RefreshCw,
  LogOut,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap
} from "lucide-react";

interface WorkflowItem extends Workflow {
  executionCount?: number;
  successRate?: number | null;
  lastRunAt?: string;
}

export default function DashboardOverviewPage() {
  const { user, workspace, isLoading: isAuthLoading, openAuthModal, logout } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    if (user) {
      fetchWorkflows();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || w.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = workflows.filter((w) => w.status === "active").length;
  const draftCount = workflows.filter((w) => w.status === "draft" || w.status === "setup_required").length;
  const failedCount = workflows.filter((w) => w.status === "failed").length;

  const getStepIcon = (action: string) => {
    if (action.includes("ai")) return <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />;
    if (action.includes("sheets")) return <Database className="w-3.5 h-3.5 text-[#22C55E]" />;
    if (action.includes("slack")) return <MessageSquare className="w-3.5 h-3.5 text-[#A855F7]" />;
    if (action.includes("gmail")) return <Mail className="w-3.5 h-3.5 text-[#EF4444]" />;
    return <Layers className="w-3.5 h-3.5 text-[#C8FF00]" />;
  };

  if (!user && !isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-lg bg-[#111111] border border-[#222222] text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#C8FF00]/10 border border-[#C8FF00]/30 flex items-center justify-center text-[#C8FF00] mx-auto mb-4">
            <Bot className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-2">
            Sign In to Access Dashboard
          </h2>
          <p className="text-xs text-[#A0A0A0] leading-relaxed mb-6">
            Authentication is required to view your tenant workspace, active automations, and live execution telemetry.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth"
              className="w-full py-3 bg-[#C8FF00] hover:bg-[#b2e600] text-black text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md"
            >
              Sign In to Workspace
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 border border-[#222222] text-[#A0A0A0] hover:text-white text-xs font-mono uppercase rounded transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col md:flex-row">
      {/* Sidebar (PRD v3.1 Spec) */}
      <aside 
        className={`bg-[#0D0D0D] border-r border-[#222222] flex flex-col justify-between transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-full md:w-20" : "w-full md:w-64"
        } shrink-0`}
      >
        <div>
          {/* Logo Bar */}
          <div className="p-6 border-b border-[#222222] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                DIGIL<span className="text-[#C8FF00]">O</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded hover:bg-[#1A1A1A] text-[#A0A0A0] hover:text-white transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items (PRD v3.1 Spec) */}
          <nav className="p-4 space-y-1.5 font-mono text-xs">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#1A1A1A] border-l-2 border-[#C8FF00] text-white font-bold transition-colors"
            >
              <Bot className="w-4 h-4 text-[#C8FF00] shrink-0" />
              {!sidebarCollapsed && <span>🤖 AI AUTOMATIONS</span>}
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded text-[#A0A0A0] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>📊 DASHBOARD</span>}
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded text-[#A0A0A0] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <Plug className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>🔌 INTEGRATIONS</span>}
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded text-[#A0A0A0] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>⚙️ SETTINGS</span>}
            </Link>

            <a
              href="https://wa.me/917707052307"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded text-[#A0A0A0] hover:text-white hover:bg-[#141414] transition-colors"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>💬 SUPPORT</span>}
            </a>
          </nav>
        </div>

        {/* User Workspace Info at Bottom */}
        <div className="p-4 border-t border-[#222222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center text-xs font-bold text-[#C8FF00] shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user?.name || "Operator"}</p>
                  <p className="text-[10px] font-mono text-[#A0A0A0] truncate">{workspace?.name || "Workspace"}</p>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-[#1A1A1A] text-[#A0A0A0] hover:text-[#EF4444] transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header Row (PRD v3.1 Spec) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#222222] mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight uppercase text-white mb-2">
              MY AUTOMATIONS
            </h1>
            {/* Stats Chips (PRD v3.1 Spec) */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-bold">
                {activeCount} ACTIVE
              </span>
              <span className="px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#222222] text-[#A0A0A0]">
                {draftCount} DRAFT
              </span>
              <span className="px-2.5 py-1 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]">
                {failedCount} FAILED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-refresh-workflows"
              onClick={fetchWorkflows}
              className="p-3 rounded-lg border border-[#222222] text-[#A0A0A0] hover:text-white hover:bg-[#111111] transition-colors"
              title="Refresh Workflows"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/automation"
              id="btn-new-automation-link"
              className="flex items-center gap-2 px-5 py-3 bg-[#C8FF00] hover:bg-[#b2e600] text-black text-xs font-bold uppercase tracking-wider rounded transition-all shadow-lg shadow-[#C8FF00]/15"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Automation</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#555555] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-workflows"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows by name or description..."
              className="w-full bg-[#111111] border border-[#222222] focus:border-[#C8FF00] pl-10 pr-4 py-2.5 text-xs font-mono rounded-lg outline-none text-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "ALL" },
              { id: "active", label: "ACTIVE" },
              { id: "draft", label: "DRAFT" },
              { id: "setup_required", label: "SETUP REQUIRED" },
              { id: "failed", label: "FAILED" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded transition-all shrink-0 ${
                  statusFilter === st.id
                    ? "bg-[#C8FF00] text-black font-bold"
                    : "bg-[#111111] text-[#A0A0A0] hover:text-white border border-[#222222]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workflows Grid / Cards (2-col desktop, 1-col mobile per PRD v3.1 Spec) */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#C8FF00] animate-spin" />
            <p className="text-xs font-mono text-[#A0A0A0]">Loading tenant workflows...</p>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          /* Empty State with Node Graph SVG illustration per PRD v3.1 Spec */
          <div className="border border-[#222222] bg-[#111111] rounded-lg py-20 px-6 text-center flex flex-col items-center justify-center space-y-6">
            <svg className="w-24 h-24 text-[#C8FF00]/40 mx-auto" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <circle cx="20" cy="50" r="10" strokeWidth="2" fill="#1A1A1A" />
              <line x1="30" y1="50" x2="45" y2="50" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="55" cy="50" r="10" strokeWidth="2" fill="#1A1A1A" />
              <line x1="65" y1="50" x2="80" y2="50" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="90" cy="50" r="10" strokeWidth="2" fill="#1A1A1A" />
            </svg>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2">
                No automations yet
              </h3>
              <p className="text-sm text-[#A0A0A0] max-w-md mx-auto">
                Describe what you want to automate and DIGILO will build it for you.
              </p>
            </div>
            <Link
              href="/automation"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#C8FF00] hover:bg-[#b2e600] text-black text-sm font-bold uppercase tracking-wider rounded transition-all shadow-xl shadow-[#C8FF00]/15"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Your First Automation</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredWorkflows.map((wf) => {
              const isActive = wf.status === "active";
              const isSetupReq = wf.status === "setup_required";
              const isFailed = wf.status === "failed";

              return (
                <div
                  key={wf.id}
                  id={`workflow-card-${wf.id}`}
                  className="border border-[#222222] hover:border-[#C8FF00]/50 bg-[#111111] rounded-lg p-6 shadow-xl transition-all flex flex-col justify-between gap-5 group"
                >
                  <div>
                    {/* Header: Status Badge & Version */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded ${
                          isActive
                            ? "bg-[#C8FF00] text-black"
                            : isSetupReq
                            ? "bg-[#FFD600] text-black"
                            : isFailed
                            ? "bg-[#EF4444] text-white"
                            : "bg-[#1A1A1A] text-white border border-[#222222]"
                        }`}
                      >
                        {isActive ? "ACTIVE" : isSetupReq ? "SETUP REQUIRED" : isFailed ? "FAILED" : "DRAFT"}
                      </span>

                      <span className="text-[10px] font-mono text-[#555555]">
                        {wf.version || "v1.0.0"}
                      </span>
                    </div>

                    {/* Workflow Name */}
                    <h3 className="text-lg font-bold text-white group-hover:text-[#C8FF00] transition-colors truncate">
                      {wf.name}
                    </h3>

                    {/* Workflow Description */}
                    <p className="text-xs text-[#A0A0A0] line-clamp-2 mt-2 leading-relaxed">
                      {wf.description}
                    </p>

                    {/* Integration Icons Row (PRD v3.1 Spec) */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-[#555555] mr-1">Tools:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <div className="p-1 rounded bg-[#1A1A1A] border border-[#222222]" title="Webhook Trigger">
                          <Zap className="w-3.5 h-3.5 text-[#C8FF00]" />
                        </div>
                        {wf.steps.map((st, i) => (
                          <div
                            key={st.id || i}
                            className="p-1 rounded bg-[#1A1A1A] border border-[#222222]"
                            title={`${st.name} (${st.action})`}
                          >
                            {getStepIcon(st.action)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Run Stats & View Details CTA (PRD v3.1 Spec) */}
                  <div className="pt-4 border-t border-[#222222] flex items-center justify-between gap-2">
                    <div className="text-[11px] font-mono text-[#A0A0A0]">
                      {wf.executionCount || 0} runs · {wf.successRate !== null && wf.successRate !== undefined ? `${wf.successRate}%` : "100%"} success
                    </div>

                    <Link
                      href={`/dashboard/workflows/${wf.id}`}
                      id={`btn-view-details-${wf.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#C8FF00] text-[#C8FF00] hover:bg-[#C8FF00] hover:text-black text-xs font-mono font-bold uppercase tracking-wider rounded transition-all"
                    >
                      <span>View Details →</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
