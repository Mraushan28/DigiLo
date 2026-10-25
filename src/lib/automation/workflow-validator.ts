import { Workflow, WorkflowValidationError, WorkflowValidationResult } from "@/types/automation";
import { getActionDefinition, isActionSupported, getActionIds } from "./action-registry";
import { TRIGGER_REGISTRY, isTriggerSupported } from "./trigger-registry";
import { getRequiredIntegrationsForWorkflow } from "./catalog";

/**
 * Reconciles the required integrations for a workflow based on its trigger and steps.
 */
export function calculateRequiredIntegrations(workflow: Partial<Workflow>): string[] {
  return getRequiredIntegrationsForWorkflow(workflow);
}

/**
 * Validates the workflow representation thoroughly before editing commits or final approval.
 */
export function validateWorkflow(workflow: Partial<Workflow> | unknown): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];
  const warnings: string[] = [];

  if (!workflow || typeof workflow !== "object") {
    return {
      isValid: false,
      errors: [{ code: "INVALID_OBJECT", message: "Workflow must be a valid object." }]
    };
  }

  const wf = workflow as Partial<Workflow>;

  // 1. Workflow Name & Description
  if (!wf.name || typeof wf.name !== "string" || !wf.name.trim()) {
    errors.push({
      field: "name",
      code: "MISSING_NAME",
      message: "Workflow must have a non-empty name."
    });
  }

  if (!wf.description || typeof wf.description !== "string" || !wf.description.trim()) {
    errors.push({
      field: "description",
      code: "MISSING_DESCRIPTION",
      message: "Workflow must have a non-empty description."
    });
  }

  // 2. Trigger Validation
  if (!wf.trigger) {
    errors.push({
      field: "trigger",
      code: "MISSING_TRIGGER",
      message: "Workflow must have a trigger configured."
    });
  } else {
    if (!wf.trigger.type || !isTriggerSupported(wf.trigger.type)) {
      errors.push({
        field: "trigger.type",
        code: "UNSUPPORTED_TRIGGER",
        message: `Trigger type '${wf.trigger.type}' is unsupported. Allowed triggers: ${TRIGGER_REGISTRY.join(", ")}.`
      });
    }

    if (!wf.trigger.source || typeof wf.trigger.source !== "string" || !wf.trigger.source.trim()) {
      errors.push({
        field: "trigger.source",
        code: "MISSING_TRIGGER_SOURCE",
        message: "Trigger source must be specified (e.g. 'Website Contact Form')."
      });
    }

    if (!wf.trigger.event || typeof wf.trigger.event !== "string" || !wf.trigger.event.trim()) {
      errors.push({
        field: "trigger.event",
        code: "MISSING_TRIGGER_EVENT",
        message: "Trigger event must be specified (e.g. 'lead_submitted')."
      });
    }
  }

  // 3. Action Steps Validation
  if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
    errors.push({
      field: "steps",
      code: "EMPTY_STEPS",
      message: "Workflow must contain at least one action step."
    });
  } else {
    const seenStepIds = new Set<string>();
    let hasAiAnalyzeSeen = false;

    for (let i = 0; i < wf.steps.length; i++) {
      const step = wf.steps[i];
      const stepIndexLabel = `Step ${i + 1}`;

      if (!step || typeof step !== "object") {
        errors.push({
          field: `steps[${i}]`,
          code: "INVALID_STEP",
          message: `${stepIndexLabel} is not a valid step object.`
        });
        continue;
      }

      // Step ID check
      if (!step.id || typeof step.id !== "string" || !step.id.trim()) {
        errors.push({
          field: `steps[${i}].id`,
          stepId: step.id,
          code: "MISSING_STEP_ID",
          message: `${stepIndexLabel} is missing a unique step ID.`
        });
      } else if (seenStepIds.has(step.id)) {
        errors.push({
          field: `steps[${i}].id`,
          stepId: step.id,
          code: "DUPLICATE_STEP_ID",
          message: `Duplicate step ID '${step.id}' detected in workflow.`
        });
      } else {
        seenStepIds.add(step.id);
      }

      // Step Type check
      if (step.type !== "action") {
        errors.push({
          field: `steps[${i}].type`,
          stepId: step.id,
          code: "INVALID_STEP_TYPE",
          message: `${stepIndexLabel} has invalid step type '${step.type}'. Expected 'action'.`
        });
      }

      // Step Action support check
      if (!step.action || typeof step.action !== "string") {
        errors.push({
          field: `steps[${i}].action`,
          stepId: step.id,
          code: "MISSING_STEP_ACTION",
          message: `${stepIndexLabel} has no action specified.`
        });
      } else if (!isActionSupported(step.action)) {
        errors.push({
          field: `steps[${i}].action`,
          stepId: step.id,
          code: "UNSUPPORTED_ACTION",
          message: `The action '${step.action}' in ${stepIndexLabel} is not supported. Supported actions are: ${getActionIds().join(", ")}.`
        });
      } else {
        const def = getActionDefinition(step.action);

        // Required Step Description
        if (!step.description || typeof step.description !== "string" || !step.description.trim()) {
          errors.push({
            field: `steps[${i}].description`,
            stepId: step.id,
            code: "MISSING_STEP_DESCRIPTION",
            message: `${stepIndexLabel} (${def?.name || step.action}) requires a description.`
          });
        }

        // Required Configuration Fields
        if (def && def.configFields) {
          const config = step.config || {};
          for (const field of def.configFields) {
            if (field.required) {
              const val = config[field.key];
              if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
                errors.push({
                  field: `steps[${i}].config.${field.key}`,
                  stepId: step.id,
                  code: "MISSING_REQUIRED_CONFIG",
                  message: `Missing required field '${field.label}' on ${stepIndexLabel} (${def.name}).`
                });
              } else if (val === "YOUR_SPREADSHEET_ID") {
                errors.push({
                  field: `steps[${i}].config.spreadsheet`,
                  stepId: step.id,
                  code: "UNRESOLVED_PLACEHOLDER_SPREADSHEET",
                  message: `Configuration contains unresolved placeholder 'YOUR_SPREADSHEET_ID'. Real spreadsheet selection is required.`
                });
              } else if (val === "YOUR_CHANNEL_ID") {
                errors.push({
                  field: `steps[${i}].config.channel`,
                  stepId: step.id,
                  code: "UNRESOLVED_PLACEHOLDER_CHANNEL",
                  message: `Configuration contains unresolved placeholder 'YOUR_CHANNEL_ID'. Real Slack channel selection is required.`
                });
              }
            }
          }
        }

        // Execution order check:
        // If step is ai.analyze, mark as seen
        if (step.action === "ai.analyze") {
          hasAiAnalyzeSeen = true;
        }

        // If step description or config explicitly depends on AI analysis output,
        // ai.analyze must precede this step!
        const stepContext = `${step.description} ${JSON.stringify(step.config || {})}`.toLowerCase();
        const explicitlyReferencesAi = stepContext.includes("{{ai") || stepContext.includes("ai qualification") || stepContext.includes("ai score") || stepContext.includes("ai summary");

        if (explicitlyReferencesAi && !hasAiAnalyzeSeen && step.action !== "ai.analyze") {
          // Check if ai.analyze exists later in the workflow
          const isAiLater = wf.steps.slice(i + 1).some(s => s.action === "ai.analyze");
          if (isAiLater) {
            errors.push({
              field: `steps[${i}]`,
              stepId: step.id,
              code: "INVALID_EXECUTION_ORDER",
              message: `Invalid execution order: ${stepIndexLabel} (${def?.name}) references AI analysis results before AI analysis has executed.`
            });
          }
        }
      }
    }
  }

  // 4. Required Integrations Validation
  const expectedIntegrations = calculateRequiredIntegrations(wf);
  const declaredIntegrations = new Set(wf.required_integrations || []);

  for (const expected of expectedIntegrations) {
    if (!declaredIntegrations.has(expected)) {
      warnings.push(`Required integration '${expected}' was missing from the integration list and will be synchronized.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
