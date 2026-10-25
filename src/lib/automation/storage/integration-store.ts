import fs from "node:fs/promises";
import path from "node:path";
import { IntegrationAccountInfo } from "@/types/automation";
import { connectToDatabase, isMongoConnected } from "@/lib/mongodb/client";
import { IntegrationCredentialModel, IIntegrationCredential } from "@/lib/mongodb/models/IntegrationCredential";

export interface EncryptedTokens {
  accessTokenCipher: string;
  refreshTokenCipher?: string;
  expiresAt?: number;
}

export interface StoredIntegrationRecord {
  workspaceId: string;
  provider: "google_sheets" | "slack" | "gmail";
  status: "connected" | "expired";
  account: IntegrationAccountInfo;
  encryptedTokens: EncryptedTokens;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface StorageSchema {
  version: 1;
  // Key format: `${workspaceId}:${provider}`
  records: Record<string, StoredIntegrationRecord>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "integrations.json");

// In-memory cache for fast lookups & test resilience
let memoryStore: StorageSchema = { version: 1, records: {} };
let isInitialized = false;
let isMigratedToMongo = false;

async function ensureDataFile(): Promise<void> {
  if (isInitialized) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DATA_FILE, "utf-8");
      memoryStore = JSON.parse(content);
    } catch {
      // File doesn't exist yet, write initial empty schema
      await persistData();
    }
  } catch (err) {
    console.warn("[IntegrationStore] Persistent directory unavailable, running in-memory:", err);
  }
  isInitialized = true;
}

async function persistData(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${DATA_FILE}.${Date.now()}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(memoryStore, null, 2), "utf-8");
    await fs.rename(tempFile, DATA_FILE);
  } catch (err) {
    console.warn("[IntegrationStore] File write fallback:", err);
  }
}

function recordKey(workspaceId: string, provider: string): string {
  return `${workspaceId}:${provider}`;
}

/**
 * Migrates all records from the local filesystem / in-memory store into MongoDB.
 * Called automatically when MongoDB connection is established.
 */
export async function migrateFileStoreToMongo(): Promise<number> {
  if (isMigratedToMongo) return 0;
  await ensureDataFile();

  const conn = await connectToDatabase();
  if (!conn || !isMongoConnected()) return 0;

  let count = 0;
  try {
    const entries = Object.values(memoryStore.records);
    for (const record of entries) {
      await IntegrationCredentialModel.findOneAndUpdate(
        { workspaceId: record.workspaceId, provider: record.provider },
        {
          workspaceId: record.workspaceId,
          provider: record.provider,
          status: record.status,
          account: record.account,
          encryptedTokens: record.encryptedTokens,
          metadata: record.metadata,
        },
        { upsert: true, new: true }
      );
      count++;
    }
    if (count > 0) {
      console.log(`[IntegrationStore] Migrated ${count} integration credentials to MongoDB.`);
    }
    isMigratedToMongo = true;
  } catch (err) {
    console.warn("[IntegrationStore] Error during MongoDB migration:", err);
  }
  return count;
}

export async function saveIntegrationRecord(record: StoredIntegrationRecord): Promise<void> {
  await ensureDataFile();
  const key = recordKey(record.workspaceId, record.provider);

  const updatedRecord: StoredIntegrationRecord = {
    ...record,
    updatedAt: new Date().toISOString()
  };

  // Always update memory/file cache
  memoryStore.records[key] = updatedRecord;
  await persistData();

  // If MongoDB is connected, also save to MongoDB collection
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      await IntegrationCredentialModel.findOneAndUpdate(
        { workspaceId: record.workspaceId, provider: record.provider },
        {
          workspaceId: record.workspaceId,
          provider: record.provider,
          status: record.status,
          account: record.account,
          encryptedTokens: record.encryptedTokens,
          metadata: record.metadata,
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn("[IntegrationStore] MongoDB save fallback to local file:", err);
  }
}

export async function getIntegrationRecord(
  workspaceId: string,
  provider: "google_sheets" | "slack" | "gmail"
): Promise<StoredIntegrationRecord | null> {
  await ensureDataFile();

  // Try MongoDB first if connected
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const doc = await IntegrationCredentialModel.findOne({ workspaceId, provider }).lean<IIntegrationCredential>();
      if (doc) {
        return {
          workspaceId: doc.workspaceId,
          provider: doc.provider as "google_sheets" | "slack" | "gmail",
          status: doc.status,
          account: doc.account,
          encryptedTokens: doc.encryptedTokens,
          metadata: doc.metadata,
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("[IntegrationStore] MongoDB fetch error, falling back to cache:", err);
  }

  // Fallback to local memory/file store
  const key = recordKey(workspaceId, provider);
  return memoryStore.records[key] || null;
}

export async function deleteIntegrationRecord(
  workspaceId: string,
  provider: "google_sheets" | "slack" | "gmail"
): Promise<boolean> {
  await ensureDataFile();

  let mongoDeleted = false;
  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const res = await IntegrationCredentialModel.deleteOne({ workspaceId, provider });
      mongoDeleted = res.deletedCount > 0;
    }
  } catch (err) {
    console.warn("[IntegrationStore] MongoDB delete error:", err);
  }

  const key = recordKey(workspaceId, provider);
  const cacheDeleted = Boolean(memoryStore.records[key]);
  if (cacheDeleted) {
    delete memoryStore.records[key];
    await persistData();
  }

  return mongoDeleted || cacheDeleted;
}

export async function listIntegrationRecords(workspaceId: string): Promise<StoredIntegrationRecord[]> {
  await ensureDataFile();

  try {
    const conn = await connectToDatabase();
    if (conn && isMongoConnected()) {
      const docs = await IntegrationCredentialModel.find({ workspaceId }).lean<IIntegrationCredential[]>();
      if (docs && docs.length > 0) {
        return docs.map((doc) => ({
          workspaceId: doc.workspaceId,
          provider: doc.provider as "google_sheets" | "slack" | "gmail",
          status: doc.status,
          account: doc.account,
          encryptedTokens: doc.encryptedTokens,
          metadata: doc.metadata,
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn("[IntegrationStore] MongoDB list error:", err);
  }

  const prefix = `${workspaceId}:`;
  const result: StoredIntegrationRecord[] = [];
  for (const [key, record] of Object.entries(memoryStore.records)) {
    if (key.startsWith(prefix)) {
      result.push(record);
    }
  }
  return result;
}

export async function updateIntegrationAccount(
  workspaceId: string,
  provider: "google_sheets" | "slack" | "gmail",
  accountUpdates: Partial<IntegrationAccountInfo>
): Promise<void> {
  await ensureDataFile();
  const record = await getIntegrationRecord(workspaceId, provider);
  if (!record) return;

  record.account = {
    ...record.account,
    ...accountUpdates
  };
  record.updatedAt = new Date().toISOString();
  await saveIntegrationRecord(record);
}
