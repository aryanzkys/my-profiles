function buildCandidateUrls(pathSuffix) {
  const fnName = (process.env.NEXT_PUBLIC_ADMINS_FUNCTION || 'admins-upsert').trim();
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim().replace(/\/$/, '');
  const customBase = (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || '').trim().replace(/\/$/, '');

  const urls = [
    customBase ? `${customBase}${pathSuffix}` : null,
    basePath ? `${basePath}/.netlify/functions/${fnName}${pathSuffix}` : null,
    `/.netlify/functions/${fnName}${pathSuffix}`,
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

async function postJson(pathSuffix, payload) {
  const urls = buildCandidateUrls(pathSuffix);
  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, data };
      }
      const errData = await res.json().catch(() => ({
        message: `Request failed with status ${res.status}`,
      }));
      lastError = { status: res.status, data: errData };
      if (res.status < 500) break;
    } catch (err) {
      lastError = {
        status: 500,
        data: { message: err?.message || 'Gagal menghubungi layanan admin.' },
      };
    }
  }

  return { ok: false, status: lastError?.status || 500, data: lastError?.data || {} };
}

export async function ensureAdminProfile({ email, uid, displayName }) {
  if (!email) return { ok: false, reason: 'missing-email' };
  const payload = {
    email,
    uid: uid || null,
    displayName: displayName || null,
    canEditSections: false,
    canAccessDev: false,
    banned: false,
    actorEmail: email,
    actorUid: uid || null,
    actorName: displayName || null,
  };

  return postJson('', payload);
}
