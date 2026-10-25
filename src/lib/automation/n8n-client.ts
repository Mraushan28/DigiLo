import { Workflow } from "@/types/automation";
import { convertDigiloWorkflowToN8n } from "./n8n-exporter";
import { getAllLiveIntegrationStatuses } from "./integration-status";
import { isMongoConnected } from "@/lib/mongodb/client";
import { ExecutionModel, IStepExecutionResult } from "@/lib/mongodb/models/Execution";
import { getWorkflowById, saveWorkflow } from "./workflow-service";
import { verifyGoogleSheetsDestination } from "./lead-processing";
import { executeWorkflowNative, memoryExecutions, memoryDailyMetrics, maskPII } from "./native-executor";
import { generateWebhookSecret } from "./webhook-security";
import { isActionSupported } from "./action-registry";

export { memoryExecutions, memoryDailyMetrics, maskPII, executeWorkflowNative };

export interface DryRunTestResult {
  executionId: string;
  workflowId: string;
  status: "success" | "failed";
  durationMs: number;
  triggerEvent: {
    source: string;
    event: string;
    redactedSummary: string;
  };
  stepResults: IStepExecutionResult[];
  metricsEffect: {
    leadsIngested: number;
    sheetsRowsWritten: number;
    notificationsDelivered: number;
  };
  allIntegrationsReady: boolean;
  missingIntegrations: string[];
  remediationAdvice?: string;
}

export interface N8nSyncResult {
  isConfigured: boolean;
  n8nWorkflowId?: string;
  isRemoteActive: boolean;
  status: "provisioned" | "unconfigured" | "failed";
  error?: string;
}

/**
 * Checks whether n8n server credentials are configured in server environment.
 * Treats unconfigured placeholder values as unconfigured.
 */
export function isN8nConfigured(): boolean {
  const url = process.env.N8N_API_URL?.trim();
  const key = process.env.N8N_API_KEY?.trim();
  if (!url || !key) return false;
  if (
    url.includes("YOUR-INSTANCE") ||
    url.includes("your-instance") ||
    url.includes("placeholder") ||
    key.includes("YOUR_REAL") ||
    key.includes("your_api_key") ||
    key.includes("placeholder")
  ) {
    return false;
  }
  return true;
}

/**
 * Verifies live connection to the n8n server using configured credentials.
 * Never reports configured unless real API credentials are present and ping succeeds.
 */
export async function verifyN8nConnection(): Promise<{
  isConfigured: boolean;
  isValid: boolean;
  error?: string;
}> {
  if (!isN8nConfigured()) {
    return {
      isConfigured: false,
      isValid: false,
      error: "N8N_API_URL or N8N_API_KEY is missing from server environment.",
    };
  }

  const n8nApiUrl = process.env.N8N_API_URL!;
  const n8nApiKey = process.env.N8N_API_KEY!;

  try {
    const endpoint = `${n8nApiUrl.replace(/\/+$/, "")}/api/v1/workflows?limit=1`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": n8nApiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        isConfigured: true,
        isValid: false,
        error: `n8n server returned ${res.status}: ${errText || res.statusText}`,
      };
    }

    return {
      isConfigured: true,
      isValid: true,
    };
  } catch (err) {
    return {
      isConfigured: true,
      isValid: false,
      error: err instanceof Error ? err.message : "Failed to connect to n8n server.",
    };
  }
}

/**
 * Toggles remote n8n workflow active status if configured.
 */
export async function setRemoteN8nWorkflowActive(
  n8nWorkflowId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isN8nConfigured() || !n8nWorkflowId) {
    return { success: false, error: "n8n not configured or missing workflow ID" };
  }
  const n8nApiUrl = process.env.N8N_API_URL!;
  const n8nApiKey = process.env.N8N_API_KEY!;
  try {
    const endpoint = `${n8nApiUrl.replace(/\/+$/, "")}/api/v1/workflows/${n8nWorkflowId}/${active ? "activate" : "deactivate"}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nApiKey,
      },
    });
    return { success: res.ok };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle n8n workflow" };
  }
}

/**
 * Provisions or updates an n8n workflow definition in the isolated execution engine.
 * Never creates fake mock IDs when unconfigured.
 */
export async function syncWorkflowToN8n(
  workflow: Workflow,
  workspaceId: string
): Promise<N8nSyncResult> {
  if (!isN8nConfigured()) {
    // n8n is not configured in server environment.
    // Strictly truthful: do NOT substitute a mock or staged ID.
    return {
      isConfigured: false,
      n8nWorkflowId: workflow.n8nWorkflowId,
      isRemoteActive: false,
      status: "unconfigured",
      error: "Remote n8n execution engine is unconfigured in server environment (N8N_API_URL / N8N_API_KEY missing). Workflows execute natively via Digilo Native Engine.",
    };
  }

  const n8nApiUrl = process.env.N8N_API_URL!;
  const n8nApiKey = process.env.N8N_API_KEY!;

  const liveIntegrations = await getAllLiveIntegrationStatuses(workspaceId);
  const n8nPayload = convertDigiloWorkflowToN8n(workflow, {
    workspaceId,
    workspaceIntegrations: liveIntegrations,
  });

  try {
    const endpoint = workflow.n8nWorkflowId
      ? `${n8nApiUrl.replace(/\/+$/, "")}/api/v1/workflows/${workflow.n8nWorkflowId}`
      : `${n8nApiUrl.replace(/\/+$/, "")}/api/v1/workflows`;

    const method = workflow.n8nWorkflowId ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nApiKey,
      },
      body: JSON.stringify({
        name: `Digilo-${workspaceId}-${workflow.name}`,
        nodes: n8nPayload.nodes,
        connections: n8nPayload.connections,
        active: false, // Provisioned inactive by default
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        isConfigured: true,
        n8nWorkflowId: data.id || workflow.n8nWorkflowId,
        isRemoteActive: Boolean(data.active),
        status: "provisioned",
      };
    } else {
      const errText = await res.text().catch(() => "");
      return {
        isConfigured: true,
        n8nWorkflowId: workflow.n8nWorkflowId,
        isRemoteActive: false,
        status: "failed",
        error: `n8n server returned ${res.status}: ${errText || res.statusText}`,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error contacting n8n instance";
    return {
      isConfigured: true,
      n8nWorkflowId: workflow.n8nWorkflowId,
      isRemoteActive: false,
      status: "failed",
      error: errorMsg,
    };
  }
}

/**
 * Executes an isolated dry-run test with synthetic or sample payload.
 * Generates per-step execution telemetry, verifies connections, records execution & metrics.
 */
export async function executeDryRunTest(
  workflow: Workflow,
  workspaceId: string,
  samplePayload?: Record<string, unknown>
): Promise<DryRunTestResult> {
  const result = await executeWorkflowNative(workflow, workspaceId, samplePayload);
  return {
    executionId: result.executionId,
    workflowId: result.workflowId,
    status: result.status,
    durationMs: result.durationMs,
    triggerEvent: result.triggerEvent,
    stepResults: result.stepResults,
    metricsEffect: result.metricsEffect,
    allIntegrationsReady: result.allIntegrationsReady,
    missingIntegrations: result.missingIntegrations,
    remediationAdvice: result.remediationAdvice,
  };
}

/**
 * Activates an approved workflow. Enforces that all required integrations are connected.
 */
export async function activateWorkflow(
  workspaceId: string,
  workflowId: string
): Promise<{ success: boolean; workflow: Workflow; message: string }> {
  const workflow = await getWorkflowById(workspaceId, workflowId);
  if (!workflow) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  // Pre-flight check 1: Validate trigger configuration
  if (!workflow.trigger || !workflow.trigger.type) {
    throw new Error("Cannot activate workflow: Trigger configuration is missing.");
  }

  const triggerConfig: Record<string, unknown> = { ...(workflow.trigger.config || {}) };
  let webhookSecret = workflow.webhookSecret;

  if (workflow.trigger.type === "webhook") {
    if (!triggerConfig.webhookSecret && !webhookSecret) {
      webhookSecret = generateWebhookSecret();
      triggerConfig.webhookSecret = webhookSecret;
    } else if (triggerConfig.webhookSecret && !webhookSecret) {
      webhookSecret = triggerConfig.webhookSecret as string;
    }
  } else if (workflow.trigger.type === "schedule") {
    if (!triggerConfig.cron && !triggerConfig.interval) {
      throw new Error(
        "Cannot activate workflow: Schedule trigger requires a valid cron expression or interval configuration."
      );
    }
  }

  // Pre-flight check 2: Validate step actions against Action Registry
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    if (!isActionSupported(step.action)) {
      throw new Error(`Cannot activate workflow: Step ${i + 1} contains unsupported action '${step.action}'.`);
    }
  }

  // Pre-flight check 3: Verify all required integrations are connected
  const liveIntegrations = await getAllLiveIntegrationStatuses(workspaceId);
  const statusMap = new Map(Object.values(liveIntegrations).map((i) => [i.id, i.status]));

  const missing: string[] = [];
  for (const req of workflow.required_integrations) {
    if (req === "webhook" || req === "manual") continue;
    if (statusMap.get(req) !== "connected") {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Cannot activate workflow: The following required integrations are not connected: ${missing.join(", ")}. Please connect them first.`
    );
  }

  // Pre-flight check: Destination verification for Google Sheets
  const sheetsStep = workflow.steps.find((s) => s.action === "google_sheets.add_row");
  if (sheetsStep) {
    const rawSpreadsheet = (sheetsStep.config?.spreadsheet as string) || "Website Leads";
    const rawSheetName = (sheetsStep.config?.sheetName as string) || (rawSpreadsheet.includes("LaunchNest") ? "Leads" : "Sheet1");
    const spreadsheet = rawSpreadsheet.trim();
    const sheetName = rawSheetName.trim();
    const destCheck = await verifyGoogleSheetsDestination(workspaceId, spreadsheet, sheetName);
    if (!destCheck.verified) {
      throw new Error(
        `Cannot activate workflow: Destination '${spreadsheet}' (tab: '${sheetName}') is not verified. ${destCheck.message}`
      );
    }
  }

  // Pre-flight check: Channel verification for Slack
  const slackStep = workflow.steps.find((s) => s.action === "slack.send_message");
  if (slackStep) {
    const rawChannel = (slackStep.config?.channel as string) || "";
    const channel = rawChannel.trim();
    if (!channel || channel === "YOUR_CHANNEL_ID") {
      throw new Error(
        `Cannot activate workflow: Slack channel is set to placeholder 'YOUR_CHANNEL_ID' or is empty. Integration setup is required to configure a valid channel.`
      );
    }
  }

  // Pre-flight check 4: Verify test execution
  let hasSuccessfulTest = false;
  if (isMongoConnected() && workflow.id) {
    const successfulTest = await ExecutionModel.findOne({
      workspaceId,
      workflowId: workflow.id,
      status: "success",
    }).lean();
    if (successfulTest) hasSuccessfulTest = true;
  }
  if (!hasSuccessfulTest) {
    const memTest = memoryExecutions.find(
      (e) => e.workspaceId === workspaceId && e.workflowId === workflow.id && e.status === "success"
    );
    if (memTest) hasSuccessfulTest = true;
  }

  if (!hasSuccessfulTest) {
    throw new Error(
      "Cannot activate workflow: A successful test run is required before live activation. Please run 'Test Workflow' to verify step outputs."
    );
  }

  // Sync to n8n if remote configured (optional)
  let n8nWorkflowId = workflow.n8nWorkflowId;
  if (isN8nConfigured()) {
    const n8nSync = await syncWorkflowToN8n(workflow, workspaceId);
    if (n8nSync.n8nWorkflowId) {
      n8nWorkflowId = n8nSync.n8nWorkflowId;
      await setRemoteN8nWorkflowActive(n8nSync.n8nWorkflowId, true).catch(() => {});
    }
  }

  const updated: Workflow = {
    ...workflow,
    status: "active",
    trigger: {
      ...workflow.trigger,
      config: triggerConfig,
    },
    webhookSecret,
    n8nWorkflowId,
    activatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveWorkflow(workspaceId, updated);

  const message = isN8nConfigured()
    ? "Workflow is now live and actively listening for incoming webhook events (n8n remote engine synced)."
    : "Workflow is now live and actively listening for incoming webhook events via Digilo Native Engine.";

  return {
    success: true,
    workflow: saved,
    message,
  };
}

/**
 * Pauses an active workflow.
 */
export async function pauseWorkflow(
  workspaceId: string,
  workflowId: string
): Promise<{ success: boolean; workflow: Workflow; message: string }> {
  const workflow = await getWorkflowById(workspaceId, workflowId);
  if (!workflow) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  if (workflow.n8nWorkflowId && isN8nConfigured()) {
    await setRemoteN8nWorkflowActive(workflow.n8nWorkflowId, false).catch(() => {});
  }

  const updated: Workflow = {
    ...workflow,
    status: "paused",
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveWorkflow(workspaceId, updated);

  return {
    success: true,
    workflow: saved,
    message: "Workflow paused. Inbound events will not trigger actions until resumed.",
  };
}

/**
 * Manually provisions or retries provisioning an approved workflow into n8n.
 */
export async function provisionN8nWorkflow(
  workspaceId: string,
  workflowId: string
): Promise<{ success: boolean; n8nWorkflowId?: string; status: "provisioned" | "unconfigured" | "failed"; error?: string }> {
  const workflow = await getWorkflowById(workspaceId, workflowId);
  if (!workflow) {
    throw new Error(`Workflow '${workflowId}' not found.`);
  }

  const syncResult = await syncWorkflowToN8n(workflow, workspaceId);

  if (syncResult.status === "provisioned" && syncResult.n8nWorkflowId) {
    const updated: Workflow = {
      ...workflow,
      n8nWorkflowId: syncResult.n8nWorkflowId,
      updatedAt: new Date().toISOString(),
    };
    await saveWorkflow(workspaceId, updated);
    return {
      success: true,
      n8nWorkflowId: syncResult.n8nWorkflowId,
      status: "provisioned",
    };
  }

  return {
    success: false,
    n8nWorkflowId: workflow.n8nWorkflowId,
    status: syncResult.status,
    error: syncResult.error,
  };
}
