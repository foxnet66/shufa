import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { normalizeCode } from '../lib/invite-auth.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--rotate', '--disable'].includes(arg)) || args.length > 1) throw new Error('用法：node scripts/setup-invite.mjs [--rotate | --disable]');
const envFile = new URL('../.env.local', import.meta.url);
let contents = '';
try { contents = await readFile(envFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const get = key => (contents.match(new RegExp(`^\\s*${key}\\s*=([^\\r\\n]*)`, 'm'))?.[1] || '').trim().replace(/^['"]|['"]$/g, '');
const set = (key, value) => {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*${key}\\s*=[^\\r\\n]*`, 'm');
  contents = pattern.test(contents) ? contents.replace(pattern, line) : `${contents.trimEnd()}\n${line}\n`;
};

if (args.includes('--disable')) {
  set('INVITE_ENABLED', 'false');
  await writeFile(envFile, contents.trimStart(), { mode: 0o600 });
  console.log('本地邀请入口已关闭。Vercel 上请将 INVITE_ENABLED 设为 false 并重新部署。');
} else {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const random = () => {
    let result = '';
    while (result.length < 10) for (const byte of randomBytes(16)) {
      if (byte < 248 && result.length < 10) result += alphabet[byte % alphabet.length];
    }
    return `ZILI-${result.slice(0, 5)}-${result.slice(5)}`;
  };
  const code = !args.includes('--rotate') && normalizeCode(get('INVITE_CODE')).length >= 8 ? get('INVITE_CODE') : random();
  const secret = get('INVITE_SESSION_SECRET').length >= 32 ? get('INVITE_SESSION_SECRET') : randomBytes(32).toString('base64url');
  set('INVITE_ENABLED', 'true'); set('INVITE_CODE', code); set('INVITE_SESSION_SECRET', secret);
  await writeFile(envFile, contents.trimStart(), { mode: 0o600 });
  const directory = new URL('../artifacts/invite/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('vercel-env.txt', directory), `# 私密部署配置，请勿提交或公开分享\nINVITE_ENABLED=true\nINVITE_CODE=${code}\nINVITE_SESSION_SECRET=${secret}\n`, { mode: 0o600 });
  console.log(`邀请码：${code}\n本地配置已写入 .env.local。\nVercel 配置副本：artifacts/invite/vercel-env.txt（包含私密会话密钥，请勿公开）。`);
}
