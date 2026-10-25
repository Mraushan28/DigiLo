import { z } from "zod";
import { IntegrationAccountInfo, IntegrationStatusInfo } from "@/types/automation";

export type IntegrationCategory =
  | "AI & Intelligence"
  | "Databases & Spreadsheets"
  | "Team Messaging"
  | "Trigger & Ingestion"
  | "Email & Communication"
  | "CRM & Sales"
  | "E-Commerce";

export type AuthMethodType = "oauth2" | "api_key" | "none";

export interface OAuth2AuthDefinition {
  type: "oauth2";
  providerId: string;
  scopes: string[];
  tokenType: "bearer" | "bot";
  envKeys: string[];
  redirectUriPath: string;
}

export interface ApiKeyAuthDefinition {
  type: "api_key";
  headerName?: string;
  envKeys: string[];
}

export interface NoneAuthDefinition {
  type: "none";
}

export type AuthDefinition = OAuth2AuthDefinition | ApiKeyAuthDefinition | NoneAuthDefinition;

export interface ActionConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean";
  required: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
}

export interface ExecutionAdapterDefinition {
  engine: "n8n";
  n8nNodeType: string;
  n8nNodeVersion: number;
  credentialType?: string;
  credentialIdPrefix?: string;
  mapParameters: (
    stepConfig: Record<string, unknown>,
    accountInfo?: IntegrationAccountInfo
  ) => Record<string, unknown>;
  validateConfiguration?: (stepConfig: Record<string, unknown>) => {
    isValid: boolean;
    errors: string[];
  };
}

export interface CatalogActionDefinition {
  id: string;
  name: string;
  description: string;
  requiredIntegration: string;
  configFields: ActionConfigField[];
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  executionAdapter: ExecutionAdapterDefinition;
}

export interface CatalogTriggerDefinition {
  id: string;
  name: string;
  description: string;
  requiredIntegration?: string;
  defaultSource: string;
  defaultEvent: string;
  executionAdapter: {
    n8nNodeType: string;
    n8nNodeVersion: number;
    mapParameters: (triggerConfig: Record<string, unknown>) => Record<string, unknown>;
  };
}

export interface IntegrationSetupGuide {
  overview: string;
  steps: string[];
  registeredRedirectUri?: string;
  portalUrl?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  auth: AuthDefinition;
  isImplemented: boolean;
  docsUrl?: string;
  setupGuide: IntegrationSetupGuide;
  triggers: CatalogTriggerDefinition[];
  actions: CatalogActionDefinition[];
  resourceConfig?: {
    supported: boolean;
    type: "spreadsheet" | "channel" | "none";
    label: string;
  };
  checkStatus?: (workspaceId?: string) => Promise<IntegrationStatusInfo>;
}
