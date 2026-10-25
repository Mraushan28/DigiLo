import { 
  getTrigger as getCatalogTrigger, 
  getAllTriggers as getAllCatalogTriggers,
  isTriggerSupported as isCatalogTriggerSupported 
} from "./catalog";

export const TRIGGER_REGISTRY = [
  "webhook",
  "manual"
] as const;

export type SupportedTrigger = typeof TRIGGER_REGISTRY[number];

export interface TriggerDefinition {
  type: SupportedTrigger;
  label: string;
  description: string;
  defaultSource: string;
  defaultEvent: string;
}

export const TRIGGER_DEFINITIONS: Record<SupportedTrigger, TriggerDefinition> = {
  webhook: {
    type: "webhook",
    label: "Webhook Event",
    description: "Triggers automatically when an external event payload arrives (e.g. form submission, lead capture).",
    defaultSource: "Website Contact Form",
    defaultEvent: "lead_submitted"
  },
  manual: {
    type: "manual",
    label: "Manual Trigger",
    description: "Triggers on demand when initiated by a user or automated batch schedule.",
    defaultSource: "User Dashboard",
    defaultEvent: "manual_run"
  }
};

export function isTriggerSupported(type: string): type is SupportedTrigger {
  return isCatalogTriggerSupported(type);
}

export function getTriggerDefinition(type: string): TriggerDefinition | undefined {
  const catTrigger = getCatalogTrigger(type);
  if (catTrigger && (catTrigger.id === "webhook" || catTrigger.id === "manual")) {
    return {
      type: catTrigger.id as SupportedTrigger,
      label: catTrigger.name,
      description: catTrigger.description,
      defaultSource: catTrigger.defaultSource,
      defaultEvent: catTrigger.defaultEvent
    };
  }
  return TRIGGER_DEFINITIONS[type as SupportedTrigger];
}

export function getAllSupportedTriggers(): string[] {
  return getAllCatalogTriggers().map((t) => t.id);
}
