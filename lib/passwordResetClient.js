// Utilitas pemanggil API reset password agar dapat bekerja di berbagai lingkungan (Netlify Functions maupun server mandiri).

function buildCandidateUrls(pathSuffix) {
  const fnName = (process.env.NEXT_PUBLIC_PASSWORD_RESET_FUNCTION || 'auth-service').trim();
  const customBase = (process.env.NEXT_PUBLIC_PASSWORD_RESET_BASE_URL || '').trim().replace(/\/$/, '');
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim().replace(/\/$/, '');
  const localPort = (process.env.NEXT_PUBLIC_PASSWORD_RESET_PORT || '').trim();

  const candidates = [
    customBase ? `${customBase}${pathSuffix}` : null,
    basePath ? `${basePath}/.netlify/functions/${fnName}${pathSuffix}` : null,
    `/.netlify/functions/${fnName}${pathSuffix}`,
    basePath ? `${basePath}${pathSuffix}` : null,
    localPort ? `http://localhost:${localPort}${pathSuffix}` : null,
    pathSuffix,
  ].filter(Boolean);

  // Menghapus duplikat sambil mempertahankan urutan
  return Array.from(new Set(candidates));
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, status: res.status, data };
      }
      lastError = { status: res.status, data };
      if (res.status < 500) {
        // Jika error bukan server error, hentikan agar pesan bisa segera ditampilkan
        break;
      }
    } catch (err) {
      lastError = { status: 500, data: { message: err?.message || 'Gagal terhubung ke server reset password.' } };
    }
  }

  return { ok: false, status: lastError?.status || 500, data: lastError?.data || { message: 'Gagal terhubung ke server reset password.' } };
}

export async function requestPasswordReset(email) {
  return postJson('/auth/request-reset', { email });
}

export async function submitNewPassword({ email, token, password }) {
  return postJson('/auth/reset', { email, token, password });
}
