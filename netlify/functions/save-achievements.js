const { MongoClient } = require('mongodb');

// Prefer MongoDB Data API if configured to avoid TLS/IP allowlist issues on serverless
const DATA_API_BASE = process.env.MONGODB_DATA_API_BASEURL; // e.g. https://ap-southeast-1.aws.data.mongodb-api.com/app/<app-id>/endpoint/data/v1
const DATA_API_KEY = process.env.MONGODB_DATA_API_KEY;
const DATA_SOURCE = process.env.MONGODB_DATA_SOURCE; // e.g. Cluster0

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const withOpts = uri.includes('?') ? `${uri}&retryWrites=true&w=majority` : `${uri}?retryWrites=true&w=majority`;
  const client = new MongoClient(withOpts, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    serverApi: { version: '1', strict: false, deprecationErrors: false },
  });
  await client.connect();
  cachedClient = client;
  return client;
}

async function saveWithDataAPI(docData) {
  const database = process.env.MONGODB_DB || process.env.MONGODB_DATA_API_DB || 'myprofiles';
  const collection = process.env.MONGODB_COLLECTION || process.env.MONGODB_DATA_API_COLLECTION || 'myprofiles';
  const url = `${DATA_API_BASE.replace(/\/$/, '')}/action/updateOne`;
  const payload = {
    dataSource: DATA_SOURCE,
    database,
    collection,
    filter: { _id: 'achievements' },
    update: { $set: { data: docData, updatedAt: new Date().toISOString() } },
    upsert: true,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'api-key': DATA_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Data API update failed (${res.status}): ${text}`);
  }
  return { ok: true };
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    // If Data API is fully configured, use it
    if (DATA_API_BASE && DATA_API_KEY && DATA_SOURCE) {
      const result = await saveWithDataAPI(body);
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) };
    }

    // Fallback to direct driver (requires Atlas IP allowlist to permit Netlify egress IPs)
    const client = await getClient();
    const dbName = process.env.MONGODB_DB || 'myprofiles';
    const collectionName = process.env.MONGODB_COLLECTION || 'myprofiles';
    const col = client.db(dbName).collection(collectionName);
    await col.updateOne(
      { _id: 'achievements' },
      { $set: { data: body, updatedAt: new Date() } },
      { upsert: true }
    );
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: `Save error: ${e.message || 'Failed to save achievements'}` };
  }
};
