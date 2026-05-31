/* =========================================================
   UTILS · helpers genéricos (escape, format, etc)
   ========================================================= */
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s){ return escapeHtml(s); }
function formatDate(s){
  if(!s) return '';
  const [y,m,d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/* =========================================================
   TOAST SYSTEM · feedback discreto, opcional Undo
   Uso:
     cortexToast({ msg:'Tarefa excluída', type:'success', undo:()=>...})
     cortexToast('Salvo')
   ========================================================= */
function getToastStack(){
  let s = document.getElementById('toastStack');
  if(!s){
    s = document.createElement('div');
    s.id = 'toastStack';
    s.className = 'toast-stack';
    document.body.appendChild(s);
  }
  return s;
}
const TOAST_ICONS = { success:'✓', error:'✕', warn:'⚠', info:'ℹ' };
function cortexToast(opts){
  if(typeof opts === 'string') opts = { msg: opts };
  const { msg='', type='info', duration=opts.undo?5000:2400, undo=null } = opts || {};
  const stack = getToastStack();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = TOAST_ICONS[type] || '•';
  el.innerHTML = `
    <span class="t-icon">${icon}</span>
    <span class="t-msg">${escapeHtml(msg)}</span>
    ${undo ? `<button class="t-undo" type="button">Desfazer</button>` : ''}
    <button class="t-close" type="button" aria-label="Fechar">×</button>
    <span class="t-progress" style="width:100%"></span>
  `;
  stack.appendChild(el);
  // Entry animation (next frame)
  requestAnimationFrame(()=> el.classList.add('show'));
  // Progress bar
  const bar = el.querySelector('.t-progress');
  if(bar){
    bar.style.transitionDuration = duration + 'ms';
    requestAnimationFrame(()=>{ bar.style.width = '0%'; });
  }
  let timer = setTimeout(close, duration);
  function close(){
    if(!el.parentNode) return;
    clearTimeout(timer);
    el.classList.add('leaving');
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 280);
  }
  el.querySelector('.t-close').addEventListener('click', close);
  if(undo){
    el.querySelector('.t-undo').addEventListener('click', ()=>{
      try { undo(); } catch(e){ console.warn('undo failed', e); }
      close();
    });
  }
  return { close };
}

/* =========================================================
   instantDelete · remove + save + rerender + toast c/ Undo
   ========================================================= */
function instantDelete({ from, predicate, label='Item excluído', rerender, after }){
  if(!Array.isArray(from)) return false;
  const idx = from.findIndex(predicate);
  if(idx < 0) return false;
  const [removed] = from.splice(idx, 1);
  const restorePos = idx;
  if(typeof save === 'function') save();
  if(typeof rerender === 'function') rerender();
  cortexToast({
    msg: label,
    type: 'success',
    undo: () => {
      from.splice(Math.min(restorePos, from.length), 0, removed);
      if(typeof save === 'function') save();
      if(typeof rerender === 'function') rerender();
      cortexToast({ msg:'Restaurado', type:'info' });
      if(typeof after === 'function') after('undo', removed);
    }
  });
  if(typeof after === 'function') after('delete', removed);
  return true;
}

/* =========================================================
   instantClear · esvazia array (ou substitui) + Undo
   ========================================================= */
function instantClear({ get, set, label='Lista limpa', rerender }){
  const snapshot = JSON.parse(JSON.stringify(get()));
  set([]);
  if(typeof save === 'function') save();
  if(typeof rerender === 'function') rerender();
  cortexToast({
    msg: label,
    type: 'success',
    undo: () => {
      set(snapshot);
      if(typeof save === 'function') save();
      if(typeof rerender === 'function') rerender();
      cortexToast({ msg:'Restaurado', type:'info' });
    }
  });
}

/* =========================================================
   holdConfirm · botão que executa após segurar X ms (ação destrutiva)
   Substitui confirms aninhados (zona de perigo).
   Cria um botão programaticamente OU atacha a um existente.
   ========================================================= */
function attachHoldConfirm(btn, { duration=1500, onConfirm, labelHold='Segure para confirmar', labelReady=null }){
  if(!btn) return;
  if(btn.dataset.hcBound === '1') return;
  btn.dataset.hcBound = '1';
  // Estrutura interna
  const originalText = btn.innerHTML;
  const labelText = labelReady || originalText;
  btn.classList.add('hold-confirm');
  btn.innerHTML = `<span class="hc-fill"></span><span class="hc-label">${labelText}</span>`;
  const fill = btn.querySelector('.hc-fill');
  const label = btn.querySelector('.hc-label');
  let startTs = 0, raf = null, holding = false, committed = false;

  function reset(){
    holding = false;
    fill.style.transition = 'width 0.18s ease';
    fill.style.width = '0%';
    label.textContent = labelText;
    btn.classList.remove('committed');
  }
  function start(e){
    if(committed) return;
    e.preventDefault();
    holding = true;
    startTs = Date.now();
    fill.style.transition = `width ${duration}ms linear`;
    fill.style.width = '100%';
    label.textContent = labelHold;
    raf = setTimeout(()=>{
      if(!holding) return;
      committed = true;
      btn.classList.add('committed');
      label.textContent = '✓ Executando...';
      try { onConfirm && onConfirm(); } catch(err){ console.warn(err); }
      setTimeout(()=>{ committed = false; reset(); }, 600);
    }, duration);
  }
  function cancel(){
    if(committed) return;
    clearTimeout(raf);
    reset();
  }
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start, {passive:false});
  ['mouseup','mouseleave','touchend','touchcancel','blur'].forEach(ev =>
    btn.addEventListener(ev, cancel)
  );
}

/* Helper rápido pra ações já bound a onclick: troca confirm() por hold.
   Em vez de:  if(!confirm('apagar?')) return; doIt()
   Use:        holdConfirmAction(btnElement, 'Apagar tudo', doIt)
*/
function holdConfirmAction(btn, labelReady, onConfirm, opts={}){
  attachHoldConfirm(btn, {
    duration: opts.duration || 1500,
    onConfirm,
    labelReady,
    labelHold: opts.labelHold || 'Segure para confirmar...'
  });
}

/* =========================================================
   togglePill · render helper pra componente reutilizável
   Uso:
     togglePillHtml(state.settings.animations, 'animations')
   O click só atualiza a classe (não re-renderiza o modal),
   preservando a animação de slide do thumb.
   ========================================================= */
function togglePillHtml(checked, settingKey){
  return `
    <button type="button" class="toggle-pill ${checked?'on':''}" onclick="togglePillFlip(this, '${settingKey}')" aria-pressed="${checked}">
      <span class="tp-track"><span class="tp-on">On</span><span class="tp-off">Off</span></span>
      <span class="tp-thumb"></span>
    </button>
  `;
}
function togglePillFlip(btn, key){
  const willBe = !btn.classList.contains('on');
  btn.classList.toggle('on', willBe);
  btn.setAttribute('aria-pressed', willBe);
  // pulse no elemento vivo
  btn.classList.add('pulse');
  setTimeout(()=>btn.classList.remove('pulse'), 420);
  // aplica no estado sem re-render do modal (preserva animação)
  if(typeof state !== 'undefined' && state && state.settings){
    state.settings[key] = willBe;
    if(typeof save === 'function') save();
    if(typeof applySettings === 'function') applySettings();
  }
}
