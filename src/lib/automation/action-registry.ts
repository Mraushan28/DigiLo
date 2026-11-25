import { 
  getAction as getCatalogAction, 
  getAllActions as getAllCatalogActions,
  isActionSupported as isCatalogActionSupported,
  getActionConfigDefaults,
  ActionConfigField
} from "./catalog";

export type { ActionConfigField };

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  requiredIntegration: string;
  configFields: ActionConfigField[];
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  "ai.analyze": {
    id: "ai.analyze",
    name: "AI Qualification & Analysis",
    description: "Analyze incoming data using AI.",
    requiredIntegration: "openai",
    configFields: [
      {
        key: "prompt",
        label: "Analysis Instructions",
        type: "textarea",
        required: true,
        placeholder: "e.g. Extract lead name, company size, intent, and sentiment",
        defaultValue: "Extract lead name, company size, intent, and sentiment"
      },
      {
        key: "model",
        label: "Model",
        type: "select",
        required: false,
        defaultValue: "gpt-4o-mini",
        options: [
          { label: "GPT-4o Mini", value: "gpt-4o-mini" },
          { label: "GPT-4o", value: "gpt-4o" }
        ]
      }
    ]
  },
  "google_sheets.add_row": {
    id: "google_sheets.add_row",
    name: "Add Row to Google Sheets",
    description: "Save data as a new row in a Google Sheet.",
    requiredIntegration: "google_sheets",
    configFields: [
      {
        key: "spreadsheet",
        label: "Spreadsheet Name or ID",
        type: "text",
        required: true,
        placeholder: "e.g. Website Leads 2026",
        defaultValue: "Website Leads"
      },
      {
        key: "sheetName",
        label: "Sheet Tab Name",
        type: "text",
        required: false,
        placeholder: "e.g. Leads or Sheet1",
        defaultValue: "Leads"
      },
      {
        key: "columns",
        label: "Columns to Save",
        type: "text",
        required: false,
        placeholder: "e.g. Name, Email, Company, Notes",
        defaultValue: "Name, Email, Company, Notes"
      }
    ]
  },
  "slack.send_message": {
    id: "slack.send_message",
    name: "Send Slack Message",
    description: "Send a notification to a Slack channel.",
    requiredIntegration: "slack",
    configFields: [
      {
        key: "channel",
        label: "Slack Channel",
        type: "text",
        required: true,
        placeholder: "e.g. #leads or #sales",
        defaultValue: "#leads"
      },
      {
        key: "message",
        label: "Message Content",
        type: "textarea",
        required: true,
        placeholder: "e.g. New lead received: {{lead.name}}",
        defaultValue: "New inbound lead received from website. Check Google Sheets for details."
      }
    ]
  },
  "social_video.generate_script": {
    id: "social_video.generate_script",
    name: "Generate Video Script (ChatGPT)",
    description: "Generates high-converting short/long video script with hooks and scenes.",
    requiredIntegration: "openai",
    configFields: [
      {
        key: "topic",
        label: "Video Topic",
        type: "textarea",
        required: true,
        placeholder: "e.g. 3 AI tools to automate your business",
        defaultValue: "3 AI tools to automate your business"
      },
      {
        key: "format",
        label: "Video Format",
        type: "select",
        required: false,
        defaultValue: "short_form_9_16",
        options: [
          { label: "Short-Form (9:16 Vertical)", value: "short_form_9_16" },
          { label: "Long-Form (16:9 Landscape)", value: "long_form_16_9" }
        ]
      }
    ]
  },
  "social_video.generate_voiceover": {
    id: "social_video.generate_voiceover",
    name: "Generate AI Voiceover",
    description: "Converts the video script into realistic voice narration audio.",
    requiredIntegration: "social_video",
    configFields: [
      {
        key: "voice",
        label: "Voice Style",
        type: "select",
        required: false,
        defaultValue: "alloy",
        options: [
          { label: "Alloy (Neutral & Clear)", value: "alloy" },
          { label: "Echo (Energetic)", value: "echo" },
          { label: "Onyx (Deep Voice)", value: "onyx" }
        ]
      }
    ]
  },
  "social_video.render_video": {
    id: "social_video.render_video",
    name: "Render Video from Template",
    description: "Assembles audio, captions, and template visuals into final MP4 video.",
    requiredIntegration: "social_video",
    configFields: [
      {
        key: "templateStyle",
        label: "Template Style",
        type: "select",
        required: false,
        defaultValue: "dark_terminal_modern",
        options: [
          { label: "Dark Terminal Tech (Digilo Signature)", value: "dark_terminal_modern" },
          { label: "Kinetic Captions (Viral Style)", value: "kinetic_typography" }
        ]
      }
    ]
  },
  "social_video.publish_post": {
    id: "social_video.publish_post",
    name: "Auto-Publish to Social Media",
    description: "Uploads and publishes to YouTube Shorts, Instagram Reels, TikTok, and LinkedIn.",
    requiredIntegration: "social_video",
    configFields: [
      {
        key: "channels",
        label: "Social Channels",
        type: "select",
        required: true,
        defaultValue: "youtube_instagram",
        options: [
          { label: "YouTube Shorts + Instagram Reels", value: "youtube_instagram" },
          { label: "All Channels (YouTube, Instagram, TikTok, LinkedIn)", value: "all_channels" }
        ]
      }
    ]
  }
};

export type SupportedAction = keyof typeof ACTION_REGISTRY;

export function getActionIds(): string[] {
  const catalogActions = getAllCatalogActions();
  if (catalogActions.length > 0) {
    return catalogActions.map((a) => a.id);
  }
  return Object.keys(ACTION_REGISTRY);
}

export function isActionSupported(actionId: string): actionId is SupportedAction {
  return isCatalogActionSupported(actionId);
}

export function getActionDefinition(actionId: string): ActionDefinition | undefined {
  const catalogAction = getCatalogAction(actionId);
  if (catalogAction) {
    return {
      id: catalogAction.id,
      name: catalogAction.name,
      description: catalogAction.description,
      requiredIntegration: catalogAction.requiredIntegration,
      configFields: catalogAction.configFields
    };
  }
  return ACTION_REGISTRY[actionId];
}

export function getDefaultConfig(actionId: string): Record<string, string | number | boolean> {
  const catalogDefaults = getActionConfigDefaults(actionId);
  if (Object.keys(catalogDefaults).length > 0) {
    return catalogDefaults;
  }
  const definition = getActionDefinition(actionId);
  if (!definition) return {};
  const config: Record<string, string | number | boolean> = {};
  for (const field of definition.configFields) {
    if (field.defaultValue !== undefined) {
      config[field.key] = field.defaultValue;
    }
  }
  return config;
}
