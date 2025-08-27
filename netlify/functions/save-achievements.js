const { MongoClient } = require('mongodb');

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  const client = new MongoClient(uri, { maxPoolSize: 1 });
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
    return { statusCode: 500, body: e.message || 'Failed to save achievements' };
  }
};
