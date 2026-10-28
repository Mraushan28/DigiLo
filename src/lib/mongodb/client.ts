import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Returns whether MongoDB connection is actively ready.
 */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Connects to MongoDB using connection pooling and global caching for Next.js hot-reloads.
 * If MONGODB_URI is not provided, gracefully resolves to null and enables offline mode.
 */
let lastFailureTime = 0;
const FAILURE_BACKOFF_MS = 30000; // 30 seconds backoff after connection failure
let hasLoggedPlaceholderWarning = false;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return null;
  }

  // Detect unconfigured template placeholders to avoid stalling on invalid DNS lookups
  if (uri.includes("<") || uri.includes(">") || uri.includes("your_")) {
    if (!hasLoggedPlaceholderWarning) {
      console.warn("[MongoDB] MONGODB_URI contains placeholder values; running in in-memory fallback mode.");
      hasLoggedPlaceholderWarning = true;
    }
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  // If a connection failed recently, avoid blocking the request thread with timeout delays
  if (Date.now() - lastFailureTime < FAILURE_BACKOFF_MS) {
    return null;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.log("[MongoDB] Connected successfully to:", uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"));
        return m;
      })
      .catch((err) => {
        console.warn("[MongoDB] Connection failed, running in fallback mode:", err.message);
        cached.promise = null;
        lastFailureTime = Date.now();
        return null as unknown as typeof mongoose;
      });
  }

  try {
    const conn = await cached.promise;
    cached.conn = conn;
    return conn;
  } catch (err) {
    cached.promise = null;
    lastFailureTime = Date.now();
    console.warn("[MongoDB] Connection error:", err);
    return null;
  }
}

/**
 * Disconnects from MongoDB (useful for test tear-downs).
 */
export async function disconnectDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
