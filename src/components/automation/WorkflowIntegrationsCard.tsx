"use client";

import { useEffect, useState, useCallback } from "react";
import { resolveIntegrationStatus } from "@/lib/automation/integration-metadata";
import { IntegrationStatusInfo } from "@/types/automation";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Loader2, 
  ExternalLink, 
  Unlink, 
  RefreshCw, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  Hash, 
  Check, 
  X, 
  AlertCircle 
} from "lucide-react";

interface WorkflowIntegrationsCardProps {
  requiredIntegrations: string[];
  onIntegrationsUpdated?: (integrations: Record<string, IntegrationStatusInfo>) => void;
}

type ActionState = "idle" | "connecting" | "reconnecting" | "disconnecting" | "failed";

export default function WorkflowIntegrationsCard({ 
  requiredIntegrations,
  onIntegrationsUpdated
}: WorkflowIntegrationsCardProps) {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatusInfo>>(() => {
    const initial: Record<string, IntegrationStatusInfo> = {};
    for (const id of requiredIntegrations) {
      initial[id] = resolveIntegrationStatus(id);
    }
    return initial;
  });

  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string | null>>({});
  const [globalBanner, setGlobalBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Google Sheets Config Modal / Popover state
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleSpreadsheets, setGoogleSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheetName, setSelectedSpreadsheetName] = useState("");
  const [googleWorksheets, setGoogleWorksheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [isLoadingGoogleResources, setIsLoadingGoogleResources] = useState(false);
  const [isSavingGoogleConfig, setIsSavingGoogleConfig] = useState(false);

  // Slack Channel Config Modal / Popover state
  const [showSlackConfig, setShowSlackConfig] = useState(false);
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string; is_private: boolean }[]>([]);
  const [selectedChannelName, setSelectedChannelName] = useState("");
  const [isLoadingSlackChannels, setIsLoadingSlackChannels] = useState(false);
  const [isSavingSlackConfig, setIsSavingSlackConfig] = useState(false);

  const setAction = (id: string, state: ActionState) => {
    setActionStates((prev) => ({ ...prev, [id]: state }));
  };

  const setError = (id: string, msg: string | null) => {
    setErrorMessages((prev) => ({ ...prev, [id]: msg }));
  };

  // Re-fetch live status from backend
  const refreshStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/automation/integrations");
      const data = await res.json();
      if (data.success && data.integrations) {
        setStatuses((prev) => {
          const merged = { ...prev, ...data.integrations };
          if (onIntegrationsUpdated) {
            onIntegrationsUpdated(merged);
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn("Failed to fetch live integration statuses:", err);
    }
  }, [onIntegrationsUpdated]);

  // Initial load & OAuth return handler
  useEffect(() => {
    let isCancelled = false;

    const initLoad = async () => {
      try {
        const res = await fetch("/api/automation/integrations");
        const data = await res.json();
        if (!isCancelled && data.success && data.integrations) {
          setStatuses((prev) => {
            const merged = { ...prev, ...data.integrations };
            if (onIntegrationsUpdated) {
              onIntegrationsUpdated(merged);
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn("Failed to fetch live integration statuses:", err);
      }

      // Check URL parameters for OAuth returns
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const connectedProvider = url.searchParams.get("connected");
        const oauthError = url.searchParams.get("error");
        const errorProvider = url.searchParams.get("provider");

        if (connectedProvider) {
          const providerName = connectedProvider === "google_sheets" ? "Google Sheets" : "Slack";
          if (!isCancelled) {
            setGlobalBanner({
              type: "success",
              message: `Successfully connected ${providerName}! Backend verified and credentials securely encrypted.`
            });
          }
          url.searchParams.delete("connected");
          window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams.toString()}` : ""));
        } else if (oauthError) {
          if (!isCancelled) {
            setGlobalBanner({
              type: "error",
              message: `Authorization failed: ${oauthError}`
            });
            if (errorProvider) {
              setError(errorProvider, oauthError);
              setAction(errorProvider, "failed");
            }
          }
          url.searchParams.delete("error");
          url.searchParams.delete("provider");
          window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams.toString()}` : ""));
        }
      }
    };

    initLoad();

    return () => {
      isCancelled = true;
    };
  }, [onIntegrationsUpdated]);

  // Handle Connect & Reconnect
  const handleConnect = async (provider: "google_sheets" | "slack" | "gmail", isReconnect = false) => {
    const isBusy = actionStates[provider] === "connecting" || actionStates[provider] === "reconnecting";
    if (isBusy) return;

    setAction(provider, isReconnect ? "reconnecting" : "connecting");
    setError(provider, null);
    setGlobalBanner(null);

    const endpoint = provider === "google_sheets" 
      ? "/api/automation/integrations/google/connect" 
      : provider === "gmail"
      ? "/api/automation/integrations/gmail/connect"
      : "/api/automation/integrations/slack/connect";

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success || !data.authUrl) {
        throw new Error(data.error || `Failed to initiate ${provider} connection.`);
      }

      // Redirect to external authorization URL (Google, Slack, or Gmail)
      window.location.href = data.authUrl;
    } catch (err) {
      console.error(`Error connecting to ${provider}:`, err);
      setAction(provider, "failed");
      const msg = err instanceof Error ? err.message : `Failed to connect ${provider}.`;
      setError(provider, msg);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (provider: "google_sheets" | "slack" | "gmail") => {
    const isBusy = actionStates[provider] === "disconnecting";
    if (isBusy) return;

    setAction(provider, "disconnecting");
    setError(provider, null);

    try {
      const res = await fetch("/api/automation/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to disconnect integration.");
      }

      await refreshStatuses();
      setAction(provider, "idle");
      setGlobalBanner({
        type: "success",
        message: `${provider === "google_sheets" ? "Google Sheets" : "Slack"} disconnected. Stored tokens revoked.`
      });
    } catch (err) {
      console.error(`Error disconnecting ${provider}:`, err);
      setAction(provider, "failed");
      const msg = err instanceof Error ? err.message : `Failed to disconnect ${provider}.`;
      setError(provider, msg);
    }
  };

  // Load Google Spreadsheets when opening config modal
  const openGoogleConfig = async (currentSpreadsheet?: string, currentSheet?: string) => {
    setShowGoogleConfig(true);
    setSelectedSpreadsheetName(currentSpreadsheet || "");
    setSelectedSheetName(currentSheet || "Sheet1");
    setIsLoadingGoogleResources(true);

    try {
      const res = await fetch("/api/automation/integrations/google/spreadsheets");
      const data = await res.json();
      if (data.success && data.spreadsheets) {
        setGoogleSpreadsheets(data.spreadsheets);
        if (data.spreadsheets.length > 0 && !currentSpreadsheet) {
          const first = data.spreadsheets[0];
          setSelectedSpreadsheetName(first.name);
          loadGoogleWorksheets(first.id);
        }
      }
    } catch (err) {
      console.warn("Could not list Google Spreadsheets:", err);
    } finally {
      setIsLoadingGoogleResources(false);
    }
  };

  const loadGoogleWorksheets = async (spreadsheetId: string) => {
    try {
      const res = await fetch(`/api/automation/integrations/google/sheets?spreadsheetId=${encodeURIComponent(spreadsheetId)}`);
      const data = await res.json();
      if (data.success && data.sheets) {
        setGoogleWorksheets(data.sheets);
        if (data.sheets.length > 0) {
          setSelectedSheetName(data.sheets[0]);
        }
      }
    } catch (err) {
      console.warn("Could not list Google worksheets:", err);
    }
  };

  const handleSaveGoogleConfig = async () => {
    if (!selectedSpreadsheetName.trim()) return;
    setIsSavingGoogleConfig(true);

    try {
      const trimmedSpread = selectedSpreadsheetName.trim();
      const trimmedSheet = (selectedSheetName || "Sheet1").trim();
      const matchedSpread = googleSpreadsheets.find((s) => s.name.trim().toLowerCase() === trimmedSpread.toLowerCase());

      const res = await fetch("/api/automation/integrations/google/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetName: trimmedSpread,
          spreadsheetId: matchedSpread ? matchedSpread.id : undefined,
          sheetName: trimmedSheet,
        })
      });
      const data = await res.json();
      if (data.success) {
        await refreshStatuses();
        setShowGoogleConfig(false);
      }
    } catch (err) {
      console.error("Failed to save Google sheet config:", err);
    } finally {
      setIsSavingGoogleConfig(false);
    }
  };

  // Load Slack Channels when opening config modal
  const openSlackConfig = async (currentChannel?: string) => {
    setShowSlackConfig(true);
    setSelectedChannelName(currentChannel || "#leads");
    setIsLoadingSlackChannels(true);

    try {
      const res = await fetch("/api/automation/integrations/slack/channels");
      const data = await res.json();
      if (data.success && data.channels) {
        setSlackChannels(data.channels);
      }
    } catch (err) {
      console.warn("Could not list Slack channels:", err);
    } finally {
      setIsLoadingSlackChannels(false);
    }
  };

  const handleSaveSlackConfig = async () => {
    if (!selectedChannelName.trim()) return;
    setIsSavingSlackConfig(true);

    try {
      const res = await fetch("/api/automation/integrations/slack/select-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: selectedChannelName.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        await refreshStatuses();
        setShowSlackConfig(false);
      }
    } catch (err) {
      console.error("Failed to save Slack channel config:", err);
    } finally {
      setIsSavingSlackConfig(false);
    }
  };

  if (requiredIntegrations.length === 0) {
    return null;
  }

  return (
    <div className="border border-white/12 bg-gradient-to-br from-[#121724] to-[#0c101a] p-5 sm:p-6 rounded-sm flex flex-col gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
          <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-200 font-semibold">
            Required Integrations & Connection Status
          </h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase">
          {requiredIntegrations.length} Required
        </span>
      </div>

      {/* Global Status Banner */}
      {globalBanner && (
        <div 
          className={`p-3 text-xs rounded-sm flex items-start justify-between gap-3 ${
            globalBanner.type === "success"
              ? "bg-accent/10 border border-accent/30 text-accent font-medium"
              : "bg-red-950/40 border border-red-900 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {globalBanner.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-accent" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{globalBanner.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setGlobalBanner(null)} 
            className="text-foreground/50 hover:text-foreground p-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requiredIntegrations.map((id) => {
          const info = statuses[id] || resolveIntegrationStatus(id);
          const isConnected = info.status === "connected";
          const isNotConfigured = info.status === "not_configured";
          const isNotConnected = info.status === "not_connected";
          const isExpired = info.status === "expired" || Boolean(info.isExpired);
          const action = actionStates[id] || "idle";
          const errMsg = errorMessages[id];

          const isActionBusy = action === "connecting" || action === "reconnecting" || action === "disconnecting";

          return (
            <div
              key={id}
              className={`p-4 border transition-all duration-200 flex flex-col justify-between gap-3 rounded-sm ${
                isConnected
                  ? "bg-[#161e2e]/90 border-accent/40 text-foreground shadow-[0_4px_20px_rgba(204,255,0,0.05)]"
                  : isExpired
                  ? "bg-orange-950/20 border-orange-500/30 text-foreground"
                  : isNotConfigured
                  ? "bg-[#161e2e]/90 border-white/10 text-slate-200"
                  : action === "failed"
                  ? "bg-red-950/20 border-red-900/50 text-foreground"
                  : "bg-[#161e2e]/90 border-yellow-500/30 text-slate-200"
              }`}
            >
              {/* Card Header & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wide block text-white">
                    {info.name}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                    {info.category}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {/* Status Badge */}
                  {action === "connecting" && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 border border-accent/30 rounded-full animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" />
                      Connecting
                    </span>
                  )}
                  {action === "reconnecting" && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 border border-accent/30 rounded-full animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-accent" />
                      Reconnecting
                    </span>
                  )}
                  {action === "disconnecting" && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-2 py-0.5 border border-zinc-700 rounded-full animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                      Disconnecting
                    </span>
                  )}
                  {action === "failed" && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-950/50 px-2 py-0.5 border border-red-800 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Connection Failed
                    </span>
                  )}

                  {action === "idle" && (
                    <>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 border border-accent/30 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-accent" />
                          Connected
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-orange-950/50 px-2 py-0.5 border border-orange-800 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-orange-400" />
                          Expired
                        </span>
                      )}
                      {!isExpired && isNotConnected && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 border border-yellow-400/30 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          Not Connected
                        </span>
                      )}
                      {isNotConfigured && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800/50 px-2 py-0.5 border border-zinc-700 rounded-full">
                          <XCircle className="w-3 h-3 text-zinc-400" />
                          Not Configured
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-foreground/60 leading-relaxed font-normal">
                {info.description}
              </p>

              {/* Connected Account & Resource Information */}
              {isConnected && info.account && (
                <div className="p-2.5 bg-[#121724]/90 border border-accent/20 rounded-sm flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-200 font-mono">
                    <span className="text-[10px] uppercase text-slate-400">Account:</span>
                    <span className="font-semibold text-accent truncate max-w-[200px]">
                      {info.account.workspaceName || info.account.name || info.account.email || "Authorized"}
                    </span>
                  </div>

                  {id === "google_sheets" && (
                    <div className="flex items-center justify-between text-foreground/60 font-mono text-[10px] border-t border-foreground/5 pt-1">
                      <span className="uppercase text-foreground/40">Sheet Target:</span>
                      <span className="truncate max-w-[190px]">
                        {info.account.selectedSpreadsheet || "Website Leads"} / {info.account.selectedSheet || "Sheet1"}
                      </span>
                    </div>
                  )}

                  {id === "slack" && (
                    <div className="flex items-center justify-between text-foreground/60 font-mono text-[10px] border-t border-foreground/5 pt-1">
                      <span className="uppercase text-foreground/40">Channel:</span>
                      <span className="text-foreground/90 font-semibold truncate max-w-[190px]">
                        {info.account.selectedChannel || "#leads"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message Display */}
              {errMsg && (
                <div className="p-2 bg-red-950/30 border border-red-900/60 rounded-sm text-[11px] text-red-300 leading-snug">
                  {errMsg}
                </div>
              )}

              {/* Missing Env Key Hint for Not Configured state */}
              {isNotConfigured && info.configuredEnvKeys && info.configuredEnvKeys.length > 0 && (
                <div className="p-2 bg-foreground/5 border border-foreground/10 rounded-sm text-[10px] font-mono text-foreground/50">
                  Required server keys: {info.configuredEnvKeys.join(", ")}
                </div>
              )}

              {/* Interactive Actions for Google Sheets */}
              {id === "google_sheets" && (
                <div className="pt-2 border-t border-foreground/5 flex items-center justify-between gap-2 flex-wrap">
                  {isExpired ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <span className="text-[11px] text-orange-400 font-mono">Authorization Expired</span>
                      <button
                        type="button"
                        onClick={() => handleConnect("google_sheets", true)}
                        disabled={isActionBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-400 text-black rounded-sm transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reconnect Account
                      </button>
                    </div>
                  ) : isConnected ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button
                        type="button"
                        onClick={() => openGoogleConfig(info.account?.selectedSpreadsheet, info.account?.selectedSheet)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium border border-accent/40 text-accent hover:bg-accent/10 rounded-sm transition-colors"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        Configure Sheet
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConnect("google_sheets", true)}
                          disabled={isActionBusy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-foreground/60 hover:text-foreground border border-foreground/15 hover:bg-foreground/5 rounded-sm transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Reconnect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisconnect("google_sheets")}
                          disabled={isActionBusy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-red-400 hover:text-red-300 border border-red-900/40 hover:bg-red-950/40 rounded-sm transition-colors disabled:opacity-50"
                        >
                          <Unlink className="w-2.5 h-2.5" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => handleConnect("google_sheets")}
                        disabled={isActionBusy || isNotConfigured}
                        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all ${
                          isNotConfigured
                            ? "border border-foreground/15 bg-foreground/5 text-foreground/40 cursor-not-allowed"
                            : "bg-accent hover:bg-accent/90 text-black font-bold shadow-md hover:shadow-accent/20 cursor-pointer"
                        }`}
                      >
                        {isActionBusy ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Connect Google Sheets
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Actions for Slack */}
              {id === "slack" && (
                <div className="pt-2 border-t border-foreground/5 flex items-center justify-between gap-2 flex-wrap">
                  {isExpired ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <span className="text-[11px] text-orange-400 font-mono">Authorization Expired</span>
                      <button
                        type="button"
                        onClick={() => handleConnect("slack", true)}
                        disabled={isActionBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-400 text-black rounded-sm transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reconnect Workspace
                      </button>
                    </div>
                  ) : isConnected ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button
                        type="button"
                        onClick={() => openSlackConfig(info.account?.selectedChannel)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium border border-accent/40 text-accent hover:bg-accent/10 rounded-sm transition-colors"
                      >
                        <Hash className="w-3 h-3" />
                        Configure Channel
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConnect("slack", true)}
                          disabled={isActionBusy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-foreground/60 hover:text-foreground border border-foreground/15 hover:bg-foreground/5 rounded-sm transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          Reconnect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisconnect("slack")}
                          disabled={isActionBusy}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-red-400 hover:text-red-300 border border-red-900/40 hover:bg-red-950/40 rounded-sm transition-colors disabled:opacity-50"
                        >
                          <Unlink className="w-2.5 h-2.5" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => handleConnect("slack")}
                        disabled={isActionBusy || isNotConfigured}
                        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all ${
                          isNotConfigured
                            ? "border border-foreground/15 bg-foreground/5 text-foreground/40 cursor-not-allowed"
                            : "bg-accent hover:bg-accent/90 text-black font-bold shadow-md hover:shadow-accent/20 cursor-pointer"
                        }`}
                      >
                        {isActionBusy ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Connect Slack
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Gmail Action & Status Block */}
              {id === "gmail" && (
                <div className="pt-3 border-t border-foreground/10 flex flex-wrap items-center justify-between gap-3">
                  {isExpired && (
                    <button
                      type="button"
                      onClick={() => handleConnect("gmail", true)}
                      className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:bg-yellow-500/20"
                    >
                      Reconnect Gmail
                    </button>
                  )}
                  {isConnected && !isExpired && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-accent">✓ Authorized Sender</span>
                      <button
                        type="button"
                        onClick={() => handleDisconnect("gmail")}
                        className="text-[10px] font-mono text-foreground/40 hover:text-red-400 underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                  {!isConnected && !isExpired && (
                    <button
                      type="button"
                      onClick={() => handleConnect("gmail")}
                      className="px-3.5 py-1.5 bg-accent text-background text-xs font-mono font-bold uppercase tracking-wider rounded-sm hover:brightness-110"
                    >
                      Connect Gmail
                    </button>
                  )}
                </div>
              )}

              {/* Status information for built-in services (OpenAI, Webhook) */}
              {id !== "google_sheets" && id !== "slack" && id !== "gmail" && (
                <div className="pt-2 border-t border-foreground/5 flex items-center justify-between text-[11px] text-foreground/50">
                  <span className="font-mono text-[10px] uppercase">
                    {isConnected ? "Engine Ready" : "Setup Required"}
                  </span>
                  <span className="text-[10px] text-foreground/40 font-mono">
                    {id === "webhook" ? "Internal Endpoint" : "Digilo Managed"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security & Execution Note */}
      <div className="mt-2 pt-3 border-t border-foreground/5 flex items-center gap-2 text-[11px] text-foreground/40 font-mono">
        <Info className="w-3.5 h-3.5 shrink-0 text-foreground/40" />
        <span>
          Real server OAuth flow. Credentials are AES-256 encrypted at rest and never shared with client JavaScript or raw workflow JSON.
        </span>
      </div>

      {/* Google Sheets Config Modal */}
      {showGoogleConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-background border border-foreground/20 p-6 rounded-sm shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Target Google Spreadsheet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleConfig(false)}
                className="text-foreground/40 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-foreground/60 leading-relaxed font-normal">
              Select or type the Google spreadsheet and worksheet tab where new leads and records should be appended.
            </p>

            {/* Spreadsheet selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/60">
                Spreadsheet Name
              </label>
              {isLoadingGoogleResources ? (
                <div className="p-2 border border-foreground/10 text-xs text-foreground/40 font-mono flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  Loading spreadsheets from Google Drive...
                </div>
              ) : googleSpreadsheets.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedSpreadsheetName}
                    onChange={(e) => {
                      setSelectedSpreadsheetName(e.target.value);
                      const found = googleSpreadsheets.find((s) => s.name === e.target.value);
                      if (found) loadGoogleWorksheets(found.id);
                    }}
                    className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm focus:border-accent outline-none"
                  >
                    {googleSpreadsheets.map((sheet) => (
                      <option key={sheet.id} value={sheet.name} className="bg-background text-foreground">
                        {sheet.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={selectedSpreadsheetName}
                    onChange={(e) => setSelectedSpreadsheetName(e.target.value)}
                    placeholder="Or type custom spreadsheet name"
                    className="w-full p-2 text-xs bg-foreground/[0.03] border border-foreground/10 text-foreground rounded-sm placeholder:text-foreground/30 focus:border-accent outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedSpreadsheetName}
                  onChange={(e) => setSelectedSpreadsheetName(e.target.value)}
                  placeholder="e.g. Website Leads 2026"
                  className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm placeholder:text-foreground/30 focus:border-accent outline-none"
                />
              )}
            </div>

            {/* Sheet / Worksheet tab selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/60">
                Worksheet Tab Name
              </label>
              {googleWorksheets.length > 0 ? (
                <select
                  value={selectedSheetName}
                  onChange={(e) => setSelectedSheetName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm focus:border-accent outline-none"
                >
                  {googleWorksheets.map((tab) => (
                    <option key={tab} value={tab} className="bg-background text-foreground">
                      {tab}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedSheetName}
                  onChange={(e) => setSelectedSheetName(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm placeholder:text-foreground/30 focus:border-accent outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-foreground/10">
              <button
                type="button"
                onClick={() => setShowGoogleConfig(false)}
                className="px-3 py-1.5 text-xs font-mono uppercase text-foreground/60 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoogleConfig}
                disabled={isSavingGoogleConfig || !selectedSpreadsheetName.trim()}
                className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-accent text-black rounded-sm hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingGoogleConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slack Channel Config Modal */}
      {showSlackConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-background border border-foreground/20 p-6 rounded-sm shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Select Slack Notification Channel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSlackConfig(false)}
                className="text-foreground/40 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-foreground/60 leading-relaxed font-normal">
              Select the Slack channel where incoming notifications and business alert messages should be posted.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-foreground/60">
                Slack Channel
              </label>
              {isLoadingSlackChannels ? (
                <div className="p-2 border border-foreground/10 text-xs text-foreground/40 font-mono flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  Loading workspace channels from Slack...
                </div>
              ) : slackChannels.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedChannelName}
                    onChange={(e) => setSelectedChannelName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm focus:border-accent outline-none"
                  >
                    {slackChannels.map((channel) => (
                      <option key={channel.id} value={channel.name} className="bg-background text-foreground">
                        {channel.name} {channel.is_private ? "(Private)" : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={selectedChannelName}
                    onChange={(e) => setSelectedChannelName(e.target.value)}
                    placeholder="Or type custom channel name (e.g. #sales-leads)"
                    className="w-full p-2 text-xs bg-foreground/[0.03] border border-foreground/10 text-foreground rounded-sm placeholder:text-foreground/30 focus:border-accent outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedChannelName}
                  onChange={(e) => setSelectedChannelName(e.target.value)}
                  placeholder="e.g. #leads"
                  className="w-full p-2.5 text-xs bg-foreground/5 border border-foreground/20 text-foreground rounded-sm placeholder:text-foreground/30 focus:border-accent outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-foreground/10">
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
                disabled={isSavingSlackConfig || !selectedChannelName.trim()}
                className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-accent text-black rounded-sm hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingSlackConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save Channel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
