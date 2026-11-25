import { IntegrationDefinition } from "../types";
import { z } from "zod";

export const socialVideoIntegration: IntegrationDefinition = {
  id: "social_video",
  name: "Social Video & Media Automation",
  category: "Content & Social Media",
  description: "End-to-end automated video creation pipeline: AI scriptwriting, voiceover generation, template video rendering, and multi-channel social posting.",
  auth: {
    type: "api_key",
    envKeys: ["OPENAI_API_KEY", "YOUTUBE_API_KEY", "META_ACCESS_TOKEN"]
  },
  isImplemented: true,
  setupGuide: {
    overview: "Powers end-to-end video generation and auto-upload sequences across YouTube Shorts, Instagram Reels, TikTok, and LinkedIn.",
    steps: [
      "Configure your OpenAI / AI inference key for script and speech generation.",
      "Optionally connect YouTube Data API v3 (free) and Meta Graph API for automated uploads.",
      "Test in Digilo's sandbox using zero-cost dry runs before live scheduling."
    ]
  },
  triggers: [
    {
      id: "schedule",
      name: "Scheduled Content Trigger",
      description: "Triggers automated video generation on a recurring schedule or content calendar timer.",
      requiredIntegration: "social_video",
      defaultSource: "Content Automation Scheduler",
      defaultEvent: "scheduled_video_generation",
      executionAdapter: {
        n8nNodeType: "n8n-nodes-base.cron",
        n8nNodeVersion: 1,
        mapParameters: (triggerConfig) => ({
          triggerTimes: {
            item: [
              {
                mode: (triggerConfig.mode as string) || "everyDay",
                hour: 10,
                minute: 0
              }
            ]
          }
        })
      }
    },
    {
      id: "social_video.schedule_trigger",
      name: "Content Schedule Trigger",
      description: "Triggers automated video generation on a recurring schedule (e.g. daily at 10 AM) or content calendar event.",
      requiredIntegration: "social_video",
      defaultSource: "Content Automation Scheduler",
      defaultEvent: "scheduled_video_generation",
      executionAdapter: {
        n8nNodeType: "n8n-nodes-base.cron",
        n8nNodeVersion: 1,
        mapParameters: (triggerConfig) => ({
          triggerTimes: {
            item: [
              {
                mode: (triggerConfig.mode as string) || "everyDay",
                hour: 10,
                minute: 0
              }
            ]
          }
        })
      }
    }
  ],
  actions: [
    {
      id: "social_video.generate_script",
      name: "Generate Video Script (ChatGPT)",
      description: "Uses OpenAI / ChatGPT to generate viral, hook-driven video scripts formatted for short-form (Reels/Shorts/TikTok) or long-form video.",
      requiredIntegration: "social_video",
      inputSchema: z.object({
        topic: z.string().min(1, "Topic is required"),
        format: z.string().optional(),
        tone: z.string().optional()
      }),
      configFields: [
        {
          key: "topic",
          label: "Video Topic or Source Content",
          type: "textarea",
          required: true,
          placeholder: "e.g. Top 3 AI automations every small business needs in 2026 to save 20 hours a week",
          defaultValue: "Top 3 AI automations every business needs to save 20 hours a week"
        },
        {
          key: "format",
          label: "Video Format",
          type: "select",
          required: false,
          defaultValue: "short_form_9_16",
          options: [
            { label: "Short-Form (9:16 Vertical — Reels / Shorts / TikTok)", value: "short_form_9_16" },
            { label: "Long-Form (16:9 Landscape — YouTube / LinkedIn)", value: "long_form_16_9" }
          ]
        },
        {
          key: "tone",
          label: "Content Style & Hook Tone",
          type: "select",
          required: false,
          defaultValue: "engaging_educational",
          options: [
            { label: "Engaging & Educational", value: "engaging_educational" },
            { label: "Viral Curiosity Hook", value: "viral_curiosity" },
            { label: "Storytelling & Case Study", value: "storytelling" },
            { label: "Direct Promotional CTA", value: "promotional" }
          ]
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.openAi",
        n8nNodeVersion: 1,
        mapParameters: (stepConfig) => ({
          resource: "chat",
          operation: "complete",
          model: "gpt-4o",
          messages: {
            values: [
              {
                role: "system",
                content: "You are a professional social media video producer. Output structured JSON with hook, voiceover script, visual cues, and caption tags."
              },
              {
                role: "user",
                content: `Write a viral video script on topic: ${stepConfig.topic || "Business Automation"}. Format: ${stepConfig.format || "9:16 vertical"}. Tone: ${stepConfig.tone || "engaging"}.`
              }
            ]
          }
        }),
        validateConfiguration: (stepConfig) => {
          const errors: string[] = [];
          if (!stepConfig.topic || typeof stepConfig.topic !== "string" || !stepConfig.topic.trim()) {
            errors.push("Video Script step requires a topic or content description.");
          }
          return { isValid: errors.length === 0, errors };
        }
      }
    },
    {
      id: "social_video.generate_voiceover",
      name: "Generate AI Voiceover (Audio Engine)",
      description: "Converts the video script into studio-quality voiceover audio with natural cadence and timing.",
      requiredIntegration: "social_video",
      inputSchema: z.object({
        voice: z.string().optional(),
        speed: z.number().optional()
      }),
      configFields: [
        {
          key: "voice",
          label: "Voice Actor / Persona",
          type: "select",
          required: false,
          defaultValue: "alloy",
          options: [
            { label: "Alloy (Neutral & Authoritative)", value: "alloy" },
            { label: "Echo (Energetic & Dynamic)", value: "echo" },
            { label: "Fable (British Storyteller)", value: "fable" },
            { label: "Onyx (Deep Corporate Voice)", value: "onyx" },
            { label: "Nova (Warm & Friendly)", value: "nova" },
            { label: "Shimmer (Clear & Conversational)", value: "shimmer" }
          ]
        },
        {
          key: "language",
          label: "Narration Language",
          type: "select",
          required: false,
          defaultValue: "en-US",
          options: [
            { label: "English (US / Global)", value: "en-US" },
            { label: "English (Indian Accent)", value: "en-IN" },
            { label: "Hindi (हिन्दी)", value: "hi-IN" }
          ]
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.httpRequest",
        n8nNodeVersion: 1,
        mapParameters: (stepConfig) => ({
          url: "https://api.openai.com/v1/audio/speech",
          method: "POST",
          body: {
            model: "tts-1",
            voice: stepConfig.voice || "alloy"
          }
        }),
        validateConfiguration: () => ({ isValid: true, errors: [] })
      }
    },
    {
      id: "social_video.render_video",
      name: "Render Video from Template",
      description: "Assembles voiceover audio, auto-captions with word-by-word highlight, background visuals, and branded motion template into a finished MP4 video.",
      requiredIntegration: "social_video",
      inputSchema: z.object({
        templateStyle: z.string().optional(),
        subtitlesEnabled: z.boolean().optional(),
        brandLogo: z.string().optional()
      }),
      configFields: [
        {
          key: "templateStyle",
          label: "Visual Template Theme",
          type: "select",
          required: false,
          defaultValue: "dark_terminal_modern",
          options: [
            { label: "Dark Terminal / Neon Tech (Digilo Signature)", value: "dark_terminal_modern" },
            { label: "Clean Minimalist Business", value: "clean_minimalist" },
            { label: "Bold Kinetic Typography (Hormozi Style)", value: "kinetic_typography" },
            { label: "Podcast / Waveform Overlay", value: "podcast_waveform" }
          ]
        },
        {
          key: "aspectRatio",
          label: "Aspect Ratio",
          type: "select",
          required: false,
          defaultValue: "9:16",
          options: [
            { label: "9:16 Vertical (Reels / Shorts / TikTok)", value: "9:16" },
            { label: "16:9 Landscape (YouTube / Desktop)", value: "16:9" },
            { label: "1:1 Square (Feed Posts / LinkedIn)", value: "1:1" }
          ]
        },
        {
          key: "subtitles",
          label: "Subtitles / Captions",
          type: "select",
          required: false,
          defaultValue: "animated_captions",
          options: [
            { label: "Animated Word-by-Word Captions (High Retention)", value: "animated_captions" },
            { label: "Standard Subtitle Bar", value: "standard_subtitles" },
            { label: "No Subtitles", value: "none" }
          ]
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.httpRequest",
        n8nNodeVersion: 1,
        mapParameters: (stepConfig) => ({
          url: "https://api.digilo.space/api/v1/video/render",
          method: "POST",
          body: {
            template: stepConfig.templateStyle || "dark_terminal_modern",
            aspectRatio: stepConfig.aspectRatio || "9:16",
            subtitles: stepConfig.subtitles || "animated_captions"
          }
        }),
        validateConfiguration: () => ({ isValid: true, errors: [] })
      }
    },
    {
      id: "social_video.publish_post",
      name: "Auto-Publish to Social Media Sequence",
      description: "Sequentially uploads and publishes the finished video to YouTube Shorts, Instagram Reels, TikTok, and LinkedIn with automated titles, descriptions, and hashtags.",
      requiredIntegration: "social_video",
      inputSchema: z.object({
        destinations: z.array(z.string()).optional(),
        scheduleDelayMinutes: z.number().optional()
      }),
      configFields: [
        {
          key: "channels",
          label: "Target Social Media Channels",
          type: "select",
          required: true,
          defaultValue: "youtube_instagram",
          options: [
            { label: "YouTube Shorts + Instagram Reels", value: "youtube_instagram" },
            { label: "All Channels (YouTube Shorts, Instagram, TikTok, LinkedIn)", value: "all_channels" },
            { label: "YouTube Shorts Only", value: "youtube_only" },
            { label: "Instagram Reels Only", value: "instagram_only" },
            { label: "LinkedIn Video Only", value: "linkedin_only" }
          ]
        },
        {
          key: "publishingMode",
          label: "Publishing Strategy",
          type: "select",
          required: false,
          defaultValue: "publish_immediately",
          options: [
            { label: "Publish Immediately", value: "publish_immediately" },
            { label: "Schedule for Optimal Peak Time", value: "schedule_peak_time" },
            { label: "Save as Draft for Approval", value: "draft_for_approval" }
          ]
        },
        {
          key: "hashtags",
          label: "Default Hashtags / Tags",
          type: "text",
          required: false,
          placeholder: "#Automation #AI #Tech #SmallBusiness #Productivity",
          defaultValue: "#Automation #AI #Tech #SmallBusiness #Productivity"
        }
      ],
      executionAdapter: {
        engine: "n8n",
        n8nNodeType: "n8n-nodes-base.httpRequest",
        n8nNodeVersion: 1,
        mapParameters: (stepConfig) => ({
          url: "https://api.digilo.space/api/v1/social/publish",
          method: "POST",
          body: {
            channels: stepConfig.channels || "youtube_instagram",
            mode: stepConfig.publishingMode || "publish_immediately",
            hashtags: stepConfig.hashtags || ""
          }
        }),
        validateConfiguration: (stepConfig) => {
          const errors: string[] = [];
          if (!stepConfig.channels) {
            errors.push("Select at least one social media channel to publish.");
          }
          return { isValid: errors.length === 0, errors };
        }
      }
    }
  ]
};
