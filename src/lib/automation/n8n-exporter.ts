import { Workflow, WorkflowStep, IntegrationStatusInfo } from "@/types/automation";
import { getAction, getTrigger, isActionSupported } from "./catalog";

export type N8nNodePosition = [number, number];

export interface N8nNodeConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: N8nNodePosition;
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  notesInFlow?: boolean;
  notes?: string;
}

export interface N8nWorkflowExport {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: N8nNodeConnection[][] }>;
  active: boolean;
  settings: {
    executionOrder: "v1";
    saveManualExecutions: boolean;
    callerPolicy: "workflowsFromSameOwner";
  };
  meta: {
    templateCredsSetupCompleted?: boolean;
    instanceId?: string;
    generatedBy: "DIGILO AI Automation";
    version: "1.0.0";
    exportedAt: string;
    workspaceId?: string;
    isExecutable: boolean;
    validationStatus?: {
      isValid: boolean;
      issues: string[];
      missingCredentials: string[];
    };
    connectedCredentialsSummary?: Array<{
      provider: string;
      credentialType: string;
      credentialRefId: string;
      displayName: string;
      status: "connected" | "not_connected" | "not_configured" | "expired";
    }>;
  };
}

export interface N8nExportOptions {
  workspaceIntegrations?: Record<string, IntegrationStatusInfo>;
  workspaceId?: string;
}

/**
 * Maps a single Digilo step into an n8n node parameter configuration using the catalog adapter.
 */
function mapStepToN8nParameters(
  step: WorkflowStep,
  integrations?: Record<string, IntegrationStatusInfo>
): Record<string, unknown> {
  const actionDef = getAction(step.action);
  const config = (step.config || {}) as Record<string, unknown>;

  if (actionDef && actionDef.executionAdapter) {
    const accountInfo = integrations?.[actionDef.requiredIntegration]?.account;
    return actionDef.executionAdapter.mapParameters(config, accountInfo);
  }

  return {
    customConfig: config,
    description: step.description
  };
}

/**
 * Resolves client-specific n8n credential references for action nodes.
 * Tokens are NEVER embedded in the workflow JSON; only credential references are provisioned.
 */
function resolveNodeCredentials(
  actionId: string,
  workspaceId?: string,
  integrations?: Record<string, IntegrationStatusInfo>
): Record<string, { id: string; name: string }> | undefined {
  if (!workspaceId || !integrations) return undefined;

  const actionDef = getAction(actionId);
  if (!actionDef || !actionDef.executionAdapter.credentialType) {
    return undefined;
  }

  const integrationId = actionDef.requiredIntegration;
  const integrationStatus = integrations[integrationId];

  if (integrationStatus && integrationStatus.status === "connected") {
    const credType = actionDef.executionAdapter.credentialType;
    const prefix = actionDef.executionAdapter.credentialIdPrefix || "digilo_ws";
    const refId = `${prefix}_${workspaceId}_${integrationId}`;

    const displayName =
      integrationStatus.account?.workspaceName ||
      integrationStatus.account?.name ||
      integrationStatus.account?.email ||
      `${integrationStatus.name} Client`;

    return {
      [credType]: {
        id: refId,
        name: `Digilo Client (${displayName})`
      }
    };
  }

  return undefined;
}

/**
 * Converts a validated Digilo Workflow representation into an n8n compatible workflow JSON.
 * Preserves clean separation and ensures zero real executions at this review/export stage.
 * Attaches client-specific credential references when connected.
 */
export function convertDigiloWorkflowToN8n(
  workflow: Workflow,
  options?: N8nExportOptions
): N8nWorkflowExport {
  const nodes: N8nNode[] = [];
  const connections: Record<string, { main: N8nNodeConnection[][] }> = {};

  const workspaceId = options?.workspaceId;
  const integrations = options?.workspaceIntegrations;

  let currentX = 240;
  const currentY = 300;
  const xSpacing = 280;

  // 1. Create Trigger Node
  const triggerDef = getTrigger(workflow.trigger.type);
  const triggerNodeType = triggerDef?.executionAdapter.n8nNodeType || "n8n-nodes-base.webhook";
  const triggerNodeVersion = triggerDef?.executionAdapter.n8nNodeVersion || 2;
  const triggerParameters = triggerDef
    ? triggerDef.executionAdapter.mapParameters((workflow.trigger.config || {}) as Record<string, unknown>)
    : { path: "digilo-webhook", httpMethod: "POST" };

  const triggerNodeName = triggerDef ? triggerDef.name : "Digilo Trigger";
  const triggerNode: N8nNode = {
    id: "trigger_node_1",
    name: triggerNodeName,
    type: triggerNodeType,
    typeVersion: triggerNodeVersion,
    position: [currentX, currentY],
    parameters: triggerParameters,
    notesInFlow: true,
    notes: `${workflow.trigger.source}: ${workflow.trigger.event}`
  };

  nodes.push(triggerNode);

  // 2. Create Action Nodes
  let previousNodeName = triggerNodeName;
  const connectedCredentialsSummary: Array<{
    provider: string;
    credentialType: string;
    credentialRefId: string;
    displayName: string;
    status: "connected" | "not_connected" | "not_configured" | "expired";
  }> = [];

  workflow.steps.forEach((step, index) => {
    currentX += xSpacing;

    const actionDef = getAction(step.action);
    const nodeType = actionDef?.executionAdapter.n8nNodeType || "n8n-nodes-base.httpRequest";
    const nodeVersion = actionDef?.executionAdapter.n8nNodeVersion || 1;
    const nodeName = step.name || `${actionDef?.name || step.action} (Step ${index + 1})`;
    const nodeCredentials = resolveNodeCredentials(step.action, workspaceId, integrations);

    // Track credential references in summary
    if (actionDef?.executionAdapter.credentialType) {
      const integrationId = actionDef.requiredIntegration;
      const status = integrations?.[integrationId]?.status || "not_connected";
      const credType = actionDef.executionAdapter.credentialType;
      const refId = nodeCredentials?.[credType]?.id || `digilo_ws_${workspaceId || "unassigned"}_${integrationId}`;
      const name = nodeCredentials?.[credType]?.name || `${actionDef.name} Credential`;

      connectedCredentialsSummary.push({
        provider: integrationId,
        credentialType: credType,
        credentialRefId: refId,
        displayName: name,
        status: status as "connected" | "not_connected" | "not_configured" | "expired"
      });
    }

    const actionNode: N8nNode = {
      id: step.id || `step_node_${index + 1}`,
      name: nodeName,
      type: nodeType,
      typeVersion: nodeVersion,
      position: [currentX, currentY],
      parameters: mapStepToN8nParameters(step, integrations),
      credentials: nodeCredentials,
      notesInFlow: true,
      notes: step.description
    };

    nodes.push(actionNode);

    // Connect previous node to this node
    connections[previousNodeName] = {
      main: [
        [
          {
            node: nodeName,
            type: "main",
            index: 0
          }
        ]
      ]
    };

    previousNodeName = nodeName;
  });

  const executability = validateN8nWorkflowExecutability(workflow, options);

  return {
    name: workflow.name,
    nodes,
    connections,
    active: false, // Inactive by default until user connects credentials and activates in n8n
    settings: {
      executionOrder: "v1",
      saveManualExecutions: true,
      callerPolicy: "workflowsFromSameOwner"
    },
    meta: {
      generatedBy: "DIGILO AI Automation",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      workspaceId,
      isExecutable: executability.isExecutable,
      validationStatus: {
        isValid: executability.isValid,
        issues: executability.issues,
        missingCredentials: executability.missingCredentials
      },
      connectedCredentialsSummary: connectedCredentialsSummary.length > 0 ? connectedCredentialsSummary : undefined
    }
  };
}

export interface N8nExecutabilityResult {
  isValid: boolean;
  isExecutable: boolean;
  issues: string[];
  missingCredentials: string[];
}

/**
 * Validates whether an n8n exported workflow is completely valid and ready for execution.
 * Checks node parameters and ensures all required integrations are connected.
 */
export function validateN8nWorkflowExecutability(
  workflow: Workflow,
  options?: N8nExportOptions
): N8nExecutabilityResult {
  const issues: string[] = [];
  const missingCredentials: string[] = [];

  const integrations = options?.workspaceIntegrations;

  if (!workflow.trigger || !workflow.trigger.type) {
    issues.push("Trigger configuration is missing.");
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    issues.push("At least one action step is required.");
  }

  for (const step of workflow.steps || []) {
    if (!isActionSupported(step.action)) {
      issues.push(`Action '${step.action}' does not have a mapped n8n node definition.`);
      continue;
    }

    const actionDef = getAction(step.action);
    if (!actionDef) continue;

    // Check credential requirement
    if (actionDef.executionAdapter.credentialType) {
      const requiredInt = actionDef.requiredIntegration;
      const status = integrations?.[requiredInt]?.status;

      if (status !== "connected") {
        missingCredentials.push(requiredInt);
        issues.push(`Integration '${actionDef.name}' is not connected (${status || "not_connected"}).`);
      }
    }

    // Check step config validity
    if (actionDef.executionAdapter.validateConfiguration) {
      const check = actionDef.executionAdapter.validateConfiguration((step.config || {}) as Record<string, unknown>);
      if (!check.isValid) {
        issues.push(...check.errors);
      }
    }
  }

  const isExecutable = issues.length === 0 && missingCredentials.length === 0;

  return {
    isValid: issues.length === 0,
    isExecutable,
    issues,
    missingCredentials: Array.from(new Set(missingCredentials))
  };
}

/**
 * Validates structural export compatibility.
 */
export function validateN8nExportCompatibility(workflow: Workflow): { isCompatible: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!workflow.trigger || !workflow.trigger.type) {
    issues.push("Trigger configuration is missing.");
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    issues.push("At least one action step is required for n8n export.");
  }

  for (const step of workflow.steps || []) {
    if (!isActionSupported(step.action)) {
      issues.push(`Action '${step.action}' does not have a mapped n8n node definition.`);
    }
    if (step.config?.spreadsheet === "YOUR_SPREADSHEET_ID") {
      issues.push("Unresolved placeholder 'YOUR_SPREADSHEET_ID' detected in Google Sheets step. Real spreadsheet setup required.");
    }
    if (step.config?.channel === "YOUR_CHANNEL_ID") {
      issues.push("Unresolved placeholder 'YOUR_CHANNEL_ID' detected in Slack step. Real Slack channel setup required.");
    }
  }

  return {
    isCompatible: issues.length === 0,
    issues
  };
}
