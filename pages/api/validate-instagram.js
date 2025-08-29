export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end();
  }
  if (req.method !== 'GET') return res.status(405).end();
  const u = (req.query.u || '').toLowerCase().trim();
  const username = u.replace(/[^a-z0-9._]/g, '');
  if (!username) return res.status(200).json({ exists: false });
  try {
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, redirect: 'manual' });
    let exists = false;
    if (r.status === 200) {
      const html = await r.text();
      exists = /property=\"og:site_name\"/i.test(html) && new RegExp(`@?${username}`, 'i').test(html);
    } else if ([301,302,303,307,308].includes(r.status)) {
      exists = true;
    } else if (r.status === 404) {
      exists = false;
    }
    res.status(200).json({ exists });
  } catch {
    res.status(200).json({ exists: false });
  }
}
