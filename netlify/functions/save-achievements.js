const { MongoClient } = require('mongodb');

// Prefer GitHub storage if configured (commit JSON to repo), then MongoDB Data API, then driver
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // e.g. owner/repo
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'data/achievements.json';

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

async function saveWithGitHub(docData) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return null;
  const [owner, repo] = GITHUB_REPO.split('/');
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(GITHUB_FILE_PATH)}`;

  // Get current SHA (if file exists)
  let sha = undefined;
  const getRes = await fetch(`${endpoint}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' },
  });
  if (getRes.status === 200) {
    const json = await getRes.json();
    sha = json.sha;
  } else if (getRes.status === 401 || getRes.status === 403) {
    const t = await getRes.text();
    throw new Error(
      `GitHub auth failed (${getRes.status}). Check GITHUB_TOKEN scopes and repo access. ` +
      `Repo: ${GITHUB_REPO}@${GITHUB_BRANCH}, Path: ${GITHUB_FILE_PATH}. Details: ${t}`
    );
  } else if (getRes.status !== 404) {
    const t = await getRes.text();
    throw new Error(`GitHub get file failed (${getRes.status}): ${t}`);
  }

  const content = Buffer.from(JSON.stringify(docData, null, 2), 'utf8').toString('base64');
  const message = `chore(data): update achievements via admin (${new Date().toISOString()})`;
  const putRes = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content,
      branch: GITHUB_BRANCH,
      sha,
      committer: {
        name: process.env.GITHUB_COMMITTER_NAME || 'my-profiles-admin',
        email: process.env.GITHUB_COMMITTER_EMAIL || 'admin@example.com',
      },
    }),
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    const authHint = putRes.status === 401 || putRes.status === 403
      ? ' Check GITHUB_TOKEN (scopes: classic token with repo/public_repo or fine-grained with Contents: Read & Write) and ensure the token has access to the repo/branch.'
      : '';
    throw new Error(`GitHub commit failed (${putRes.status}): ${t}.${authHint}`);
  }
  return { ok: true, via: 'github' };
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};

    // 0) GitHub (preferred on serverless if configured)
    if (GITHUB_TOKEN && GITHUB_REPO) {
      const result = await saveWithGitHub(body);
      return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) };
    }

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
