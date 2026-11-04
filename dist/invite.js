const form = document.getElementById('inviteForm');
const input = document.getElementById('inviteCode');
const message = document.getElementById('inviteMessage');
const submit = document.getElementById('inviteSubmit');
const endpoint = new URL('./api/invite', location.href);

function returnToStudio() {
  const value = new URLSearchParams(location.search).get('next') || './';
  let target;
  try { target = new URL(value, location.origin); } catch { target = new URL('/', location.origin); }
  if (target.origin !== location.origin || target.pathname.startsWith('/invite') || target.pathname.startsWith('/api/')) target = new URL('/', location.origin);
  if (!target.hash && location.hash) target.hash = location.hash;
  location.replace(target.pathname + target.search + target.hash);
}

input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); message.textContent = ''; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true; submit.textContent = '正在入席…'; message.textContent = '';
  try {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: input.value }) });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      message.textContent = data.error || '暂时无法进入，请稍后再试。';
      if (response.status === 401) input.setAttribute('aria-invalid', 'true');
      input.focus(); return;
    }
    input.value = ''; returnToStudio();
  } catch { message.textContent = '暂时无法验证，请检查网络后再试。'; }
  finally { submit.disabled = false; submit.textContent = '解锁试用'; }
});

fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => {
  if (data?.authenticated) returnToStudio();
  else if (data && !data.configured) { message.textContent = '邀请入口暂未配置好，请联系邀请人。'; submit.disabled = true; }
}).catch(() => {});
