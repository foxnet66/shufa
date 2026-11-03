export function initArtViewer({ render, navigate }) {
  const $ = id => document.getElementById(id);
  const dialog = $('artViewer'), stage = $('viewerStage'), canvas = $('viewerCanvas');
  let zoom = 1, fitWidth = 0, drag = null;
  function resize() {
    fitWidth = Math.max(1, Math.min(stage.clientWidth - 48, (stage.clientHeight - 48) * canvas.width / canvas.height));
    canvas.style.width = `${fitWidth * zoom}px`;
    $('viewerZoom').value = Math.round(zoom * 100);
    $('viewerPercent').textContent = `${Math.round(zoom * 100)}%`;
    $('viewerIn').disabled = zoom >= 4; $('viewerOut').disabled = zoom <= 1;
  }
  function setZoom(value) {
    const centerX = (stage.scrollLeft + stage.clientWidth / 2) / (canvas.clientWidth || 1);
    const centerY = (stage.scrollTop + stage.clientHeight / 2) / (canvas.clientHeight || 1);
    zoom = Math.max(1, Math.min(4, value)); resize();
    stage.scrollLeft = centerX * canvas.clientWidth - stage.clientWidth / 2;
    stage.scrollTop = centerY * canvas.clientHeight - stage.clientHeight / 2;
  }
  function refresh() {
    if (!dialog.open) return;
    const info = render(canvas);
    if (!info) { dialog.close(); return; }
    $('viewerTitle').textContent = info.title || '无题';
    $('viewerPage').textContent = `${info.index + 1} / ${info.count}`;
    $('viewerPrevious').disabled = info.index === 0;
    $('viewerNext').disabled = info.index === info.count - 1;
    canvas.setAttribute('aria-label', `${info.title || '无题'}，第 ${info.index + 1} 页高清作品`);
    resize();
  }
  $('inspectArtwork').addEventListener('click', () => { zoom = 1; dialog.showModal(); document.body.classList.add('viewing-art'); refresh(); stage.scrollTo(0, 0); });
  $('viewerClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('viewing-art'); drag = null; $('inspectArtwork').focus(); });
  $('viewerZoom').addEventListener('input', e => setZoom(Number(e.target.value) / 100));
  $('viewerIn').addEventListener('click', () => setZoom(zoom + .25));
  $('viewerOut').addEventListener('click', () => setZoom(zoom - .25));
  $('viewerFit').addEventListener('click', () => { setZoom(1); stage.scrollTo(0, 0); });
  $('viewerPrevious').addEventListener('click', () => navigate(-1));
  $('viewerNext').addEventListener('click', () => navigate(1));
  stage.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? .1 : -.1)); }, { passive: false });
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x:e.clientX, y:e.clientY, left:stage.scrollLeft, top:stage.scrollTop };
    stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', e => { if (drag) { stage.scrollLeft = drag.left + drag.x - e.clientX; stage.scrollTop = drag.top + drag.y - e.clientY; } });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(event, () => { drag = null; stage.classList.remove('dragging'); });
  dialog.addEventListener('keydown', e => {
    if (e.target.matches('input')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); navigate(e.key === 'ArrowLeft' ? 1 : -1); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom + .25); }
    if (e.key === '-') { e.preventDefault(); setZoom(zoom - .25); }
    if (e.key === '0') { e.preventDefault(); setZoom(1); }
  });
  window.addEventListener('resize', () => { if (dialog.open) resize(); });
  return { refresh };
}
