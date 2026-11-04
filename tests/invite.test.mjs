import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createRequestHandler } from '../server.mjs';
import { normalizeCode, inviteConfig, codeMatches, signSession, verifySession,
  handleInviteRequest, COOKIE_NAME, SESSION_SECONDS } from '../lib/invite-auth.mjs';

const env = { INVITE_ENABLED: 'true', INVITE_CODE: 'ZILI-TESTA-TESTB', INVITE_SESSION_SECRET: 'test-only-session-key-'.repeat(3) };
const config = inviteConfig(env);
const post = (body, origin = 'https://example.test') => new Request('https://example.test/api/invite', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('Vercel publishes the public editor without a whole-site gate', () => {
  const deployment = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(deployment.outputDirectory, 'dist');
  assert.equal(deployment.proxy, undefined);
});

test('invite codes tolerate case, spacing and full-width characters without accepting other codes', () => {
  assert.equal(normalizeCode(' ｚｉｌｉ－testa — testb '), 'ZILITESTATESTB');
  assert.ok(codeMatches('zili testa testb', config));
  assert.ok(!codeMatches('ZILI-WRONG-CODE', config));
  assert.ok(!codeMatches('', config));
  assert.equal(normalizeCode('x'.repeat(129)), '');
});

test('signed sessions reject tampering, expiration, wrong secrets and rotated invite codes', () => {
  const token = signSession(config, 1000);
  assert.ok(verifySession(token, config, 1001));
  assert.ok(!verifySession(`${token.slice(0, 20)}A${token.slice(21)}`, config, 1001));
  assert.ok(!verifySession(token, config, 1000 + SESSION_SECONDS));
  assert.ok(!verifySession(token, config, 100));
  assert.ok(!verifySession(token, inviteConfig({ ...env, INVITE_CODE: 'ZILI-NEXTA-NEXTB' }), 1001));
  assert.ok(!verifySession(token, inviteConfig({ ...env, INVITE_SESSION_SECRET: 'another-test-session-key-'.repeat(3) }), 1001));
  for (const invalid of ['', 'a.b.c', '%', 'a'.repeat(2000)]) assert.ok(!verifySession(invalid, config));
});



test('the API checks origin and body, never sets a cookie for invalid codes, and uses protected cookies', async () => {
  assert.equal((await handleInviteRequest(post({ code: env.INVITE_CODE }, 'https://elsewhere.test'), env)).status, 403);
  const wrong = await handleInviteRequest(post({ code: 'WRONG' }), env);
  assert.equal(wrong.status, 401); assert.equal(wrong.headers.get('set-cookie'), null);
  assert.equal((await handleInviteRequest(post({ code: 'x'.repeat(3000) }), env)).status, 400);
  const good = await handleInviteRequest(post({ code: env.INVITE_CODE.toLowerCase() }), env);
  assert.equal(good.status, 200);
  const cookie = good.headers.get('set-cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', `Max-Age=${SESSION_SECONDS}`]) assert.ok(cookie.includes(flag));
  const status = await handleInviteRequest(new Request('https://example.test/api/invite', { headers: { cookie: cookie.split(';')[0] } }), env);
  assert.deepEqual(await status.json(), { enabled: true, configured: true, authenticated: true });
  const logout = await handleInviteRequest(post({ action: 'logout' }), env);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await handleInviteRequest(post({ code: 'anything' }), {}, true)).status, 503);
  assert.equal((await handleInviteRequest(new Request('https://example.test/api/invite', { method: 'PUT' }), env)).status, 405);
});

test('the public editor stays available before login and after invite rotation', async t => {
  const localEnv = { ...env };
  const server = http.createServer(createRequestHandler(localEnv));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin, { redirect: 'manual' })).status, 200);
  assert.equal((await fetch(`${origin}/invite.html`)).status, 200);
  assert.equal((await fetch(`${origin}/app.js`)).status, 200);
  const login = await fetch(`${origin}/api/invite`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: env.INVITE_CODE }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const page = await fetch(origin, { headers: { cookie } });
  assert.equal(page.status, 200); assert.match(await page.text(), /字里行间/);
  assert.equal((await fetch(`${origin}/app.js`, { headers: { cookie } })).status, 200);
  localEnv.INVITE_CODE = 'ZILI-ROTATE-TEST';
  assert.equal((await fetch(origin, { headers: { cookie }, redirect: 'manual' })).status, 200);
  const rotated = await fetch(`${origin}/api/invite`, { headers: { cookie } });
  assert.equal((await rotated.json()).authenticated, false);
  const missing = http.createServer(createRequestHandler({ INVITE_ENABLED: 'true' }));
  missing.listen(0, '127.0.0.1'); await once(missing, 'listening');
  t.after(() => new Promise(resolve => { missing.closeAllConnections(); missing.close(resolve); }));
  assert.equal((await fetch(`http://127.0.0.1:${missing.address().port}/`)).status, 200);
});
