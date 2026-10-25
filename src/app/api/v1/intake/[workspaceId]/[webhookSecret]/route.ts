import { NextResponse } from "next/server";
import { listWorkflows } from "@/lib/automation/workflow-service";
import { executeWorkflowNative } from "@/lib/automation/native-executor";
import { resolveIdempotencyKey, memoryIdempotencyStore, InboundLeadSchema } from "@/lib/automation/lead-processing";
import {
  MAX_WEBHOOK_PAYLOAD_BYTES,
  checkTenantRateLimit,
  verifyWebhookSecret,
} from "@/lib/automation/webhook-security";
import { connectToDatabase, isMongoConnected } from "@/lib/mongodb/client";
import { IdempotencyModel, IIdempotencyRecord } from "@/lib/mongodb/models/Idempotency";
import crypto from "node:crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; webhookSecret: string }> }
) {
  try {
    const { workspaceId, webhookSecret } = await params;

    if (!workspaceId || !webhookSecret || typeof workspaceId !== "string" || typeof webhookSecret !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid intake endpoint parameters." },
        { status: 400 }
      );
    }

    // 1. Rate Limiting Check (per tenant/workspace)
    const rateLimit = checkTenantRateLimit(workspaceId, 60, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Too many requests for this workspace.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Request Body Size Limits (1MB maximum)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_WEBHOOK_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload too large. Webhook requests must not exceed 1 MB." },
        { status: 413 }
      );
    }

    const rawBody = await req.text().catch(() => "");
    if (Buffer.byteLength(rawBody, "utf-8") > MAX_WEBHOOK_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload too large. Webhook requests must not exceed 1 MB." },
        { status: 413 }
      );
    }

    let payload: Record<string, unknown> = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON payload." },
          { status: 400 }
        );
      }
    }

    // 3. Workspace Workflow Lookup
    const workflows = await listWorkflows(workspaceId);
    const activeWorkflow = workflows.find(
      (w) => w.status === "active" && w.trigger.type === "webhook"
    );

    if (!activeWorkflow) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SETUP_REQUIRED",
            message:
              "Setup Required: No active webhook workflow is currently enabled for this workspace. Workflow must be configured and activated before webhook intake can accept live events.",
          },
          status: "setup_required",
        },
        { status: 400 }
      );
    }

    // 4. Secure Constant-Time Webhook Secret Comparison
    const expectedSecret =
      (activeWorkflow.trigger?.config?.webhookSecret as string) || activeWorkflow.webhookSecret;
    const isValidSecret = verifyWebhookSecret(webhookSecret, expectedSecret, activeWorkflow.id);

    if (!isValidSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid webhook secret for this workspace.",
        },
        { status: 401 }
      );
    }

    // 5. Idempotency Check with MongoDB (24-Hour TTL) + Memory Store Fallback
    const idempotencyHeader = req.headers.get("x-idempotency-key") || req.headers.get("x-submission-id");
    const { submissionId, idempotencyKey } = resolveIdempotencyKey(payload, idempotencyHeader);

    await connectToDatabase();

    let existingRecord: IIdempotencyRecord | null = null;
    if (isMongoConnected()) {
      existingRecord = await IdempotencyModel.findOne({ workspaceId, idempotencyKey });
    }
    const memCached = memoryIdempotencyStore.get(`${workspaceId}:${submissionId}`);

    // If duplicate has already completed, return existing result without duplicate side-effects
    if (existingRecord?.status === "completed" || (memCached && memCached.status === "completed")) {
      const cachedResponse = (existingRecord?.responsePayload as Record<string, unknown>) || {
        success: true,
        message: "Duplicate submission ignored; lead was already processed.",
        submissionId,
        idempotencyKey,
        executionId: existingRecord?.executionId || memCached?.executionId,
      };

      return NextResponse.json({
        ...cachedResponse,
        isDuplicate: true,
        timestamp: new Date().toISOString(),
      });
    }

    // If a request with this idempotency key is currently processing, prevent duplicate concurrent runs
    if (existingRecord?.status === "processing" || (memCached && memCached.status === "processing")) {
      return NextResponse.json(
        {
          success: false,
          error: "Concurrent duplicate request in progress. Please retry after initial request completes.",
          submissionId,
          idempotencyKey,
        },
        { status: 409 }
      );
    }

    // Claim idempotency slot
    const executionId = `exec_nat_${crypto.randomUUID().slice(0, 16)}`;
    if (isMongoConnected()) {
      try {
        await IdempotencyModel.create({
          workspaceId,
          submissionId,
          idempotencyKey,
          workflowId: activeWorkflow.id,
          status: "processing",
          executionId,
        });
      } catch (dupErr: unknown) {
        // Handle race conditions where another thread inserted the record at the exact same time
        if (typeof dupErr === "object" && dupErr !== null && "code" in dupErr && (dupErr as { code: number }).code === 11000) {
          return NextResponse.json(
            {
              success: false,
              error: "Concurrent duplicate request in progress. Please retry after initial request completes.",
              submissionId,
              idempotencyKey,
            },
            { status: 409 }
          );
        }
      }
    }

    memoryIdempotencyStore.set(`${workspaceId}:${submissionId}`, {
      workspaceId,
      submissionId,
      idempotencyKey,
      status: "processing",
      executionId,
      startedAt: new Date(),
      stepResults: [],
      slackNotificationStatus: "pending",
      sheetsRowStatus: "pending",
      retryCount: 0,
    });

    // 6. Validate Payload Schema against InboundLeadSchema
    const leadParse = InboundLeadSchema.safeParse(payload);
    if (!leadParse.success) {
      if (isMongoConnected()) {
        await IdempotencyModel.updateOne(
          { workspaceId, idempotencyKey },
          { status: "failed" }
        ).catch(() => {});
      }
      memoryIdempotencyStore.set(`${workspaceId}:${submissionId}`, {
        workspaceId,
        submissionId,
        idempotencyKey,
        status: "failed",
        executionId,
        startedAt: new Date(),
        completedAt: new Date(),
        stepResults: [],
        slackNotificationStatus: "skipped",
        sheetsRowStatus: "skipped",
        retryCount: 0,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_VALIDATION_FAILED",
            message: `Inbound webhook payload validation failed: ${leadParse.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(", ")}`,
            details: leadParse.error.issues,
          },
          submissionId,
          idempotencyKey,
        },
        { status: 400 }
      );
    }

    // 7. Execute Native Workflow Pipeline
    const testPayload = {
      submissionId,
      idempotencyKey,
      leadId: submissionId,
      ...payload,
      ingestedAt: new Date().toISOString(),
    };

    const execution = await executeWorkflowNative(activeWorkflow, workspaceId, testPayload);

    const isSuccess = execution.status === "success";
    const responsePayload = {
      success: isSuccess,
      message: isSuccess
        ? "Lead received and processed through workflow pipeline."
        : `Workflow execution failed: ${execution.errorMessage || "Step error encountered."}`,
      leadId: submissionId,
      submissionId,
      workflowId: activeWorkflow.id,
      executionId: execution.executionId,
      executionStatus: execution.status,
      timestamp: new Date().toISOString(),
    };

    // 8. Finalize Idempotency Record
    if (isMongoConnected()) {
      await IdempotencyModel.updateOne(
        { workspaceId, idempotencyKey },
        {
          status: isSuccess ? "completed" : "failed",
          executionId: execution.executionId,
          responsePayload,
        }
      ).catch(() => {});
    }

    memoryIdempotencyStore.set(`${workspaceId}:${submissionId}`, {
      workspaceId,
      submissionId,
      idempotencyKey,
      status: isSuccess ? "completed" : "failed",
      executionId: execution.executionId,
      startedAt: new Date(),
      completedAt: new Date(),
      stepResults: execution.stepResults,
      slackNotificationStatus: execution.metricsEffect.notificationsDelivered > 0 ? "sent" : "skipped",
      sheetsRowStatus: execution.metricsEffect.sheetsRowsWritten > 0 ? "appended" : "skipped",
      retryCount: 0,
    });

    return NextResponse.json(responsePayload, {
      status: isSuccess ? 200 : 400,
    });
  } catch (error) {
    console.error("[Intake Webhook] Internal server error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during lead ingestion." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "DIGILO Lead Intake Webhook Gateway",
    documentation: "Send HTTP POST with JSON body to ingest leads securely.",
  });
}
