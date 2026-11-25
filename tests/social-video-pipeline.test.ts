/**
 * Automated Test Suite for DIGILO Social Media Video & Digital Marketing Automation Pipeline
 * 
 * Verifies:
 * 1. Catalog registration of social_video integration, triggers, and actions.
 * 2. Zero-cost free development sandbox mode for instant testing without paid credentials.
 * 3. Execution of social_video.generate_script: viral hook, scene descriptions, voiceover script, and hashtags.
 * 4. Execution of social_video.generate_voiceover: studio speech synthesis, voice personas, and word-by-word caption timing.
 * 5. Execution of social_video.render_video: 9:16 vertical MP4 video template rendering with dynamic captions track.
 * 6. Execution of social_video.publish_post: multi-channel sequential publishing across YouTube Shorts, Instagram Reels, TikTok, and LinkedIn.
 * 7. End-to-end execution of the complete 4-step video creation pipeline through executeWorkflowNative.
 * 8. Dry-run testing and activation readiness in free sandbox mode.
 */

import assert from "node:assert/strict";
import { getIntegration, getAction, getTrigger, isActionSupported } from "../src/lib/automation/catalog";
import { resolveIntegrationStatus, getLiveIntegrationStatusForWorkspace } from "../src/lib/automation/integration-status";
import { executeWorkflowNative } from "../src/lib/automation/native-executor";
import { executeDryRunTest, activateWorkflow } from "../src/lib/automation/n8n-client";
import { saveWorkflow } from "../src/lib/automation/workflow-service";
import { Workflow } from "../src/types/automation";

async function runSocialVideoTests() {
  console.log("=== DIGILO SOCIAL VIDEO & DIGITAL MARKETING AUTOMATION TEST SUITE ===\n");
  let passedCount = 0;
  let totalCount = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Catalog Registration
  await test("1.1 social_video integration is registered with triggers and actions in dynamic catalog", () => {
    const integration = getIntegration("social_video");
    assert.ok(integration, "social_video integration must be registered");
    assert.equal(integration.category, "Content & Social Media");
    assert.equal(integration.isImplemented, true);

    const trigger = getTrigger("social_video.schedule_trigger");
    assert.ok(trigger, "social_video.schedule_trigger must be registered");

    assert.ok(isActionSupported("social_video.generate_script"), "generate_script must be supported");
    assert.ok(isActionSupported("social_video.generate_voiceover"), "generate_voiceover must be supported");
    assert.ok(isActionSupported("social_video.render_video"), "render_video must be supported");
    assert.ok(isActionSupported("social_video.publish_post"), "publish_post must be supported");
  });

  // 2. Free Development & Testing Sandbox Mode
  await test("2.1 Free development sandbox mode reports connected status out-of-the-box", async () => {
    const statusInfo = resolveIntegrationStatus("social_video");
    assert.equal(statusInfo.status, "connected");
    assert.ok(statusInfo.statusLabel.includes("Connected"));

    const liveStatus = await getLiveIntegrationStatusForWorkspace("social_video", "ws_test_free_sandbox");
    assert.equal(liveStatus.status, "connected");
  });

  // 3. Script Generation
  await test("3.1 social_video.generate_script generates viral hook, scene breakdown, and hashtags", async () => {
    const testWorkflow: Workflow = {
      id: "wf_test_script_only",
      name: "Video Script Test",
      description: "Generates script only",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Content Automation Scheduler",
        event: "scheduled_video_generation"
      },
      steps: [
        {
          id: "step_script",
          type: "action",
          name: "Generate Video Script (ChatGPT)",
          action: "social_video.generate_script",
          description: "Generates viral video script",
          config: {
            topic: "5 AI Automations that 10x Business Revenue in 2026",
            format: "short_form_9_16",
            tone: "engaging_educational"
          }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const report = await executeWorkflowNative(testWorkflow, "ws_test_social");
    assert.equal(report.status, "success");
    assert.equal(report.stepResults.length, 2); // trigger + step_script
    
    const scriptStep = report.stepResults[1];
    assert.equal(scriptStep.status, "success");
    assert.ok(scriptStep.outputSummary);
    
    const scriptOutput = scriptStep.outputSummary as Record<string, unknown>;
    assert.ok(scriptOutput.title, "Script output must have title");
    assert.ok(scriptOutput.hook, "Script output must have viral hook");
    assert.ok(Array.isArray(scriptOutput.scenes), "Script output must have scenes array");
    assert.ok(scriptOutput.fullScript, "Script output must have fullScript");
    assert.ok(Array.isArray(scriptOutput.hashtags), "Script output must have hashtags");
    assert.ok(report.context.script, "Execution context must store script");
  });

  // 4. Voiceover Synthesis & Word Timings
  await test("4.1 social_video.generate_voiceover produces studio audio URL and word timestamps for captions", async () => {
    const testWorkflow: Workflow = {
      id: "wf_test_voiceover",
      name: "Voiceover Test",
      description: "Generates voiceover audio",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Content Automation Scheduler",
        event: "scheduled_video_generation"
      },
      steps: [
        {
          id: "step_vo",
          type: "action",
          name: "Generate AI Voiceover",
          action: "social_video.generate_voiceover",
          description: "Synthesizes voiceover speech",
          config: {
            voice: "onyx",
            language: "en-US",
            text: "Automation is the key to scaling your enterprise without hiring hundreds of reps."
          }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const report = await executeWorkflowNative(testWorkflow, "ws_test_social");
    assert.equal(report.status, "success");
    
    const voStep = report.stepResults[1];
    assert.equal(voStep.status, "success");
    
    const voOutput = voStep.outputSummary as Record<string, unknown>;
    assert.ok(typeof voOutput.audioUrl === "string" && voOutput.audioUrl.endsWith(".mp3"), "Must return MP3 audio URL");
    assert.equal(voOutput.voice, "onyx");
    assert.ok(Array.isArray(voOutput.wordTimings), "Must include wordTimings array");
    assert.ok((voOutput.wordTimings as unknown[]).length > 0, "Must have timing records for captions");
  });

  // 5. Video Rendering from Motion Template
  await test("5.1 social_video.render_video produces 9:16 vertical MP4 video with kinetic captions track", async () => {
    const testWorkflow: Workflow = {
      id: "wf_test_render",
      name: "Video Render Test",
      description: "Renders vertical template video",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Content Automation Scheduler",
        event: "scheduled_video_generation"
      },
      steps: [
        {
          id: "step_render",
          type: "action",
          name: "Render Video from Template",
          action: "social_video.render_video",
          description: "Renders 9:16 template video",
          config: {
            templateStyle: "dark_terminal_modern",
            aspectRatio: "9:16",
            subtitles: "animated_captions"
          }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const report = await executeWorkflowNative(testWorkflow, "ws_test_social");
    assert.equal(report.status, "success");

    const renderStep = report.stepResults[1];
    assert.equal(renderStep.status, "success");

    const renderOutput = renderStep.outputSummary as Record<string, unknown>;
    assert.ok(typeof renderOutput.videoUrl === "string" && renderOutput.videoUrl.endsWith(".mp4"), "Must return MP4 video URL");
    assert.equal(renderOutput.aspectRatio, "9:16");
    assert.equal(renderOutput.resolution, "1080x1920");
    assert.equal(renderOutput.fps, 60);
    assert.equal(renderOutput.subtitlesBurnedIn, true);
    assert.ok(Array.isArray(renderOutput.visualLayers), "Must detail rendered visual layers");
  });

  // 6. Multi-Platform Social Media Publishing
  await test("6.1 social_video.publish_post publishes in sequence to YouTube Shorts, Instagram Reels, TikTok, and LinkedIn", async () => {
    const testWorkflow: Workflow = {
      id: "wf_test_publish",
      name: "Social Publishing Test",
      description: "Publishes to all channels",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Content Automation Scheduler",
        event: "scheduled_video_generation"
      },
      steps: [
        {
          id: "step_pub",
          type: "action",
          name: "Auto-Publish to Social Media",
          action: "social_video.publish_post",
          description: "Publishes to social channels",
          config: {
            channels: "all_channels",
            publishingMode: "publish_immediately",
            hashtags: "#AI #Automation #Digilo #Growth"
          }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const report = await executeWorkflowNative(testWorkflow, "ws_test_social");
    assert.equal(report.status, "success");

    const pubStep = report.stepResults[1];
    assert.equal(pubStep.status, "success");

    const pubOutput = pubStep.outputSummary as Record<string, unknown>;
    assert.equal(pubOutput.status, "published");
    assert.equal(pubOutput.totalChannelsDelivered, 4);

    const posts = pubOutput.posts as Array<{ platform: string; postUrl: string; status: string }>;
    assert.equal(posts.length, 4);
    assert.ok(posts.some((p) => p.platform === "youtube_shorts" && p.postUrl.includes("youtube.com/shorts")));
    assert.ok(posts.some((p) => p.platform === "instagram_reels" && p.postUrl.includes("instagram.com/reel")));
    assert.ok(posts.some((p) => p.platform === "tiktok" && p.postUrl.includes("tiktok.com")));
    assert.ok(posts.some((p) => p.platform === "linkedin" && p.postUrl.includes("linkedin.com")));
  });

  // 7. Full 4-Step End-to-End Sequential Pipeline
  await test("7.1 Full 4-step pipeline executes sequentially with context passing from Script -> Audio -> Video -> Publish", async () => {
    const fullPipelineWorkflow: Workflow = {
      id: "wf_full_social_video_pipeline",
      name: "END-TO-END VIRAL VIDEO AUTOMATION PIPELINE",
      description: "Generates script with ChatGPT, synthesizes voiceover audio, renders vertical 9:16 video with animated captions, and publishes sequentially to YouTube Shorts and Instagram Reels.",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Daily Content Scheduler",
        event: "scheduled_video_generation",
        config: {
          topic: "How Small Businesses Save $5,000/mo With Zero-Code AI Workflows"
        }
      },
      steps: [
        {
          id: "step_1_script",
          type: "action",
          name: "Generate Video Script (ChatGPT)",
          action: "social_video.generate_script",
          description: "Generates script with hook",
          config: {
            topic: "How Small Businesses Save $5,000/mo With Zero-Code AI Workflows",
            format: "short_form_9_16",
            tone: "engaging_educational"
          }
        },
        {
          id: "step_2_voiceover",
          type: "action",
          name: "Generate AI Voiceover",
          action: "social_video.generate_voiceover",
          description: "Voiceover synthesis",
          config: {
            voice: "alloy",
            language: "en-US"
          }
        },
        {
          id: "step_3_render",
          type: "action",
          name: "Render Video from Template",
          action: "social_video.render_video",
          description: "Renders 9:16 template video",
          config: {
            templateStyle: "dark_terminal_modern",
            aspectRatio: "9:16",
            subtitles: "animated_captions"
          }
        },
        {
          id: "step_4_publish",
          type: "action",
          name: "Auto-Publish to Social Media",
          action: "social_video.publish_post",
          description: "Publishes to YouTube and Instagram",
          config: {
            channels: "youtube_instagram",
            publishingMode: "publish_immediately",
            hashtags: "#AIAutomation #SmallBusiness #Productivity #Digilo"
          }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const report = await executeWorkflowNative(fullPipelineWorkflow, "ws_video_e2e");
    assert.equal(report.status, "success");
    assert.equal(report.stepResults.length, 5); // trigger + 4 steps
    assert.ok(report.stepResults.every((s) => s.status === "success"));

    // Verify context propagation
    assert.ok(report.context.script, "context.script must be populated");
    assert.ok(report.context.voiceover, "context.voiceover must be populated");
    assert.ok(report.context.video, "context.video must be populated");
    assert.ok(report.context.publishing, "context.publishing must be populated");

    // Verify video URL is valid
    const videoData = report.context.video as Record<string, unknown>;
    assert.ok((videoData.videoUrl as string).includes("assets.digilo.space/rendered"));
    assert.equal(videoData.resolution, "1080x1920");

    // Verify publishing data matches channels
    const pubData = report.context.publishing as Record<string, unknown>;
    assert.equal(pubData.totalChannelsDelivered, 2);
  });

  // 8. Dry-Run Testing & Activation in Sandbox Mode
  await test("8.1 Dry-run test succeeds and enables activation for social video workflow", async () => {
    const wsId = "ws_test_activation_video";
    const activationWorkflow: Workflow = {
      id: "wf_activation_video_01",
      name: "Social Video Automated Pipeline",
      description: "Automated video pipeline ready for activation",
      status: "draft",
      trigger: {
        type: "schedule",
        source: "Content Scheduler",
        event: "scheduled_video_generation",
        config: {
          interval: "every_day"
        }
      },
      steps: [
        {
          id: "step_script",
          type: "action",
          name: "Generate Video Script",
          action: "social_video.generate_script",
          description: "Script generation step",
          config: { topic: "AI Growth Hacks" }
        },
        {
          id: "step_render",
          type: "action",
          name: "Render Video",
          action: "social_video.render_video",
          description: "Video render step",
          config: { templateStyle: "dark_terminal_modern" }
        }
      ],
      required_integrations: ["social_video"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveWorkflow(wsId, activationWorkflow);

    // 1. Dry run test executes
    const testResult = await executeDryRunTest(activationWorkflow, wsId);
    assert.equal(testResult.status, "success", "Dry run must succeed");
    assert.equal(testResult.allIntegrationsReady, true, "Integrations must be ready in sandbox");

    // 2. Activation succeeds
    const activateResult = await activateWorkflow(wsId, activationWorkflow.id!);
    assert.equal(activateResult.success, true);
    assert.equal(activateResult.workflow.status, "active");
  });

  console.log("\n========================================");
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} tests passed.`);
  console.log("========================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSocialVideoTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
