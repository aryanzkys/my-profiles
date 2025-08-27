const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  const withOpts = uri.includes('?') ? `${uri}&retryWrites=true&w=majority` : `${uri}?retryWrites=true&w=majority`;
  const client = new MongoClient(withOpts, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    serverApi: { version: '1', strict: false, deprecationErrors: false },
  });
  await client.connect();
  // quick ping to fail fast if TLS/DNS issues
  await client.db('admin').command({ ping: 1 });
  cachedClient = client;
  return client;
}

exports.handler = async function (event, context) {
  try {
    // Try MongoDB first
    const client = await getClient();
    if (client) {
      const dbName = process.env.MONGODB_DB || 'myprofiles';
      const col = client.db(dbName).collection('achievements');
      const doc = await col.findOne({ _id: 'achievements' });
      if (doc && doc.data) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(doc.data),
        };
      }
    }

    // Fallback to local JSON
    const filePath = path.join(process.cwd(), 'data', 'achievements.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: raw,
    };
  } catch (e) {
  return { statusCode: 500, body: `Get error: ${e.message || 'Failed to get achievements'}` };
  }
};
