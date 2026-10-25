"use client";

import { 
  Sparkles, 
  ArrowDownRight, 
  Cpu, 
  Send, 
  HeartPulse, 
  CheckCircle2,
  FileText
} from "lucide-react";

interface AIWorkflowAnalysisSectionProps {
  analysis?: {
    intakeSummary: string;
    transformationSummary: string;
    distributionSummary: string;
    operationalHealth: string;
  };
}

export default function AIWorkflowAnalysisSection({
  analysis,
}: AIWorkflowAnalysisSectionProps) {
  const defaultAnalysis = {
    intakeSummary: "Inbound events arrive via Webhook triggers, where payload schemas are normalized and verified before invoking downstream steps.",
    transformationSummary: "AI Lead Intelligence evaluates urgency and extracts structured lead attributes without unrequested storage side-effects.",
    distributionSummary: "Verified outputs route deterministically to connected business destinations (Google Sheets, Slack, Gmail).",
    operationalHealth: "All components functioning normally within nominal latency constraints.",
  };

  const data = analysis || defaultAnalysis;

  return (
    <section 
      id="section-ai-workflow-analysis"
      aria-label="SECTION E: AI WORKFLOW ANALYSIS"
      className="border border-foreground/15 bg-background/95 rounded-sm p-6 shadow-xl flex flex-col gap-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
            SECTION E: AI Workflow Analysis
          </h2>
          <p className="text-[11px] text-foreground/60 font-mono">
            Plain-language architecture narrative explaining data flow, transformations, and operational health
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Inbound Intake */}
        <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>1. Inbound Ingestion Pipeline</span>
          </div>
          <p className="text-xs text-foreground/75 leading-relaxed font-normal">
            {data.intakeSummary}
          </p>
        </div>

        {/* 2. Transformation */}
        <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Data Transformation & Intelligence</span>
          </div>
          <p className="text-xs text-foreground/75 leading-relaxed font-normal">
            {data.transformationSummary}
          </p>
        </div>

        {/* 3. Outbound Distribution */}
        <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
            <Send className="w-3.5 h-3.5" />
            <span>3. Outbound Destination Delivery</span>
          </div>
          <p className="text-xs text-foreground/75 leading-relaxed font-normal">
            {data.distributionSummary}
          </p>
        </div>

        {/* 4. Operational Health */}
        <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-accent">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>4. Runtime Health & Latency Telemetry</span>
          </div>
          <p className="text-xs text-foreground/75 leading-relaxed font-normal">
            {data.operationalHealth}
          </p>
        </div>
      </div>
    </section>
  );
}
