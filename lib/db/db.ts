import mongoose from "mongoose";
import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

// -----------------------------
// ✅ MongoClient (for NextAuth)
// -----------------------------

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Use global caching for BOTH dev + production
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

clientPromise = globalWithMongo._mongoClientPromise;

export default clientPromise;

// -----------------------------
// ✅ Mongoose (optional usage)
// -----------------------------

declare global {
  // eslint-disable-next-line no-var
  var mongooseGlobal: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global.mongooseGlobal) {
  global.mongooseGlobal = {
    conn: null,
    promise: null,
  };
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (global.mongooseGlobal.conn) {
    return global.mongooseGlobal.conn;
  }

  if (!global.mongooseGlobal.promise) {
    global.mongooseGlobal.promise = mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV === "development", // 🚀 avoid slow indexing in prod
    });
  }

  global.mongooseGlobal.conn = await global.mongooseGlobal.promise;
  return global.mongooseGlobal.conn;
}
