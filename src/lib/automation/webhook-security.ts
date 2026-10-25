import crypto from "node:crypto";

export const MAX_WEBHOOK_PAYLOAD_BYTES = 1024 * 1024; // 1 MB limit

/**
 * Generates a cryptographically strong webhook secret for a workflow.
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Computes a deterministic SHA-256 hash of a webhook secret for safe storage.
 */
export function hashWebhookSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret.trim()).digest("hex");
}

/**
 * Constant-time comparison to verify incoming webhook secret against stored secret or hash.
 * Prevents timing attacks.
 */
export function verifyWebhookSecret(
  providedSecret: string,
  storedSecretOrHash?: string | null,
  fallbackValidSecret?: string | null
): boolean {
  if (!providedSecret || typeof providedSecret !== "string") {
    return false;
  }

  const cleanProvided = providedSecret.trim();

  // 1. Direct match or SHA-256 hash match against storedSecretOrHash
  if (storedSecretOrHash && typeof storedSecretOrHash === "string") {
    const cleanStored = storedSecretOrHash.trim();

    // Check raw secret match (timing-safe)
    if (safeTimingCompare(cleanProvided, cleanStored)) {
      return true;
    }

    // Check if stored is a hash (64 hex characters) and matches SHA-256 of provided
    if (/^[a-f0-9]{64}$/i.test(cleanStored)) {
      const hashedProvided = hashWebhookSecret(cleanProvided);
      if (safeTimingCompare(hashedProvided, cleanStored)) {
        return true;
      }
    }
  }

  // 2. Check fallback valid secret (e.g. deterministic HMAC or workflow id for backwards compatibility)
  if (fallbackValidSecret && typeof fallbackValidSecret === "string") {
    if (safeTimingCompare(cleanProvided, fallbackValidSecret.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Performs a constant-time string comparison using crypto.timingSafeEqual.
 */
function safeTimingCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    // Constant-time dummy comparison to prevent timing leak on length
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

// =========================================================================
// TENANT RATE LIMITING (Sliding Window in Memory)
// =========================================================================

interface RateLimitBucket {
  timestamps: number[];
  lastCleaned: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Checks whether an incoming request from a tenant workspace exceeds the allowed rate limit.
 * Default: 60 requests per 60 seconds per workspace.
 */
export function checkTenantRateLimit(
  workspaceId: string,
  maxRequests = 60,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const bucketKey = `rl:${workspaceId}`;

  let bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [], lastCleaned: now };
    rateLimitBuckets.set(bucketKey, bucket);
  }

  // Prune timestamps older than window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  // Record request
  bucket.timestamps.push(now);
  const remaining = Math.max(0, maxRequests - bucket.timestamps.length);

  // Periodically clean up stale buckets (every 100 checks)
  if (rateLimitBuckets.size > 1000) {
    for (const [key, b] of rateLimitBuckets.entries()) {
      if (b.timestamps.length === 0 || now - b.timestamps[b.timestamps.length - 1] > windowMs * 2) {
        rateLimitBuckets.delete(key);
      }
    }
  }

  return {
    allowed: true,
    remaining,
    resetMs: windowMs,
  };
}

/**
 * Resets rate limit for a workspace (useful for testing).
 */
export function resetTenantRateLimit(workspaceId: string): void {
  rateLimitBuckets.delete(`rl:${workspaceId}`);
}
