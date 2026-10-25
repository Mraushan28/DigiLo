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
export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
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
        return null as unknown as typeof mongoose;
      });
  }

  try {
    const conn = await cached.promise;
    cached.conn = conn;
    return conn;
  } catch (err) {
    cached.promise = null;
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
