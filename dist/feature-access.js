import { FEATURES, BASIC_DEFAULTS, editorFeature, wallpaperFeature } from './feature-policy.js';

const endpoint = new URL('./api/invite', import.meta.url);
const $ = id => document.getElementById(id);
let advanced = false, enabled = true, pending = null;
const listeners = new Set(), preserved = new Map(), previous = new Map();
export const hasAdvancedAccess = () => advanced;
export const onAccessChange = callback => listeners.add(callback);
export const preserveDraft = data => ({ ...data, ...Object.fromEntries(preserved) });

function paintAccess() {
  $('inviteUnlock').hidden = !enabled || advanced;
  $('inviteLogout').hidden = !enabled || !advanced;
  $('heroSample').textContent = advanced ? '试写此卷' : '解锁长卷试写';
  $('heroInviteHint').hidden = advanced;
  $('heroSample').setAttribute('aria-label', advanced ? '载入《兰亭集序》长卷示例' : '输入邀请码，解锁《兰亭集序》长卷试写');
  document.body.classList.toggle('basic-access', !advanced);
  document.querySelectorAll('[data-invite-feature]').forEach(el => {
    if (el.tagName === 'OPTION') {
      el.dataset.originalLabel ||= el.textContent;
      el.textContent = el.dataset.originalLabel + (!advanced ? ' · 邀请试用' : '');
    } else {
      el.classList.toggle('invite-option', !advanced);
      if (!advanced) el.title = `${FEATURES[el.dataset.inviteFeature]} · 邀请试用`;
      else el.removeAttribute('title');
    }
  });
}
function setAccess(value) {
  advanced = value;
  if (advanced) {
    for (const [id, value] of preserved) $(id).value = value;
    preserved.clear();
  } else normalizeEditor();
  paintAccess(); listeners.forEach(callback => callback());
}
// Preserve advanced draft choices while displaying a basic version.
export function normalizeEditor() {
  if (!advanced && $('composition').value === 'scroll') {
    for (const id of ['columns','rows']) preserved.set(id,$(id).value);
    $('columns').value = '10'; $('rows').value = 'auto';
  }
  for (const [id, fallback] of Object.entries(BASIC_DEFAULTS)) {
    const field = $(id);
    if (!advanced && editorFeature(id, field.value)) { preserved.set(id, field.value); field.value = fallback; }
    previous.set(id, field.value);
  }
}
export function requestFeature(feature) {
  if (advanced) return Promise.resolve(true);
  if (pending) return Promise.resolve(false);
  $('accessTitle').textContent = feature ? `${FEATURES[feature]} · 邀请试用` : '一纸相邀';
  $('accessMessage').textContent = ''; $('accessCode').value = ''; $('accessCode').removeAttribute('aria-invalid');
  $('accessDialog').showModal(); $('accessCode').focus();
  return new Promise(resolve => { pending = resolve; });
}
function finish(allowed) {
  const resolve = pending; pending = null; $('accessDialog').close(); resolve?.(allowed);
}
$('accessCancel').addEventListener('click', () => finish(false));
$('accessDialog').addEventListener('cancel', event => { event.preventDefault(); finish(false); });
$('accessDialog').addEventListener('close', () => { if (pending) { const resolve = pending; pending = null; resolve(false); } });
$('inviteUnlock').addEventListener('click', () => requestFeature(null));
$('accessCode').addEventListener('input', () => { $('accessCode').removeAttribute('aria-invalid'); $('accessMessage').textContent = ''; });
$('accessForm').addEventListener('submit', async event => {
  event.preventDefault(); if ($('accessSubmit').disabled) return;
  $('accessSubmit').disabled = true;
  try {
    const response = await fetch(endpoint, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ code:$('accessCode').value }), signal:AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || '暂时无法验证，请稍后重试。');
    setAccess(true); finish(true);
  } catch (error) {
    $('accessMessage').textContent = error.name === 'TimeoutError' ? '网络连接超时，请稍后重试。' : error.message;
    $('accessCode').setAttribute('aria-invalid','true'); $('accessCode').focus();
  } finally { $('accessSubmit').disabled = false; }
});
$('inviteLogout').addEventListener('click', async () => {
  $('inviteLogout').disabled = true;
  try {
    const response = await fetch(endpoint, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ action:'logout' }), signal:AbortSignal.timeout(10000) });
    if (!response.ok) throw Error();
    setAccess(false);
  } catch { $('inviteLogout').textContent = '退出失败，重试'; }
  finally { $('inviteLogout').disabled = false; }
});

// Capture before editor listeners: denied choices never change the artwork.
let replaying = false;
for (const type of ['input','change']) document.addEventListener(type, event => {
  const field = event.target;
  if (replaying) return;
  if (['columns','rows'].includes(field.id)) { preserved.delete(field.id); return; }
  if (!Object.hasOwn(BASIC_DEFAULTS,field.id)) return;
  const desired = field.value, feature = editorFeature(field.id,desired);
  if (!advanced && feature) {
    event.stopImmediatePropagation(); field.value = previous.get(field.id) || BASIC_DEFAULTS[field.id];
    requestFeature(feature).then(allowed => {
      if (!allowed) return;
      field.value = desired; previous.set(field.id,desired); replaying = true;
      field.dispatchEvent(new Event('input',{ bubbles:true })); field.dispatchEvent(new Event('change',{ bubbles:true }));
      replaying = false;
    });
  } else { preserved.delete(field.id); previous.set(field.id,desired); }
},true);
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.dataset.mount === 'none') preserved.delete('mount');
  if (!button || advanced) return;
  const feature = button.dataset.inviteFeature;
  if (!feature) return;
  event.preventDefault(); event.stopImmediatePropagation();
  requestFeature(feature).then(allowed => { if (allowed) button.click(); });
},true);
document.querySelectorAll('[data-mount]').forEach(el => { if (el.dataset.mount !== 'none') el.dataset.inviteFeature = 'mount'; });
document.querySelectorAll('[data-wp-theme]').forEach(el => { if (wallpaperFeature('theme',el.dataset.wpTheme)) el.dataset.inviteFeature = 'colors'; });
document.querySelectorAll('[data-wp-ink]').forEach(el => { if (wallpaperFeature('ink',el.dataset.wpInk)) el.dataset.inviteFeature = 'colors'; });
for (const id of Object.keys(BASIC_DEFAULTS)) for (const option of $(id).options || []) {
  const feature = editorFeature(id,option.value); if (feature) option.dataset.inviteFeature = feature;
}
$('sealFontImport').dataset.inviteFeature = 'seal';
$('heroSample').dataset.inviteFeature = 'scroll';
paintAccess();
export const accessReady = fetch(endpoint,{ credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(4000) })
  .then(async response => {
    // Pure static hosting has no invitation service and remains fully open.
    if (response.status === 404) { enabled = false; advanced = true; }
    else if (response.ok) { const data = await response.json(); enabled = data.enabled; advanced = !enabled || data.authenticated; }
  }).catch(() => {}).finally(paintAccess);
