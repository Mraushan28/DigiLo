import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Returns formatted string: `${saltHex}:${derivedKeyHex}`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const salt = crypto.randomBytes(16).toString("hex");

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored scrypt hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}
