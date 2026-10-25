"use client";

import { WorkflowStep } from "@/types/automation";
import { getActionDefinition } from "@/lib/automation/action-registry";
import { 
  Sparkles, 
  FileSpreadsheet, 
  Mail, 
  MessageSquare, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Sliders, 
  Layers, 
  AlertCircle 
} from "lucide-react";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  isEditing: boolean;
  onUpdate: (updatedStep: WorkflowStep) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  stepErrors?: string[];
}

export default function WorkflowStepCard({
  step,
  index,
  totalSteps,
  isEditing,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  stepErrors = []
}: WorkflowStepCardProps) {
  const def = getActionDefinition(step.action);
  const actionName = step.name || def?.name || step.action;
  const config = step.config || {};

  const getActionIcon = () => {
    switch (step.action) {
      case "ai.analyze":
        return <Sparkles className="w-5 h-5 text-accent" />;
      case "google_sheets.add_row":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case "gmail.send_email":
        return <Mail className="w-5 h-5 text-sky-400" />;
      case "slack.send_message":
        return <MessageSquare className="w-5 h-5 text-fuchsia-400" />;
      default:
        return <Layers className="w-5 h-5 text-foreground/70" />;
    }
  };

  const getStepCategory = () => {
    if (step.action.startsWith("ai.")) {
      return {
        badge: "AI PROCESSING",
        badgeClass: "bg-purple-500/15 border-purple-500/30 text-purple-300",
      };
    }
    if (step.action.startsWith("google_sheets.") || step.action.startsWith("database.")) {
      return {
        badge: "DATA STORAGE",
        badgeClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      };
    }
    if (step.action.startsWith("slack.") || step.action.startsWith("gmail.")) {
      return {
        badge: "COMMUNICATION & ALERT",
        badgeClass: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
      };
    }
    if (step.action.includes("filter") || step.action.includes("condition")) {
      return {
        badge: "LOGIC & ROUTING",
        badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      };
    }
    return {
      badge: "PIPELINE ACTION",
      badgeClass: "bg-white/10 border-white/20 text-slate-300",
    };
  };

  const category = getStepCategory();

  const handleConfigChange = (key: string, value: string | number | boolean) => {
    onUpdate({
      ...step,
      config: {
        ...config,
        [key]: value
      }
    });
  };

  return (
    <div className={`w-full border transition-all duration-300 rounded-sm backdrop-blur-md relative ${
      stepErrors.length > 0
        ? "border-red-900/80 bg-red-950/20 shadow-lg"
        : "border-white/12 hover:border-white/25 bg-gradient-to-br from-[#121724] to-[#0c101a] shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
    }`}>
      {/* Header bar */}
      <div className="border-b border-white/10 px-4 sm:px-6 py-3.5 bg-[#161e2e]/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-[#1c273a] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
            {getActionIcon()}
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold px-2.5 py-0.5 bg-accent/15 border border-accent/30 rounded-sm shrink-0">
              STEP {index + 1}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border shrink-0 ${category.badgeClass}`}>
              {category.badge}
            </span>
            <span className="text-xs font-mono uppercase text-slate-400 shrink-0">
              {step.action}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              (Order: {index + 1} of {totalSteps})
            </span>
            {def?.requiredIntegration && (
              <span className="text-[10px] font-mono uppercase text-slate-300 bg-[#1c273a] px-2 py-0.5 rounded-sm border border-white/10 shrink-0">
                {def.requiredIntegration}
              </span>
            )}
          </div>
        </div>

        {/* Controls when in editing mode */}
        {isEditing && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              title="Move Step Up"
              className="p-1.5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalSteps - 1}
              title="Move Step Down"
              className="p-1.5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRemove}
              disabled={totalSteps <= 1}
              title={totalSteps <= 1 ? "At least one step required" : "Remove Step"}
              className="p-1.5 border border-red-900/50 text-red-400 hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors ml-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Body content */}
      <div className="p-4 sm:p-6 space-y-4">
        {!isEditing ? (
          <div>
            {/* Complete Title */}
            <h4 className="text-base sm:text-lg font-bold uppercase tracking-tight text-white break-words mb-2">
              {actionName}
            </h4>

            {/* Complete, un-truncated description */}
            <p className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-wrap break-words">
              {step.description}
            </p>

            {/* Configuration parameter summary */}
            {def?.configFields && def.configFields.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sliders className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Configured Parameters
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {def.configFields.map((field) => {
                    const val = config[field.key] ?? field.defaultValue ?? "—";
                    return (
                      <div key={field.key} className="bg-[#161e2e]/90 p-2.5 border border-white/10 rounded-sm">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                          {field.label}
                        </span>
                        <span className="text-xs font-mono text-white font-medium break-words line-clamp-2">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Editable Form Fields */
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Step Name *
              </label>
              <input
                type="text"
                value={step.name || def?.name || ""}
                onChange={(e) => onUpdate({ ...step, name: e.target.value })}
                placeholder="e.g. AI Qualification or Send Slack Alert"
                className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Step Description *
              </label>
              <textarea
                value={step.description}
                onChange={(e) => onUpdate({ ...step, description: e.target.value })}
                rows={3}
                placeholder="Describe what this step does..."
                className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent resize-y"
              />
            </div>

            {/* Config Fields */}
            {def?.configFields && def.configFields.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold block">
                  Configuration Settings
                </span>

                {def.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                      {field.label} {field.required ? "*" : "(Optional)"}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        value={config[field.key] ?? field.defaultValue ?? ""}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent resize-y"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={config[field.key] ?? field.defaultValue ?? ""}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#10141e] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={config[field.key] ?? field.defaultValue ?? ""}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step-specific errors */}
        {stepErrors.length > 0 && (
          <div className="p-3 bg-red-950/40 border border-red-900/70 rounded-sm space-y-1">
            {stepErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
