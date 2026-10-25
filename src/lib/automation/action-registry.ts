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
