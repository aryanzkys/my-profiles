const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Optional MongoDB Data API config
const DATA_API_BASE = process.env.MONGODB_DATA_API_BASEURL;
const DATA_API_KEY = process.env.MONGODB_DATA_API_KEY;
const DATA_SOURCE = process.env.MONGODB_DATA_SOURCE;

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
    // 1) Try MongoDB Data API if configured
    if (DATA_API_BASE && DATA_API_KEY && DATA_SOURCE) {
      const database = process.env.MONGODB_DB || process.env.MONGODB_DATA_API_DB || 'myprofiles';
      const collection = process.env.MONGODB_COLLECTION || process.env.MONGODB_DATA_API_COLLECTION || 'myprofiles';
      const url = `${DATA_API_BASE.replace(/\/$/, '')}/action/findOne`;
      const payload = {
        dataSource: DATA_SOURCE,
        database,
        collection,
        filter: { _id: 'achievements' },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json', 'api-key': DATA_API_KEY },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        const doc = json.document;
        if (doc && doc.data) {
          return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc.data) };
        }
      } else {
        const text = await res.text();
        throw new Error(`Data API findOne failed (${res.status}): ${text}`);
      }
    }

    // 2) Try MongoDB driver
    const client = await getClient();
    if (client) {
      const dbName = process.env.MONGODB_DB || 'myprofiles';
      const collectionName = process.env.MONGODB_COLLECTION || 'myprofiles';
      const col = client.db(dbName).collection(collectionName);
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
