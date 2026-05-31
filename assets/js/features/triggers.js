/* =========================================================
   TRIGGERS · atalhos clicáveis para sites
   ========================================================= */
const TRIGGER_COLORS = ['#b061ff','#e26bff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#ff8c50','#00ff41','#ffd700','#ff1744'];

function defaultTriggers(){ return []; }
function normalizeUrl(url){
  if(!url) return '';
  url = url.trim();
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}
function displayUrl(url){
  if(!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/,'');
}
function openTrigger(id){
  const t = state.triggers.find(x => x.id === id);
  if(!t) return;
  window.open(normalizeUrl(t.url), '_blank', 'noopener,noreferrer');
}
function renderTriggers(){
  const grid = document.getElementById('triggersGrid');
  if(!grid) return;
  const list = state.triggers || [];
  if(!list.length){
    grid.innerHTML = `<div class="trigger-empty">⚡ Nenhum trigger ainda.<br>Clique em <strong>+ Novo Trigger</strong> para criar seu primeiro atalho.</div>`;
    return;
  }
  grid.innerHTML = list.map(t => `
    <div class="trigger-card" style="--t-color:${t.color || '#b061ff'}" onclick="openTrigger('${t.id}')" title="Abrir ${escapeAttr(t.name)}">
      <div class="trigger-icon">${escapeHtml(t.icon || '⚡')}</div>
      <div class="trigger-info">
        <div class="trigger-name">${escapeHtml(t.name)}</div>
        <div class="trigger-url">${escapeHtml(displayUrl(t.url))}</div>
      </div>
      <div class="trigger-actions">
        <button class="btn-icon" onclick="event.stopPropagation();openTriggerModal('${t.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="event.stopPropagation();deleteTrigger('${t.id}')" style="color:#ff7a9a" title="Excluir">🗑️</button>
      </div>
    </div>
  `).join('');
}
function renderTriggerColors(selected){
  const row = document.getElementById('trgColorRow');
  if(!row) return;
  row.innerHTML = TRIGGER_COLORS.map(c => `
    <div class="color-opt ${c===selected?'selected':''}" style="background:${c};color:${c}" onclick="pickTriggerColor('${c}')"></div>
  `).join('');
}
function pickTriggerColor(c){
  document.getElementById('trgColor').value = c;
  renderTriggerColors(c);
}
function openTriggerModal(id=null){
  const form = document.getElementById('triggerForm');
  form.reset();
  document.getElementById('trgId').value = '';
  document.getElementById('trgColor').value = TRIGGER_COLORS[0];
  document.getElementById('trgIcon').value = '⚡';
  renderTriggerColors(TRIGGER_COLORS[0]);
  document.getElementById('trgDeleteBtn').style.display = 'none';
  document.getElementById('triggerModalTitle').textContent = 'Novo Trigger';
  if(id){
    const t = state.triggers.find(x => x.id === id);
    if(t){
      document.getElementById('trgId').value = t.id;
      document.getElementById('trgName').value = t.name;
      document.getElementById('trgUrl').value = t.url;
      document.getElementById('trgIcon').value = t.icon || '⚡';
      document.getElementById('trgColor').value = t.color || TRIGGER_COLORS[0];
      renderTriggerColors(t.color || TRIGGER_COLORS[0]);
      document.getElementById('trgDeleteBtn').style.display = '';
      document.getElementById('triggerModalTitle').textContent = 'Editar Trigger';
    }
  }
  openModal('triggerModal');
}
function saveTrigger(e){
  e.preventDefault();
  const id = document.getElementById('trgId').value;
  const data = {
    name: document.getElementById('trgName').value.trim(),
    url: normalizeUrl(document.getElementById('trgUrl').value),
    icon: document.getElementById('trgIcon').value.trim() || '⚡',
    color: document.getElementById('trgColor').value || TRIGGER_COLORS[0],
  };
  if(id){
    const t = state.triggers.find(x => x.id === id);
    Object.assign(t, data);
  } else {
    state.triggers.push({id:uid(), ...data, createdAt:new Date().toISOString()});
  }
  save(); closeModal('triggerModal'); renderTriggers();
}
function deleteTrigger(idArg){
  const id = idArg || document.getElementById('trgId').value;
  if(!id) return;
  if(document.getElementById('triggerModal').classList.contains('show')) closeModal('triggerModal');
  instantDelete({
    from: state.triggers,
    predicate: t => t.id === id,
    label: 'Trigger excluído',
    rerender: renderTriggers
  });
}

