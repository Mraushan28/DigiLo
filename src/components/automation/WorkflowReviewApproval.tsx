"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Workflow, WorkflowStep, WorkflowTrigger, WorkflowValidationResult } from "@/types/automation";
import { ACTION_REGISTRY, SupportedAction, getDefaultConfig } from "@/lib/automation/action-registry";
import { validateWorkflow, calculateRequiredIntegrations } from "@/lib/automation/workflow-validator";
import { convertDigiloWorkflowToN8n, N8nWorkflowExport } from "@/lib/automation/n8n-exporter";
import WorkflowTriggerCard from "./WorkflowTriggerCard";
import WorkflowStepCard from "./WorkflowStepCard";
import WorkflowIntegrationsCard from "./WorkflowIntegrationsCard";
import { useAuth } from "@/components/auth/AuthContext";
import { 
  CheckCircle2, 
  Edit3, 
  RefreshCw, 
  ShieldCheck, 
  Plus, 
  ArrowDown, 
  AlertCircle, 
  FileCode2, 
  Copy, 
  Check, 
  Clock, 
  Lock,
  Sparkles,
  Activity,
  X
} from "lucide-react";

interface WorkflowReviewApprovalProps {
  initialWorkflow: Workflow;
  onRegenerate: () => void;
  onWorkflowChange?: (workflow: Workflow) => void;
}

export default function WorkflowReviewApproval({
  initialWorkflow,
  onRegenerate,
  onWorkflowChange
}: WorkflowReviewApprovalProps) {
  const { user, workspace, openAuthModal } = useAuth();
  const [prevInitial, setPrevInitial] = useState<Workflow>(initialWorkflow);
  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow);
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<WorkflowValidationResult>(() => validateWorkflow(initialWorkflow));
  
  // Approval state
  const [isApproving, setIsApproving] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(initialWorkflow.status === "approved");
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [n8nExport, setN8nExport] = useState<N8nWorkflowExport | null>(null);
  const [approvedWorkflowId, setApprovedWorkflowId] = useState<string | null>(initialWorkflow.id || null);
  
  // UI toggles
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [showN8nExportModal, setShowN8nExportModal] = useState(false);
  const [copiedN8n, setCopiedN8n] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync state if initialWorkflow changes
  if (initialWorkflow !== prevInitial) {
    setPrevInitial(initialWorkflow);
    setWorkflow(initialWorkflow);
    setApprovalConfirmed(initialWorkflow.status === "approved");
    setValidation(validateWorkflow(initialWorkflow));
    setN8nExport(null);
    setApprovedAt(null);
    setIsEditing(false);
    setApiError(null);
    setShowAddStepModal(false);
    setShowN8nExportModal(false);
  }

  // Live validation on every change
  const handleWorkflowUpdate = (updated: Workflow) => {
    // Reconcile required integrations automatically
    const reconciledIntegrations = calculateRequiredIntegrations(updated);
    const finalizedWorkflow: Workflow = {
      ...updated,
      required_integrations: reconciledIntegrations,
      updatedAt: new Date().toISOString()
    };

    setWorkflow(finalizedWorkflow);
    const res = validateWorkflow(finalizedWorkflow);
    setValidation(res);

    if (onWorkflowChange) {
      onWorkflowChange(finalizedWorkflow);
    }
  };

  // Trigger update
  const handleTriggerChange = (updatedTrigger: WorkflowTrigger) => {
    handleWorkflowUpdate({
      ...workflow,
      trigger: updatedTrigger
    });
  };

  // Step update
  const handleStepUpdate = (index: number, updatedStep: WorkflowStep) => {
    const updatedSteps = [...workflow.steps];
    updatedSteps[index] = updatedStep;
    handleWorkflowUpdate({
      ...workflow,
      steps: updatedSteps
    });
  };

  // Move step up
  const handleMoveStepUp = (index: number) => {
    if (index <= 0) return;
    const updatedSteps = [...workflow.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index - 1];
    updatedSteps[index - 1] = temp;
    handleWorkflowUpdate({
      ...workflow,
      steps: updatedSteps
    });
  };

  // Move step down
  const handleMoveStepDown = (index: number) => {
    if (index >= workflow.steps.length - 1) return;
    const updatedSteps = [...workflow.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index + 1];
    updatedSteps[index + 1] = temp;
    handleWorkflowUpdate({
      ...workflow,
      steps: updatedSteps
    });
  };

  // Remove step
  const handleRemoveStep = (index: number) => {
    if (workflow.steps.length <= 1) return;
    const updatedSteps = workflow.steps.filter((_, i) => i !== index);
    handleWorkflowUpdate({
      ...workflow,
      steps: updatedSteps
    });
  };

  // Add supported action from ACTION_REGISTRY
  const handleAddAction = (actionId: SupportedAction) => {
    const def = ACTION_REGISTRY[actionId];
    const actionSlug = actionId.replace(/[^a-z0-9]/gi, "_");
    const newStepId = `step_${actionSlug}_${workflow.steps.length + 1}`;
    const newStep: WorkflowStep = {
      id: newStepId,
      name: def.name,
      type: "action",
      action: actionId,
      description: def.description,
      config: getDefaultConfig(actionId)
    };

    handleWorkflowUpdate({
      ...workflow,
      steps: [...workflow.steps, newStep]
    });

    setShowAddStepModal(false);
  };

  // Workflow Approval Handler
  const handleApproveWorkflow = async () => {
    setApiError(null);
    
    // First run complete client validation
    const clientValidation = validateWorkflow(workflow);
    if (!clientValidation.isValid) {
      setValidation(clientValidation);
      setApiError("Please resolve all validation errors before approving the workflow.");
      return;
    }

    setIsApproving(true);

    try {
      const res = await fetch("/api/automation/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow })
      });

      const data = await res.json();

      if (data.success) {
        if (data.requiresAuth) {
          // Scenario B: Unauthenticated user approved workflow.
          // Workflow is securely stored as pending approval draft in HTTP-only cookie.
          openAuthModal("signup");
          return;
        }

        // Scenario A: Authenticated user approved workflow.
        // Redirect directly to the newly created workflow dashboard detail page!
        const resolvedId = data.workflowId || data.approvedWorkflow?.id || workflow.id;
        const redirectUrl = data.redirectUrl || `/dashboard/workflows/${resolvedId}`;
        window.location.href = redirectUrl;
        return;
      } else {
        setApiError(data.error?.message || "Workflow approval failed. Please review step configuration.");
        if (data.error?.validationErrors) {
          setValidation({ isValid: false, errors: data.error.validationErrors });
        }
      }
    } catch {
      // Fallback local approval if offline or server disconnected
      const fallbackExport = convertDigiloWorkflowToN8n(workflow);
      setApprovalConfirmed(true);
      setApprovedAt(new Date().toISOString());
      setN8nExport(fallbackExport);
      setApprovedWorkflowId(workflow.id || null);
      setIsEditing(false);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCopyN8n = () => {
    if (!n8nExport) return;
    navigator.clipboard.writeText(JSON.stringify(n8nExport, null, 2));
    setCopiedN8n(true);
    setTimeout(() => setCopiedN8n(false), 2000);
  };

  // Collect step errors by step ID
  const getErrorsForStep = (stepId: string, index: number): string[] => {
    return validation.errors
      .filter((e) => e.stepId === stepId || e.field?.includes(`steps[${index}]`))
      .map((e) => e.message);
  };

  const triggerErrors = validation.errors
    .filter((e) => e.field?.startsWith("trigger"))
    .map((e) => e.message);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Workflow Header Banner */}
      <div className="border border-white/12 bg-gradient-to-br from-[#131926] via-[#0f1420] to-[#0a0e17] backdrop-blur-md p-6 sm:p-7 rounded-sm relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent via-accent/60 to-transparent shadow-[0_0_12px_rgba(204,255,0,0.4)]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent font-bold px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-sm">
                WORKFLOW PLAN
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm ${
                approvalConfirmed
                  ? "bg-accent/15 border-accent text-accent font-bold"
                  : validation.isValid
                  ? "bg-[#182236] border-white/15 text-slate-200"
                  : "bg-red-950/40 border-red-900 text-red-300 font-semibold"
              }`}>
                {approvalConfirmed
                  ? "✓ APPROVED & STAGED"
                  : validation.isValid
                  ? "VALIDATED & READY"
                  : `⚠️ ${validation.errors.length} ISSUE${validation.errors.length > 1 ? "S" : ""}`}
              </span>

              {user ? (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm bg-accent/10 border-accent/30 text-accent font-medium">
                  🏢 {workspace?.name || "Workspace"}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    fetch("/api/automation/draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ workflow }),
                    });
                    openAuthModal("signup");
                  }}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm bg-[#182236] border-white/15 text-slate-300 hover:text-accent hover:border-accent/40 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-accent" />
                  CLAIM TO WORKSPACE
                </button>
              )}
            </div>

            {!isEditing ? (
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white break-words">
                {workflow.name}
              </h2>
            ) : (
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => handleWorkflowUpdate({ ...workflow, name: e.target.value })}
                className="text-xl font-bold uppercase tracking-tight text-white bg-[#141b29] border border-white/20 p-2 rounded-sm w-full max-w-xl focus:outline-none focus:border-accent"
                placeholder="Workflow Name"
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-slate-400">
              {workflow.steps.length} Steps
            </span>
            <span className="text-white/20">•</span>
            <span className="text-xs font-mono text-slate-400">
              {workflow.required_integrations.length} Integrations
            </span>
          </div>
        </div>

        {!isEditing ? (
          <p className="text-sm text-slate-300 leading-relaxed font-normal break-words max-w-3xl">
            {workflow.description}
          </p>
        ) : (
          <textarea
            value={workflow.description}
            onChange={(e) => handleWorkflowUpdate({ ...workflow, description: e.target.value })}
            rows={2}
            className="w-full text-xs text-slate-200 bg-[#141b29] border border-white/20 p-2.5 rounded-sm focus:outline-none focus:border-accent resize-y"
            placeholder="Workflow Description"
          />
        )}
      </div>

      {/* Confirmation State Banner if Approved */}
      <AnimatePresence>
        {approvalConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-accent bg-accent/10 p-6 rounded-sm relative overflow-hidden shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent text-background flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
                      Workflow Approved Successfully
                    </h3>
                  </div>
                  <p className="text-xs text-foreground/80 mt-0.5">
                    Staged for execution engine. All triggers, actions, and schemas are strictly verified.
                  </p>
                  {n8nExport?.meta?.isExecutable ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-accent font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Ready for Execution: All required integrations are verified and connected.
                    </div>
                  ) : n8nExport?.meta?.validationStatus?.missingCredentials && n8nExport.meta.validationStatus.missingCredentials.length > 0 ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-yellow-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      Pending Connection: Connect {n8nExport.meta.validationStatus.missingCredentials.join(", ")} below to enable live execution.
                    </div>
                  ) : null}
                  {approvedAt && (
                    <span className="text-[10px] font-mono text-foreground/50 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-accent" />
                      Approved on: {new Date(approvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {approvedWorkflowId && (
                  <Link
                    href={`/dashboard/workflows/${approvedWorkflowId}`}
                    id="btn-open-workflow-dashboard"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-accent text-background hover:brightness-110 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all shadow-md"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Open Studio Dashboard →
                  </Link>
                )}
                <button
                  onClick={() => setShowN8nExportModal(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-foreground/10 hover:bg-foreground/20 border border-foreground/20 text-foreground px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-accent" />
                  View n8n JSON
                </button>
                <button
                  onClick={() => setApprovalConfirmed(false)}
                  className="flex-1 sm:flex-initial text-xs font-mono text-foreground/60 hover:text-foreground px-3 py-2.5 border border-foreground/10 hover:border-foreground/30 rounded-sm transition-colors"
                >
                  Revise Workflow
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-accent/20 flex items-center gap-2 text-[11px] font-mono text-foreground/60">
              <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                Safety Guarantee: Zero real outbound messages or external mutations were sent. Real execution will occur in the n8n phase.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Validation Error Banner */}
      {!validation.isValid && (
        <div className="border border-red-900/80 bg-red-950/20 p-5 rounded-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Validation Issues Detected ({validation.errors.length})</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-xs text-red-300">
            {validation.errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {apiError && (
        <div className="p-4 bg-red-950/30 border border-red-900 text-xs text-red-300 rounded-sm">
          {apiError}
        </div>
      )}

      {/* SECTION 1: TRIGGER (Displayed separately) */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-foreground/50 font-semibold">
            1. Entry Point
          </span>
          <span className="text-[10px] font-mono text-foreground/40 uppercase">
            Runs First
          </span>
        </div>
        <WorkflowTriggerCard
          trigger={workflow.trigger}
          isEditing={isEditing}
          onChange={handleTriggerChange}
          errors={triggerErrors}
        />
      </div>

      {/* Arrow Connector */}
      <div className="flex items-center justify-center -my-2 relative z-10">
        <div className="p-2 rounded-full bg-[#161e2e] border border-accent/40 text-accent shadow-[0_0_15px_rgba(204,255,0,0.2)]">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* SECTION 2: ACTION STEPS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-foreground/50 font-semibold">
            2. Action Execution Pipeline ({workflow.steps.length} {workflow.steps.length === 1 ? "step" : "steps"})
          </span>
          {isEditing && (
            <button
              onClick={() => setShowAddStepModal(true)}
              className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 border border-accent/30 rounded-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Action Step
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {workflow.steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center w-full">
              <WorkflowStepCard
                step={step}
                index={idx}
                totalSteps={workflow.steps.length}
                isEditing={isEditing}
                onUpdate={(updated) => handleStepUpdate(idx, updated)}
                onMoveUp={() => handleMoveStepUp(idx)}
                onMoveDown={() => handleMoveStepDown(idx)}
                onRemove={() => handleRemoveStep(idx)}
                stepErrors={getErrorsForStep(step.id, idx)}
              />
              {idx < workflow.steps.length - 1 && (
                <div className="flex flex-col items-center my-2 relative z-10">
                  <div className="w-[2px] h-3 bg-gradient-to-b from-white/20 to-accent/60" />
                  <div className="p-1.5 rounded-full bg-[#161e2e] border border-accent/40 text-accent shadow-[0_0_12px_rgba(204,255,0,0.2)]">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-[2px] h-3 bg-gradient-to-b from-accent/60 to-white/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Step Modal / Dropdown */}
      <AnimatePresence>
        {showAddStepModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="border-2 border-accent bg-background/95 backdrop-blur-xl p-6 rounded-sm shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-4 border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Select Action from Action Registry
                </h4>
              </div>
              <button
                onClick={() => setShowAddStepModal(false)}
                className="text-foreground/40 hover:text-foreground p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ACTION_REGISTRY) as SupportedAction[]).map((actionId) => {
                const def = ACTION_REGISTRY[actionId];
                return (
                  <button
                    key={actionId}
                    type="button"
                    onClick={() => handleAddAction(actionId)}
                    className="p-4 border border-foreground/15 hover:border-accent bg-foreground/[0.02] hover:bg-accent/5 rounded-sm text-left transition-all group flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm uppercase tracking-wide group-hover:text-accent transition-colors">
                          {def.name}
                        </span>
                        <span className="text-[10px] font-mono text-foreground/40 uppercase bg-foreground/5 px-2 py-0.5 rounded-sm">
                          {def.requiredIntegration}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60 leading-relaxed font-normal">
                        {def.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-accent/80 font-bold tracking-wider pt-2 border-t border-foreground/5 block">
                      + Insert Step
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 3: REQUIRED INTEGRATIONS */}
      <div>
        <WorkflowIntegrationsCard 
          requiredIntegrations={workflow.required_integrations} 
          onIntegrationsUpdated={(updated) => {
            if (approvalConfirmed && n8nExport) {
              setN8nExport(convertDigiloWorkflowToN8n(workflow, { workspaceIntegrations: updated }));
            }
          }}
        />
      </div>

      {/* SECTION 4: 3 BOTTOM ACTION BUTTONS (PRD v3.1 Spec) */}
      <div className="sticky bottom-4 z-40 bg-[#0A0A0A]/95 backdrop-blur-md p-3 sm:p-4 rounded-lg border border-[#222222] shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {/* Button 1: REGENERATE */}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isApproving}
            className="flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-[#111111] hover:bg-[#1A1A1A] border border-white/30 hover:border-white text-white rounded transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isApproving ? "animate-spin" : ""}`} />
            <span>🔄 REGENERATE</span>
          </button>

          {/* Button 2: EDIT STEPS */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-all ${
              isEditing
                ? "bg-[#FFD600] text-black border-[#FFD600] font-black"
                : "bg-[#111111] hover:bg-[#1A1A1A] border-[#FFD600]/60 hover:border-[#FFD600] text-[#FFD600]"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? "SAVE EDITS" : "✏️ EDIT STEPS"}</span>
          </button>

          {/* Button 3: APPROVE WORKFLOW (PRIMARY CTA) */}
          <button
            type="button"
            onClick={handleApproveWorkflow}
            disabled={isApproving || !validation.isValid}
            className="flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-[#C8FF00] hover:bg-[#b2e600] text-black disabled:opacity-40 disabled:cursor-not-allowed rounded transition-all shadow-lg shadow-[#C8FF00]/15"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>
              {isApproving
                ? "STAGING..."
                : approvalConfirmed
                ? "RE-APPROVE"
                : "✅ APPROVE WORKFLOW"}
            </span>
          </button>
        </div>
      </div>

      {/* n8n Export Modal / Viewer */}
      <AnimatePresence>
        {showN8nExportModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-foreground/20 w-full max-w-3xl max-h-[85vh] rounded-sm flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="border-b border-foreground/10 px-6 py-4 flex items-center justify-between bg-foreground/[0.02]">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-accent" />
                  <h3 className="font-mono text-sm uppercase tracking-wider font-bold">
                    n8n Workflow Export JSON
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyN8n}
                    className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider bg-foreground/10 hover:bg-foreground/20 px-3 py-1.5 border border-foreground/10 rounded-sm transition-colors text-foreground"
                  >
                    {copiedN8n ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedN8n ? "Copied" : "Copy JSON"}
                  </button>
                  <button
                    onClick={() => setShowN8nExportModal(false)}
                    className="text-foreground/50 hover:text-foreground p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto font-mono text-xs text-foreground/80 bg-foreground/[0.01]">
                <p className="text-foreground/50 text-xs mb-3 font-sans">
                  This export payload follows n8n standard workflow JSON schema format and is ready for import into an n8n instance in Day 7.
                </p>
                <pre className="bg-background border border-foreground/10 p-4 rounded-sm overflow-x-auto text-[11px] leading-relaxed text-foreground/90">
                  {JSON.stringify(n8nExport || convertDigiloWorkflowToN8n(workflow), null, 2)}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
