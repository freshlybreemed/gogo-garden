import 'server-only';
import { MongoClient, type Db } from 'mongodb';

const DB_NAME = 'music';

// Cache the client across hot reloads (dev) and across invocations of a warm
// serverless instance (prod), mirroring the old `cachedDb` in graphql/db.js.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('[MongoDB] MONGODB_URI is not set');
    }
    globalForMongo._mongoClientPromise = new MongoClient(uri)
      .connect()
      .catch((err) => {
        // Allow a retry on the next call instead of caching a rejection.
        globalForMongo._mongoClientPromise = undefined;
        throw new Error(`[MongoDB] Connection Error: ${err}`);
      });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(DB_NAME);
}
