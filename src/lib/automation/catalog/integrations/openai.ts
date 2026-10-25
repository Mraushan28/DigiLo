import { IntegrationDefinition } from "../types";
import { z } from "zod";

export const openaiIntegration: IntegrationDefinition = {
  id: "openai",
  name: "OpenAI / AI Inference",
  category: "AI & Intelligence",
  description: "Powers natural language analysis, lead qualification, classification, and structured data extraction.",
  auth: {
    type: "api_key",
    envKeys: ["NVIDIA_API_KEY", "OPENAI_API_KEY"]
  },
  isImplemented: true,
  setupGuide: {
    overview: "Requires an NVIDIA or OpenAI API key configured in server environment variables.",
    steps: [
      "Obtain an API key from https://integrate.api.nvidia.com or https://platform.openai.com.",
      "Add NVIDIA_API_KEY=\"nvapi-...\" or OPENAI_API_KEY=\"sk-...\" to your .env.local file.",
      "Restart your application server."
    ]
  },
  triggers: [],
  actions: [
    {
      id: "ai.analyze",
      name: "AI Qualification & Analysis",
      description: "Analyze incoming data using AI, extract key entities, assign priority scores, or classify requests.",
      requiredIntegration: "openai",
      inputSchema: z.object({
        prompt: z.string().min(1, "Analysis instructions are required"),
        model: z.string().optional()
      }),
      configFields: [
        {
          key: "prompt",
          label: "Analysis Instructions",
          type: "textarea",
          required: true,
          placeholder: "e.g. Extract lead name, company size, intent, and assign a priority score (1-5)",
          defaultValue: "Extract lead name, company size, intent, and assign a priority score"
        },
        {
          key: "model",
          label: "Inference Model",
          type: "select",
          required: false,
          defaultValue: "gpt-4o-mini",
          options: [
            { label: "GPT-4o Mini (Fast & Cost Efficient)", value: "gpt-4o-mini" },
            { label: "GPT-4o (High Intelligence)", value: "gpt-4o" }
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
          model: (stepConfig.model as string) || "gpt-4o-mini",
          messages: {
            values: [
              {
                role: "system",
                content: "You are an intelligent business process assistant. Analyze input payload and extract structured details."
              },
              {
                role: "user",
                content: (stepConfig.prompt as string) || "Analyze incoming business data."
              }
            ]
          }
        }),
        validateConfiguration: (stepConfig) => {
          const errors: string[] = [];
          if (!stepConfig.prompt || typeof stepConfig.prompt !== "string" || !stepConfig.prompt.trim()) {
            errors.push("AI Analysis step requires a prompt or analysis instruction.");
          }
          return { isValid: errors.length === 0, errors };
        }
      }
    }
  ]
};
