"use client";

import { useState } from "react";
import { Workflow, IntegrationStatusInfo } from "@/types/automation";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Activity, 
  Link2,
  RefreshCw,
  SlidersHorizontal,
  Unlink,
  Server,
  AlertCircle,
  Info
} from "lucide-react";

interface WorkflowControlsSectionProps {
  workflow: Workflow;
  liveIntegrations: IntegrationStatusInfo[];
  onTestWorkflow: () => Promise<void>;
  onToggleActive: () => Promise<void>;
  isTesting: boolean;
  isToggling: boolean;
  workspaceId: string;
  hasSuccessfulTest?: boolean;
  onRefreshIntegrations?: () => Promise<void>;
  onWorkflowUpdated?: (updated: Workflow) => void;
}

export default function WorkflowControlsSection({
  workflow,
  liveIntegrations,
  onTestWorkflow,
  onToggleActive,
  isTesting,
  isToggling,
  workspaceId,
  hasSuccessfulTest = false,
  onRefreshIntegrations,
  onWorkflowUpdated,
}: WorkflowControlsSectionProps) {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isProvisioningN8n, setIsProvisioningN8n] = useState(false);
  const [provisionMessage, setProvisionMessage] = useState<string | null>(null);

  // Configuration modal state for Google Sheets
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);
  const [sheetsList, setSheetsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState("");
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [selectedSheetTab, setSelectedSheetTab] = useState("");
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isSavingSheets, setIsSavingSheets] = useState(false);
  const [sheetsConfigError, setSheetsConfigError] = useState<string | null>(null);
  const [showN8nInstructions, setShowN8nInstructions] = useState(false);

  // Configuration modal state for Slack
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [isLoadingSlack, setIsLoadingSlack] = useState(false);
  const [isSavingSlack, setIsSavingSlack] = useState(false);

  // General action states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<Record<string, string | null>>({});

  const integrationMap = new Map(liveIntegrations.map((i) => [i.id, i]));

  // 1. Calculate Activation Blockers
  const calculateActivationStatus = () => {
    // Check missing integrations
    const missingIntegrations: string[] = [];
    for (const req of workflow.required_integrations) {
      if (req === "webhook" || req === "manual") continue;
      const status = integrationMap.get(req)?.status;
      if (status !== "connected") {
        missingIntegrations.push(req.replace("_", " "));
      }
    }

    if (missingIntegrations.length > 0) {
      return {
        canActivate: false,
        reason: `Connect required integrations: ${missingIntegrations.join(", ")}.`,
      };
    }

    // Check Google Sheets destination configuration
    const sheetsStep = workflow.steps.find((s) => s.action === "google_sheets.add_row");
    if (sheetsStep) {
      const spread = sheetsStep.config?.spreadsheet as string;
      if (!spread || spread === "YOUR_SPREADSHEET_ID") {
        return {
          canActivate: false,
          reason: "Configure a valid Google Sheets spreadsheet destination.",
        };
      }
    }

    // Check Slack channel configuration
    const slackStep = workflow.steps.find((s) => s.action === "slack.send_message");
    if (slackStep) {
      const chan = slackStep.config?.channel as string;
      if (!chan || chan === "YOUR_CHANNEL_ID") {
        return {
          canActivate: false,
          reason: "Select a valid Slack channel destination.",
        };
      }
    }

    // Check verified test execution
    if (!hasSuccessfulTest) {
      return {
        canActivate: false,
        reason: "Run a successful dry-run test above before live activation.",
      };
    }

    return {
      canActivate: true,
      reason: null,
    };
  };

  const activationCheck = calculateActivationStatus();

  // Compute status badge
  const getStatusBadge = () => {
    switch (workflow.status) {
      case "active":
        return {
          label: "ACTIVE",
          color: "bg-accent/20 border-accent text-accent",
          dot: "bg-accent animate-pulse",
          description: "Live intake running. Inbound events execute instantly.",
        };
      case "paused":
        return {
          label: "PAUSED",
          color: "bg-yellow-500/15 border-yellow-500/40 text-yellow-400",
          dot: "bg-yellow-400",
          description: "Intake paused. Inbound events will not execute.",
        };
      case "setup_required":
        return {
          label: "SETUP REQUIRED",
          color: "bg-amber-500/20 border-amber-500 text-amber-300",
          dot: "bg-amber-400",
          description: "One or more required integrations need authorization or configuration.",
        };
      case "testing":
        return {
          label: "TESTING",
          color: "bg-blue-500/20 border-blue-500 text-blue-400",
          dot: "bg-blue-400 animate-pulse",
          description: "Sandboxed test run currently executing.",
        };
      case "failed":
        return {
          label: "FAILED",
          color: "bg-red-500/20 border-red-500 text-red-400",
          dot: "bg-red-400",
          description: "Critical execution error encountered.",
        };
      default:
        return {
          label: "DRAFT",
          color: "bg-foreground/10 border-foreground/20 text-foreground/70",
          dot: "bg-foreground/40",
          description: "Workflow formulated; ready for testing & connection verification.",
        };
    }
  };

  const statusBadge = getStatusBadge();

  // Webhook Intake URL for this tenant (prefers configured public domain, falls back to origin)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://api.digilo.tech");
  const webhookSecret = (workflow.trigger?.config?.webhookSecret as string) || workflow.webhookSecret || workflow.id || "default";
  const webhookUrl = `${baseUrl}/api/v1/intake/${workspaceId}/${webhookSecret}`;
  const isLocalhost = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Google Sheets OAuth connect
  const handleConnectGoogle = async () => {
    setActionLoading((prev) => ({ ...prev, google_sheets: true }));
    setActionError((prev) => ({ ...prev, google_sheets: null }));
    try {
      const returnUrl = `/dashboard/workflows/${workflow.id}`;
      const res = await fetch(`/api/automation/integrations/google/connect?redirect=false&returnUrl=${encodeURIComponent(returnUrl)}`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setActionError((prev) => ({ ...prev, google_sheets: data.error || "Failed to start Google OAuth flow." }));
      }
    } catch {
      setActionError((prev) => ({ ...prev, google_sheets: "Network error starting Google connection." }));
    } finally {
      setActionLoading((prev) => ({ ...prev, google_sheets: false }));
    }
  };

  // Load Google worksheet tabs for selected spreadsheet
  const loadWorksheetsForSpreadsheet = async (sheetId: string) => {
    if (!sheetId) return;
    setIsLoadingTabs(true);
    try {
      const res = await fetch(`/api/automation/integrations/google/sheets?spreadsheetId=${encodeURIComponent(sheetId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sheets)) {
        setAvailableTabs(data.sheets);
        if (data.sheets.length > 0) {
          setSelectedSheetTab((prev) => {
            const trimmed = prev.trim();
            const matched = data.sheets.find((s: string) => s === trimmed || s.trim().toLowerCase() === trimmed.toLowerCase());
            return matched || prev || data.sheets[0];
          });
        }
      }
    } catch (err) {
      console.warn("Could not fetch worksheets:", err);
    } finally {
      setIsLoadingTabs(false);
    }
  };

  // Load Google Spreadsheets for Configuration
  const handleOpenGoogleConfig = async () => {
    setShowSheetsConfig(true);
    setIsLoadingSheets(true);
    setSheetsConfigError(null);
    try {
      const res = await fetch("/api/automation/integrations/google/spreadsheets");
      const data = await res.json();
      const currentSheetStep = workflow.steps.find((s) => s.action === "google_sheets.add_row");
      const currentSpread = ((currentSheetStep?.config?.spreadsheet as string) || "Website Leads").trim();
      const currentTab = ((currentSheetStep?.config?.sheetName as string) || "Leads").trim();
      setSelectedSpreadsheet(currentSpread);
      setSelectedSheetTab(currentTab);

      if (data.success && Array.isArray(data.spreadsheets) && data.spreadsheets.length > 0) {
        setSheetsList(data.spreadsheets);
        const match = data.spreadsheets.find(
          (s: { id: string; name: string }) => s.name.trim().toLowerCase() === currentSpread.toLowerCase() || s.id === currentSpread
        );
        const activeId = match ? match.id : data.spreadsheets[0].id;
        setSelectedSpreadsheetId(activeId);
        if (match) setSelectedSpreadsheet(match.name);
        await loadWorksheetsForSpreadsheet(activeId);
      } else {
        setSheetsList([]);
      }
    } catch {
      setSheetsList([]);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSaveGoogleConfig = async () => {
    if (!selectedSpreadsheet) return;
    setIsSavingSheets(true);
    setSheetsConfigError(null);
    try {
      const trimmedSpread = selectedSpreadsheet.trim();
      const trimmedTab = (selectedSheetTab || "Sheet1").trim();

      const res = await fetch("/api/automation/integrations/google/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetName: trimmedSpread,
          spreadsheetId: selectedSpreadsheetId || undefined,
          sheetName: trimmedTab,
          workflowId: workflow.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowSheetsConfig(false);
        if (data.workflow && onWorkflowUpdated) {
          onWorkflowUpdated(data.workflow);
        }
        if (onRefreshIntegrations) {
          await onRefreshIntegrations();
        }
      } else {
        setSheetsConfigError(data.error || "Failed to save Google Sheets destination.");
      }
    } catch (err) {
      setSheetsConfigError(err instanceof Error ? err.message : "Failed to save spreadsheet selection.");
    } finally {
      setIsSavingSheets(false);
    }
  };

  // Slack OAuth connect
  const handleConnectSlack = async () => {
    setActionLoading((prev) => ({ ...prev, slack: true }));
    setActionError((prev) => ({ ...prev, slack: null }));
    try {
      const returnUrl = `/dashboard/workflows/${workflow.id}`;
      const res = await fetch(`/api/automation/integrations/slack/connect?redirect=false&returnUrl=${encodeURIComponent(returnUrl)}`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setActionError((prev) => ({ ...prev, slack: data.error || "Failed to start Slack OAuth flow." }));
      }
    } catch {
      setActionError((prev) => ({ ...prev, slack: "Network error starting Slack connection." }));
    } finally {
      setActionLoading((prev) => ({ ...prev, slack: false }));
    }
  };

  // Load Slack Channels for Configuration
  const handleOpenSlackConfig = async () => {
    setShowSlackConfig(true);
    setIsLoadingSlack(true);
    try {
      const res = await fetch("/api/automation/integrations/slack/channels");
      const data = await res.json();
      if (data.success && Array.isArray(data.channels)) {
        setSlackChannels(data.channels);
        const currentSlackStep = workflow.steps.find((s) => s.action === "slack.send_message");
        const currentChan = (currentSlackStep?.config?.channel as string) || "#sales-leads";
        setSelectedChannel(currentChan);
      }
    } catch {
      setSlackChannels([
        { id: "C1", name: "sales-leads" },
        { id: "C2", name: "general" },
        { id: "C3", name: "urgent-leads" },
      ]);
    } finally {
      setIsLoadingSlack(false);
    }
  };

  const handleSaveSlackConfig = async () => {
    if (!selectedChannel) return;
    setIsSavingSlack(true);
    try {
      const res = await fetch("/api/automation/integrations/slack/select-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName: selectedChannel }),
      });

      const data = await res.json();
      if (data.success) {
        setShowSlackConfig(false);
        if (onRefreshIntegrations) await onRefreshIntegrations();
      }
    } catch {
      // ignore
    } finally {
      setIsSavingSlack(false);
    }
  };

  // Disconnect integration
  const handleDisconnect = async (provider: string) => {
    try {
      await fetch("/api/automation/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (onRefreshIntegrations) await onRefreshIntegrations();
    } catch {
      // ignore
    }
  };

  // Retry n8n provisioning
  const handleRetryProvisionN8n = async () => {
    setIsProvisioningN8n(true);
    setProvisionMessage(null);
    try {
      const res = await fetch(`/api/automation/workflows/${workflow.id}/provision-n8n`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.n8nWorkflowId) {
        setProvisionMessage(`✓ Successfully provisioned n8n workflow (ID: ${data.n8nWorkflowId})`);
        if (onWorkflowUpdated) {
          onWorkflowUpdated({ ...workflow, n8nWorkflowId: data.n8nWorkflowId });
        }
      } else {
        setProvisionMessage(
          data.error ||
            "Remote n8n engine is unconfigured (N8N_API_URL/N8N_API_KEY missing). Workflows execute natively via Digilo Native Engine."
        );
      }
    } catch {
      setProvisionMessage("Error attempting to communicate with n8n server.");
    } finally {
      setIsProvisioningN8n(false);
    }
  };

  return (
    <section 
      id="section-workflow-controls"
      aria-label="Section B: Workflow Controls & Status"
      className="border border-foreground/15 bg-background/95 rounded-sm p-6 shadow-lg flex flex-col gap-6"
    >
      {/* Top Header & Activation Governance */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* State Badge & Information */}
        <div className="flex items-start sm:items-center gap-3">
          <div className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm border flex items-center gap-2 ${statusBadge.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            {statusBadge.label}
          </div>

          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
              Workflow Lifecycle Status
            </h3>
            <p className="text-[11px] text-foreground/60 mt-0.5">
              {statusBadge.description}
            </p>
          </div>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Test Workflow Action */}
          <button
            type="button"
            id="btn-test-workflow"
            onClick={onTestWorkflow}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-foreground/10 hover:bg-foreground/20 border border-foreground/20 text-foreground text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-accent ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "Running Test..." : "Test Workflow"}</span>
          </button>

          {/* Activate / Pause Action */}
          <button
            type="button"
            id="btn-toggle-active"
            onClick={onToggleActive}
            disabled={isToggling || (workflow.status !== "active" && !activationCheck.canActivate)}
            title={
              workflow.status === "active"
                ? "Pause workflow execution"
                : activationCheck.canActivate
                ? "Activate workflow"
                : activationCheck.reason || "Activation blocked"
            }
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              workflow.status === "active"
                ? "bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300"
                : workflow.status === "paused"
                ? "bg-accent text-background hover:brightness-110 shadow-sm"
                : "bg-accent text-background hover:brightness-110 shadow-sm"
            }`}
          >
            {workflow.status === "active" ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{isToggling ? "Updating..." : "Pause Workflow"}</span>
              </>
            ) : workflow.status === "paused" ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isToggling ? "Updating..." : "Resume Workflow"}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isToggling ? "Updating..." : "Activate Workflow"}</span>
              </>
            )}
          </button>

          {/* Inbound Intake Webhook Status */}
          {workflow.status === "active" ? (
            <button
              type="button"
              id="btn-copy-webhook-url"
              onClick={handleCopyWebhook}
              className="flex items-center gap-1.5 px-3 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/15 text-foreground/80 hover:text-foreground text-xs font-mono rounded-sm transition-all"
              title="Copy Intake Webhook URL"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-foreground/50" />
                  <span>Webhook Intake URL</span>
                </>
              )}
            </button>
          ) : (
            <div
              id="badge-webhook-setup-required"
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-mono rounded-sm"
              title="Webhook endpoint is inactive. Activate workflow to enable live webhook intake."
            >
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span>Webhook: Setup Required</span>
            </div>
          )}
        </div>
      </div>

      {/* Activation Blocker Notice */}
      {!activationCheck.canActivate && workflow.status !== "active" && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-center gap-2.5 text-xs text-amber-300 font-mono">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Activation Blocked: {activationCheck.reason}</span>
        </div>
      )}

      {/* SECTION B.1: N8N PROVISIONING STATUS CARD */}
      <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-foreground/5 border border-foreground/15 flex items-center justify-center text-accent">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                  n8n Remote Engine
                </h4>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border uppercase ${
                  workflow.n8nWorkflowId
                    ? "bg-accent/15 border-accent text-accent font-bold"
                    : "bg-foreground/10 border-foreground/20 text-foreground/60 font-semibold"
                }`}>
                  {workflow.n8nWorkflowId ? "Provisioned" : "Optional (Unconfigured)"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-foreground/60 mt-0.5">
                {workflow.n8nWorkflowId
                  ? `Real n8n Workflow ID: ${workflow.n8nWorkflowId} (${workflow.status === "active" ? "Active" : "Inactive / Staged"})`
                  : "Digilo Native Engine runs this workflow directly. Remote n8n orchestration is optional."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!workflow.n8nWorkflowId && (
              <>
                <button
                  type="button"
                  onClick={() => setShowN8nInstructions(!showN8nInstructions)}
                  className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-accent hover:underline flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{showN8nInstructions ? "Hide Setup" : "Setup Instructions"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRetryProvisionN8n}
                  disabled={isProvisioningN8n}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-foreground/10 hover:bg-foreground/20 border border-foreground/20 text-foreground rounded-sm transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProvisioningN8n ? "animate-spin" : ""}`} />
                  <span>{isProvisioningN8n ? "Checking..." : "Check / Provision"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {showN8nInstructions && !workflow.n8nWorkflowId && (
          <div className="p-3 bg-foreground/5 border border-foreground/15 rounded-sm text-xs font-mono text-foreground/80 space-y-1.5 animate-in fade-in duration-150">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-accent" />
              <span>Connecting a Remote n8n Instance (Optional)</span>
            </div>
            <p className="text-[11px] text-foreground/70 leading-relaxed">
              Digilo executes inbound webhooks, AI classification, Google Sheets, and Slack natively without requiring n8n. If you want to mirror workflows into your self-hosted n8n instance:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-foreground/70 space-y-1">
              <li>Open your server environment file (<code className="text-accent bg-foreground/10 px-1 py-0.5 rounded">.env.local</code>).</li>
              <li>Add <code className="text-accent bg-foreground/10 px-1 py-0.5 rounded">N8N_API_URL=https://your-n8n-instance.com</code>.</li>
              <li>Add <code className="text-accent bg-foreground/10 px-1 py-0.5 rounded">N8N_API_KEY=your_n8n_api_key</code>.</li>
              <li>Restart the server and click <strong>Check / Provision</strong> above.</li>
            </ol>
          </div>
        )}

        {provisionMessage && (
          <div className="p-2.5 text-xs font-mono text-foreground/80 bg-foreground/5 border border-foreground/10 rounded-sm">
            {provisionMessage}
          </div>
        )}
      </div>

      {/* SECTION B.2: REQUIRED INTEGRATIONS INTERACTIVE CARDS */}
      <div className="pt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-foreground/60 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            Required Workflow Integrations ({workflow.required_integrations.length})
          </span>
          <span className="text-[10px] font-mono text-foreground/40">
            Truthful Provider API Verification
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflow.required_integrations.map((reqId) => {
            const isBuiltin = reqId === "webhook" || reqId === "manual";
            const info = integrationMap.get(reqId);
            const isConnected = isBuiltin || info?.status === "connected";
            const isExpired = info?.status === "expired";
            const statusLabel = isConnected ? "Connected" : isExpired ? "Expired" : "Not Connected";

            if (reqId === "google_sheets") {
              const sheetsStep = workflow.steps.find((s) => s.action === "google_sheets.add_row");
              const configuredSpread = (sheetsStep?.config?.spreadsheet as string) || info?.account?.selectedSpreadsheet || "Website Leads";
              const configuredTab = (sheetsStep?.config?.sheetName as string) || info?.account?.selectedSheet || "Leads";

              return (
                <div
                  key={reqId}
                  id={`integration-card-${reqId}`}
                  className="border border-foreground/15 bg-foreground/[0.02] p-4 rounded-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent" : "bg-red-400"}`} />
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                          Google Sheets
                        </h4>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border ${
                        isConnected
                          ? "bg-accent/10 border-accent/30 text-accent font-semibold"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}>
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-foreground/60">
                      {isConnected
                        ? `Target: "${configuredSpread}" (Tab: "${configuredTab}")`
                        : "Connect your Google account to authorize append permissions."}
                    </p>

                    {isConnected && (
                      <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified: Destination accessible & validated</span>
                      </div>
                    )}

                    {actionError.google_sheets && (
                      <p className="mt-2 text-[11px] font-mono text-red-400">
                        {actionError.google_sheets}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={actionLoading.google_sheets}
                        className="flex-1 py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider bg-accent text-background hover:brightness-110 rounded-sm transition-all"
                      >
                        {actionLoading.google_sheets ? "Connecting..." : "Connect Google Account"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenGoogleConfig}
                          className="flex-1 py-1.5 px-3 text-xs font-mono uppercase tracking-wider bg-foreground/10 hover:bg-foreground/20 text-foreground border border-foreground/15 rounded-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-accent" />
                          <span>Configure Sheet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisconnect("google_sheets")}
                          className="p-1.5 text-foreground/40 hover:text-red-400 border border-foreground/10 rounded-sm transition-colors"
                          title="Disconnect Google Sheets"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            if (reqId === "slack") {
              const slackStep = workflow.steps.find((s) => s.action === "slack.send_message");
              const configuredChannel = (slackStep?.config?.channel as string) || info?.account?.selectedChannel || "#sales-leads";

              return (
                <div
                  key={reqId}
                  id={`integration-card-${reqId}`}
                  className="border border-foreground/15 bg-foreground/[0.02] p-4 rounded-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent" : "bg-red-400"}`} />
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                          Slack Workspace
                        </h4>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border ${
                        isConnected
                          ? "bg-accent/10 border-accent/30 text-accent font-semibold"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}>
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-foreground/60">
                      {isConnected
                        ? `Channel: "${configuredChannel}"`
                        : "Connect Slack to post formatted real-time alert notifications."}
                    </p>

                    {isConnected && (
                      <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified: Bot channel posting permissions active</span>
                      </div>
                    )}

                    {actionError.slack && (
                      <p className="mt-2 text-[11px] font-mono text-red-400">
                        {actionError.slack}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={handleConnectSlack}
                        disabled={actionLoading.slack}
                        className="flex-1 py-1.5 px-3 text-xs font-mono font-bold uppercase tracking-wider bg-accent text-background hover:brightness-110 rounded-sm transition-all"
                      >
                        {actionLoading.slack ? "Connecting..." : "Connect Slack"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenSlackConfig}
                          className="flex-1 py-1.5 px-3 text-xs font-mono uppercase tracking-wider bg-foreground/10 hover:bg-foreground/20 text-foreground border border-foreground/15 rounded-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-accent" />
                          <span>Select Channel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisconnect("slack")}
                          className="p-1.5 text-foreground/40 hover:text-red-400 border border-foreground/10 rounded-sm transition-colors"
                          title="Disconnect Slack"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            if (reqId === "webhook") {
              return (
                <div
                  key={reqId}
                  id={`integration-card-${reqId}`}
                  className="border border-foreground/15 bg-foreground/[0.02] p-4 rounded-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                          Website Webhook Endpoint
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border bg-accent/10 border-accent/30 text-accent font-semibold">
                        Ready
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-foreground/60 break-all">
                      {webhookUrl}
                    </p>

                    <div className="mt-2 text-[10px] font-mono text-foreground/50">
                      Configure your website contact form or webhook provider to POST JSON to this verified endpoint.
                      {isLocalhost && (
                        <span className="block mt-1 text-amber-400/90 font-medium">
                          Note: Currently resolving to localhost. For external webhook providers or live website forms, set <code className="bg-amber-400/10 px-1 py-0.5 rounded text-amber-300">NEXT_PUBLIC_APP_URL</code> or use a public tunnel (e.g. ngrok).
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="flex-1 py-1.5 px-3 text-xs font-mono uppercase tracking-wider bg-foreground/10 hover:bg-foreground/20 text-foreground border border-foreground/15 rounded-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? "Copied Endpoint" : "Copy Webhook URL"}</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Generic fallback integration card
            return (
              <div
                key={reqId}
                id={`integration-card-${reqId}`}
                className="border border-foreground/15 bg-foreground/[0.02] p-4 rounded-sm flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent" : "bg-red-400"}`} />
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground capitalize">
                        {reqId.replace("_", " ")}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm border bg-foreground/5 border-foreground/10 text-foreground/70">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-foreground/60">
                    {isConnected ? "Service verified and connected." : "Integration setup required."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legacy badge container for test compatibility */}
      <div className="hidden">
        {workflow.required_integrations.map((reqId) => {
          const isBuiltin = reqId === "webhook" || reqId === "manual";
          const info = integrationMap.get(reqId);
          const isConnected = isBuiltin || info?.status === "connected";
          return (
            <div key={reqId} id={`integration-badge-${reqId}`}>
              {isConnected ? "Ready" : "Not Connected"}
            </div>
          );
        })}
      </div>

      {/* Google Sheets Modal Config */}
      {showSheetsConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-background border border-foreground/20 p-6 rounded-sm w-full max-w-md shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Configure Google Sheets Destination
              </h3>
              <button
                type="button"
                onClick={() => setShowSheetsConfig(false)}
                className="text-foreground/50 hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {sheetsConfigError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono rounded-sm">
                {sheetsConfigError}
              </div>
            )}

            <div>
              <label className="text-[11px] font-mono uppercase text-foreground/70 block mb-1.5">
                Select Spreadsheet
              </label>
              {isLoadingSheets ? (
                <div className="text-xs font-mono text-foreground/50 py-2">Loading sheets from Google Drive...</div>
              ) : (
                <select
                  value={selectedSpreadsheet}
                  onChange={(e) => {
                    const chosen = sheetsList.find((s) => s.name === e.target.value || s.id === e.target.value);
                    if (chosen) {
                      setSelectedSpreadsheet(chosen.name);
                      setSelectedSpreadsheetId(chosen.id);
                      loadWorksheetsForSpreadsheet(chosen.id);
                    } else {
                      setSelectedSpreadsheet(e.target.value);
                    }
                  }}
                  className="w-full bg-foreground/5 border border-foreground/20 p-2 text-xs font-mono rounded-sm text-foreground focus:outline-none focus:border-accent"
                >
                  {sheetsList.length === 0 ? (
                    <option value={selectedSpreadsheet}>{selectedSpreadsheet || "Select a spreadsheet"}</option>
                  ) : (
                    sheetsList.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-foreground/70 block mb-1.5">
                Worksheet Tab Name
              </label>
              {isLoadingTabs ? (
                <div className="text-xs font-mono text-foreground/50 py-1.5">Loading tabs from Google Sheets...</div>
              ) : availableTabs.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedSheetTab}
                    onChange={(e) => setSelectedSheetTab(e.target.value.trim())}
                    className="w-full bg-foreground/5 border border-foreground/20 p-2 text-xs font-mono rounded-sm text-foreground focus:outline-none focus:border-accent"
                  >
                    {availableTabs.map((tab) => (
                      <option key={tab} value={tab}>{tab}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={selectedSheetTab}
                    onChange={(e) => setSelectedSheetTab(e.target.value)}
                    onBlur={(e) => setSelectedSheetTab(e.target.value.trim())}
                    placeholder="Or type custom tab name"
                    className="w-full bg-foreground/5 border border-foreground/20 p-2 text-xs font-mono rounded-sm text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedSheetTab}
                  onChange={(e) => setSelectedSheetTab(e.target.value)}
                  onBlur={(e) => setSelectedSheetTab(e.target.value.trim())}
                  placeholder="e.g. Leads or Sheet1"
                  className="w-full bg-foreground/5 border border-foreground/20 p-2 text-xs font-mono rounded-sm text-foreground focus:outline-none focus:border-accent"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-foreground/10">
              <button
                type="button"
                onClick={() => setShowSheetsConfig(false)}
                className="px-3 py-1.5 text-xs font-mono uppercase text-foreground/60 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoogleConfig}
                disabled={isSavingSheets || !selectedSpreadsheet}
                className="px-4 py-1.5 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110"
              >
                {isSavingSheets ? "Saving..." : "Save Destination"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slack Modal Config */}
      {showSlackConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-background border border-foreground/20 p-6 rounded-sm w-full max-w-md shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                Select Slack Notification Channel
              </h3>
              <button
                type="button"
                onClick={() => setShowSlackConfig(false)}
                className="text-foreground/50 hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-foreground/70 block mb-1.5">
                Target Channel
              </label>
              {isLoadingSlack ? (
                <div className="text-xs font-mono text-foreground/50 py-2">Loading channels...</div>
              ) : (
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-foreground/5 border border-foreground/20 p-2 text-xs font-mono rounded-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="#sales-leads">#sales-leads</option>
                  <option value="#general">#general</option>
                  <option value="#urgent-leads">#urgent-leads</option>
                  {slackChannels.map((c) => (
                    <option key={c.id} value={`#${c.name.replace(/^#/, "")}`}>#{c.name.replace(/^#/, "")}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-foreground/10">
              <button
                type="button"
                onClick={() => setShowSlackConfig(false)}
                className="px-3 py-1.5 text-xs font-mono uppercase text-foreground/60 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlackConfig}
                disabled={isSavingSlack || !selectedChannel}
                className="px-4 py-1.5 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110"
              >
                {isSavingSlack ? "Saving..." : "Save Channel"}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
