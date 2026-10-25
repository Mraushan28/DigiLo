import { 
  IntegrationDefinition, 
  CatalogActionDefinition, 
  CatalogTriggerDefinition 
} from "./types";
import { webhookIntegration } from "./integrations/webhook";
import { openaiIntegration } from "./integrations/openai";
import { googleSheetsIntegration } from "./integrations/google-sheets";
import { slackIntegration } from "./integrations/slack";
import { gmailIntegration } from "./integrations/gmail";
import { Workflow } from "@/types/automation";

export * from "./types";

/**
 * Centralized Dynamic Integration Registry
 */
class IntegrationCatalogRegistry {
  private integrations: Map<string, IntegrationDefinition> = new Map();
  private actions: Map<string, CatalogActionDefinition> = new Map();
  private triggers: Map<string, CatalogTriggerDefinition> = new Map();

  constructor() {
    // Register initial core supported integrations
    this.register(webhookIntegration);
    this.register(openaiIntegration);
    this.register(googleSheetsIntegration);
    this.register(slackIntegration);
    this.register(gmailIntegration);
  }

  /**
   * Extensibility hook: Register a new or custom integration into the platform.
   */
  public register(integration: IntegrationDefinition): void {
    this.integrations.set(integration.id, integration);

    // Register triggers
    for (const trigger of integration.triggers) {
      this.triggers.set(trigger.id, trigger);
    }

    // Register actions
    for (const action of integration.actions) {
      this.actions.set(action.id, action);
    }
  }

  public getIntegration(id: string): IntegrationDefinition | undefined {
    return this.integrations.get(id);
  }

  public getAllIntegrations(): IntegrationDefinition[] {
    return Array.from(this.integrations.values());
  }

  public getInstalledIntegrations(): IntegrationDefinition[] {
    return Array.from(this.integrations.values()).filter((i) => i.isImplemented);
  }

  public getAction(actionId: string): CatalogActionDefinition | undefined {
    return this.actions.get(actionId);
  }

  public getAllActions(): CatalogActionDefinition[] {
    return Array.from(this.actions.values());
  }

  public getTrigger(triggerId: string): CatalogTriggerDefinition | undefined {
    return this.triggers.get(triggerId);
  }

  public getAllTriggers(): CatalogTriggerDefinition[] {
    return Array.from(this.triggers.values());
  }

  public isActionSupported(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return false;
    const integration = this.integrations.get(action.requiredIntegration);
    return Boolean(integration?.isImplemented);
  }

  public isTriggerSupported(triggerId: string): boolean {
    return this.triggers.has(triggerId);
  }

  public getActionIds(): string[] {
    return Array.from(this.actions.keys());
  }

  public getTriggerIds(): string[] {
    return Array.from(this.triggers.keys());
  }

  public getActionConfigDefaults(actionId: string): Record<string, string | number | boolean> {
    const action = this.actions.get(actionId);
    if (!action) return {};
    const defaults: Record<string, string | number | boolean> = {};
    for (const field of action.configFields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    }
    return defaults;
  }

  /**
   * Reconciles required integrations dynamically based on workflow trigger and actions.
   */
  public getRequiredIntegrationsForWorkflow(workflow: Partial<Workflow>): string[] {
    const required = new Set<string>();

    if (workflow.trigger?.type === "webhook") {
      required.add("webhook");
    }

    if (Array.isArray(workflow.steps)) {
      for (const step of workflow.steps) {
        if (step?.action) {
          const action = this.actions.get(step.action);
          if (action?.requiredIntegration) {
            required.add(action.requiredIntegration);
          }
        }
      }
    }

    return Array.from(required);
  }

  /**
   * Validates step configuration against the catalog's action schema and execution adapter rules.
   */
  public validateStepConfiguration(
    actionId: string,
    config: Record<string, unknown>
  ): { isValid: boolean; errors: string[] } {
    const action = this.actions.get(actionId);
    if (!action) {
      return { isValid: false, errors: [`Action '${actionId}' is not found in catalog.`] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of action.configFields) {
      if (field.required) {
        const val = config[field.key];
        if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
          errors.push(`Field '${field.label}' is required for action '${action.name}'.`);
        }
      }
    }

    // Run adapter validator if provided
    if (action.executionAdapter.validateConfiguration) {
      const adapterCheck = action.executionAdapter.validateConfiguration(config);
      if (!adapterCheck.isValid) {
        errors.push(...adapterCheck.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Global catalog singleton
export const catalog = new IntegrationCatalogRegistry();
export const catalogRegistry = catalog;

// Export convenience helpers
export const getIntegration = (id: string) => catalog.getIntegration(id);
export const getAllIntegrations = () => catalog.getAllIntegrations();
export const getInstalledIntegrations = () => catalog.getInstalledIntegrations();
export const getAction = (actionId: string) => catalog.getAction(actionId);
export const getAllActions = () => catalog.getAllActions();
export const getTrigger = (triggerId: string) => catalog.getTrigger(triggerId);
export const getAllTriggers = () => catalog.getAllTriggers();
export const isActionSupported = (actionId: string) => catalog.isActionSupported(actionId);
export const isTriggerSupported = (triggerId: string) => catalog.isTriggerSupported(triggerId);
export const getActionIds = () => catalog.getActionIds();
export const getTriggerIds = () => catalog.getTriggerIds();
export const getActionConfigDefaults = (actionId: string) => catalog.getActionConfigDefaults(actionId);
export const getRequiredIntegrationsForWorkflow = (wf: Partial<Workflow>) => catalog.getRequiredIntegrationsForWorkflow(wf);
export const validateStepConfiguration = (actionId: string, cfg: Record<string, unknown>) =>
  catalog.validateStepConfiguration(actionId, cfg);
