#!/usr/bin/env node
import crypto from "node:crypto";

/**
 * Secure Local Secret Generator
 * Generates high-entropy cryptographic keys for AUTH_SECRET and TOKEN_ENCRYPTION_KEY.
 * 
 * Usage:
 *   node scripts/generate-secret.mjs
 *   npm run generate:secret
 */

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

const secret = generateSecret(32); // 256-bit / 64-hex chars

console.log("\n========================================================");
console.log("  DIGILO SECURE SECRET GENERATOR (Node.js Crypto)");
console.log("========================================================\n");
console.log("Generated 256-bit Cryptographic Secret (64 hex characters):");
console.log(`\n  ${secret}\n`);
console.log("Instructions:");
console.log("1. Copy this value into your Netlify Environment Variables as AUTH_SECRET.");
console.log("2. In Netlify Console, ensure the 'Secret' toggle is enabled.");
console.log("3. Never commit this secret to Git or share it publicly.\n");
console.log("========================================================\n");
