import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'zili_invite';
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function normalizeCode(value) {
  return typeof value === 'string' && value.length <= 128
    ? value.normalize('NFKC').replace(/[\s\-\u2010-\u2015]+/gu, '').toUpperCase() : '';
}

export function inviteConfig(env = {}, production = false) {
  const enabled = env.INVITE_ENABLED === 'false' ? false
    : production || env.VERCEL === '1' || env.INVITE_ENABLED === 'true' || Boolean(env.INVITE_CODE);
  const code = normalizeCode(env.INVITE_CODE);
  const secret = env.INVITE_SESSION_SECRET || '';
  const ready = code.length >= 8 && secret.length >= 32;
  return { enabled, ready, code, secret,
    version: ready ? createHmac('sha256', secret).update(`code:${code}`).digest('hex').slice(0, 24) : '' };
}

export function codeMatches(input, config) {
  if (!config.ready || !normalizeCode(input)) return false;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(normalizeCode(input)), digest(config.code));
}

export function signSession(config, now = Math.floor(Date.now() / 1000)) {
  if (!config.ready) throw new Error('Invite configuration is incomplete');
  const payload = Buffer.from(JSON.stringify({ v: 1, iat: now, exp: now + SESSION_SECONDS, code: config.version })).toString('base64url');
  const signature = createHmac('sha256', config.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(token, config, now = Math.floor(Date.now() / 1000)) {
  if (!config.ready || typeof token !== 'string' || token.length > 1024) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  const expected = createHmac('sha256', config.secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return data.v === 1 && data.code === config.version && Number.isSafeInteger(data.iat)
      && Number.isSafeInteger(data.exp) && data.iat <= now + 60 && data.exp > now
      && data.exp - data.iat === SESSION_SECONDS;
  } catch { return false; }
}

export function cookieValue(request) {
  const value = (request.headers.get('cookie') || '').split(';')
    .map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`));
  return value ? value.slice(COOKIE_NAME.length + 1) : '';
}

export function sessionCookie(request, token, clear = false) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure}`;
}

export function isDocument(request) {
  const url = new URL(request.url);
  return request.headers.get('sec-fetch-dest') === 'document'
    || (request.headers.get('accept') || '').includes('text/html')
    || url.pathname === '/' || url.pathname.endsWith('.html');
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', ...extra,
  } });
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return null; }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; }
}

export async function handleInviteRequest(request, env = {}, production = false) {
  const config = inviteConfig(env, production);
  if (request.method === 'GET') {
    return json({ enabled: config.enabled, configured: !config.enabled || config.ready,
      authenticated: !config.enabled || verifySession(cookieValue(request), config) });
  }
  if (request.method !== 'POST') return json({ error: '不支持的请求方式。' }, 405, { Allow: 'GET, POST' });
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: '请从本站提交邀请码。' }, 403);
  const data = await readBody(request);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: '请重新输入邀请码。' }, 400);
  if (data.action === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', true) });
  if (!config.enabled) return json({ ok: true });
  if (!config.ready) return json({ error: '邀请入口暂未配置好，请联系邀请人。' }, 503);
  if (!codeMatches(data.code, config)) return json({ error: '邀请码不对，请检查后再试。' }, 401);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, signSession(config)) });
}
