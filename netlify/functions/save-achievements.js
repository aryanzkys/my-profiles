const { MongoClient } = require('mongodb');

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

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const client = await getClient();
    const dbName = process.env.MONGODB_DB || 'myprofiles';
    const col = client.db(dbName).collection('achievements');
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
