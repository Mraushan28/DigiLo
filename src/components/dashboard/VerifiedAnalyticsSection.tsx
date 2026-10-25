"use client";

import { AnalyticsSummary } from "@/lib/automation/telemetry-service";
import { 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Timer, 
  Inbox, 
  Table, 
  Send, 
  HelpCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface VerifiedAnalyticsSectionProps {
  analytics: AnalyticsSummary;
  timeframe: "24h" | "7d" | "30d";
  onTimeframeChange: (tf: "24h" | "7d" | "30d") => void;
  isLoading?: boolean;
}

export default function VerifiedAnalyticsSection({
  analytics,
  timeframe,
  onTimeframeChange,
  isLoading = false,
}: VerifiedAnalyticsSectionProps) {
  return (
    <section 
      id="section-verified-analytics"
      aria-label="Section C: Verified Analytics Dashboard"
      className="border border-foreground/15 bg-background/95 rounded-sm p-6 shadow-xl flex flex-col gap-6"
    >
      {/* Header & Time Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-accent" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
              SECTION C: Verified Analytics Dashboard
            </h2>
          </div>
          <p className="text-[11px] text-foreground/60 font-mono">
            Source of Truth: Real tenant runtime execution telemetry (Zero fabricated data)
          </p>
        </div>

        {/* Timeframe Filter Pills */}
        <div className="flex items-center bg-foreground/5 border border-foreground/15 p-1 rounded-sm gap-1 self-start sm:self-auto">
          {(["24h", "7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              id={`filter-${tf}`}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-sm transition-all ${
                timeframe === tf
                  ? "bg-accent text-background font-bold shadow-sm"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              Last {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Strict Empty State Integrity Check (PRD Section 4.3) */}
      {analytics.isEmpty ? (
        <div 
          id="analytics-empty-state"
          className="border border-foreground/10 bg-foreground/[0.01] rounded-sm py-12 px-6 flex flex-col items-center justify-center text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-foreground/5 border border-foreground/15 flex items-center justify-center text-foreground/40">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            No Executions Recorded Yet
          </h3>
          <p className="text-xs text-foreground/60 max-w-md leading-relaxed font-normal">
            Activate your workflow or run a safe dry-run test above to view performance metrics, throughput counts, and per-step telemetry.
          </p>
          <div className="flex items-center gap-2 pt-2 text-[10px] font-mono text-accent">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Strict Zero-Fabrication Mode Active</span>
          </div>
        </div>
      ) : (
        <>
          {/* Metric KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Runs */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Total Runs
              </span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {analytics.totalRuns.toLocaleString()}
              </p>
              <span className="text-[10px] font-mono text-foreground/40 mt-1 block">
                {analytics.successfulRuns} ok / {analytics.failedRuns} err
              </span>
            </div>

            {/* 2. Success Rate */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Success Rate
              </span>
              <p className="text-2xl font-bold font-mono text-accent">
                {analytics.successRate !== null ? `${analytics.successRate}%` : "N/A"}
              </p>
              <span className="text-[10px] font-mono text-accent/70 mt-1 block">
                Target: &gt;95.0%
              </span>
            </div>

            {/* 3. Avg Duration */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Avg Duration
              </span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {analytics.avgDurationMs}ms
              </p>
              <span className="text-[10px] font-mono text-foreground/40 mt-1 block">
                End-to-end pipeline
              </span>
            </div>

            {/* 4. Leads Ingested */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Leads Ingested
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {analytics.leadsIngested.toLocaleString()}
              </p>
              <span className="text-[10px] font-mono text-emerald-400/60 mt-1 block">
                Unique webhook events
              </span>
            </div>

            {/* 5. Sheets Rows Written */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Sheets Written
              </span>
              <p className="text-2xl font-bold font-mono text-cyan-400">
                {analytics.sheetsRowsWritten.toLocaleString()}
              </p>
              <span className="text-[10px] font-mono text-cyan-400/60 mt-1 block">
                Confirmed append logs
              </span>
            </div>

            {/* 6. Notifications Delivered */}
            <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 block mb-1">
                Alerts Sent
              </span>
              <p className="text-2xl font-bold font-mono text-amber-400">
                {analytics.notificationsDelivered.toLocaleString()}
              </p>
              <span className="text-[10px] font-mono text-amber-400/60 mt-1 block">
                Slack / Email alerts
              </span>
            </div>
          </div>

          {/* Daily Trend Aggregation Chart */}
          {analytics.dailyTrends.length > 0 && (
            <div className="border border-foreground/10 bg-foreground/[0.02] p-5 rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  Daily Execution Volume & Reliability
                </span>
                <span className="text-[10px] font-mono text-foreground/40">
                  {analytics.dailyTrends.length} Days Recorded
                </span>
              </div>

              <div className="h-32 flex items-end gap-2 pt-4">
                {analytics.dailyTrends.map((d) => {
                  const maxRuns = Math.max(...analytics.dailyTrends.map((t) => t.totalRuns), 1);
                  const heightPercent = Math.max((d.totalRuns / maxRuns) * 100, 8);

                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="w-full bg-foreground/5 rounded-t-sm relative flex items-end overflow-hidden h-24">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full transition-all duration-300 rounded-t-sm ${
                            d.failedRuns > 0 ? "bg-amber-400" : "bg-accent"
                          }`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-foreground/40 group-hover:text-foreground transition-colors truncate max-w-[42px]">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
