"use client";

import { WorkflowTrigger } from "@/types/automation";
import { TRIGGER_REGISTRY, TRIGGER_DEFINITIONS, SupportedTrigger } from "@/lib/automation/trigger-registry";
import { Webhook, Play, Radio, Edit3 } from "lucide-react";

interface WorkflowTriggerCardProps {
  trigger: WorkflowTrigger;
  isEditing: boolean;
  onChange: (updatedTrigger: WorkflowTrigger) => void;
  errors?: string[];
}

export default function WorkflowTriggerCard({
  trigger,
  isEditing,
  onChange,
  errors = []
}: WorkflowTriggerCardProps) {
  const isWebhook = trigger.type === "webhook";
  const def = TRIGGER_DEFINITIONS[trigger.type as SupportedTrigger] || TRIGGER_DEFINITIONS.webhook;

  return (
    <div className="border border-white/12 bg-gradient-to-br from-[#121724] to-[#0c101a] backdrop-blur p-5 sm:p-6 rounded-sm relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-accent shadow-[0_0_12px_rgba(204,255,0,0.4)]" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 shadow-inner">
            {isWebhook ? (
              <Webhook className="w-5 h-5 text-accent" />
            ) : (
              <Play className="w-5 h-5 text-accent" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 bg-accent/15 border border-accent/30 text-accent font-bold rounded-sm">
                TRIGGER ({trigger.type.toUpperCase()})
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Radio className="w-3 h-3 text-accent animate-pulse" />
                Active Entry Point
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight text-white mt-1">
              {isWebhook ? "Inbound Event Listener" : "Manual / Scheduled Run"}
            </h3>
          </div>
        </div>

        {isEditing && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent flex items-center gap-1 self-start sm:self-auto bg-accent/10 px-2 py-1 border border-accent/30">
            <Edit3 className="w-3 h-3" />
            Editing Trigger
          </span>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#161e2e]/90 p-4 border border-white/10 rounded-sm shadow-inner">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Event Source
              </span>
              <span className="text-sm font-semibold text-white break-words">
                {trigger.source}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                Event Type
              </span>
              <span className="text-sm font-mono text-accent font-semibold break-words">
                {trigger.event}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {trigger.description || def.description}
          </p>
        </div>
      ) : (
        <div className="space-y-4 pt-3 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Trigger Type *
              </label>
              <select
                value={trigger.type}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    type: e.target.value as "webhook" | "manual"
                  })
                }
                className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
              >
                {TRIGGER_REGISTRY.map((t) => (
                  <option key={t} value={t} className="bg-[#10141e] text-white">
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Source Name *
              </label>
              <input
                type="text"
                value={trigger.source}
                onChange={(e) => onChange({ ...trigger, source: e.target.value })}
                placeholder="e.g. Website Contact Form"
                className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                Event Identifier *
              </label>
              <input
                type="text"
                value={trigger.event}
                onChange={(e) => onChange({ ...trigger, event: e.target.value })}
                placeholder="e.g. lead_submitted"
                className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Trigger Description
            </label>
            <input
              type="text"
              value={trigger.description || ""}
              onChange={(e) => onChange({ ...trigger, description: e.target.value })}
              placeholder="e.g. Fires whenever a user completes the inbound contact form."
              className="w-full bg-[#141b29] border border-white/15 text-white text-xs p-2.5 rounded-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 p-2.5 bg-red-950/30 border border-red-900/60 rounded-sm">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-300 font-medium">
              • {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
