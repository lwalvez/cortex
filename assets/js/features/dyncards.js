/* =========================================================
   DYNAMIC CARDS · cartões personalizados no dashboard
   ========================================================= */

const DC_STATUS = {
  andamento: { label:'Em andamento', icon:'⚙', color:'#39d4ff' },
  pendente:  { label:'Pendente',     icon:'⏳', color:'#ffb86b' },
  concluido: { label:'Concluído',    icon:'✓', color:'#5cffb1' },
  urgente:   { label:'Urgente',      icon:'!', color:'#ff7a9a' }
};
const DC_PRIORITY = {
  baixa:   { label:'Baixa',   weight:1, color:'#7e6aa8' },
  media:   { label:'Média',   weight:2, color:'#39d4ff' },
  alta:    { label:'Alta',    weight:3, color:'#ffb86b' },
  critica: { label:'Crítica', weight:4, color:'#ff7a9a' }
};
const DC_COLORS = ['#b061ff','#39d4ff','#5cffb1','#ffb86b','#ff7a9a','#e26bff','#ff8c50','#7a2bff'];

let dcDragId = null;
let dcSaveTimer = null;
let dcCollapseAllState = false;

/* ---------- CRUD ---------- */
function dcAddCard(){
  state.dynCards ||= [];
  const card = {
    id: uid(),
    title: '',
    subtitle: '',
    desc: '',
    status: 'andamento',
    priority: 'media',
    date: todayStr(),
    tags: [],
    color: DC_COLORS[Math.floor(Math.random()*DC_COLORS.length)],
    minimized: false,
    locked: false,
    order: (state.dynCards[0]?.order ?? 0) - 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    _new: true
  };
  state.dynCards.unshift(card);
  save();
  renderDynCards();
  setTimeout(()=>{
    const el = document.querySelector(`.dc-card[data-id="${card.id}"]`);
    if(el){
      el.classList.add('dc-spawn');
      const t = el.querySelector('.dc-title-input');
      if(t) t.focus();
      setTimeout(()=>el.classList.remove('dc-spawn'), 600);
    }
    delete card._new;
  }, 20);
}

function dcUpdate(id, patch, opts={}){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  Object.assign(c, patch, { updated: new Date().toISOString() });
  clearTimeout(dcSaveTimer);
  dcSaveTimer = setTimeout(save, 300);
  if(opts.rerender) renderDynCards();
}

function dcDelete(id){
  const el = document.querySelector(`.dc-card[data-id="${id}"]`);
  const doDelete = () => instantDelete({
    from: state.dynCards,
    predicate: c => c.id === id,
    label: 'Cartão excluído',
    rerender: renderDynCards
  });
  if(el){
    el.classList.add('dc-vanish');
    setTimeout(doDelete, 220);
  } else {
    doDelete();
  }
}

function dcDuplicate(id){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  const copy = {
    ...c,
    id: uid(),
    title: (c.title||'') + ' (cópia)',
    order: c.order - 0.0001,
    tags: [...(c.tags||[])],
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  delete copy._new;
  state.dynCards.unshift(copy);
  save(); renderDynCards();
  setTimeout(()=>{
    const el = document.querySelector(`.dc-card[data-id="${copy.id}"]`);
    if(el){ el.classList.add('dc-spawn'); setTimeout(()=>el.classList.remove('dc-spawn'),600); }
  }, 20);
}

function dcToggleMinimize(id){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  c.minimized = !c.minimized;
  save(); renderDynCards();
}

function dcToggleLock(id){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  c.locked = !c.locked;
  save(); renderDynCards();
}

function dcForceSave(id){
  save();
  const el = document.querySelector(`.dc-card[data-id="${id}"] .dc-saved-flash`);
  if(el){
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 1200);
  }
}

function dcAddTag(id, raw){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  const tag = (raw||'').trim().replace(/^#/,'');
  if(!tag) return;
  c.tags ||= [];
  if(!c.tags.includes(tag)) c.tags.push(tag);
  dcUpdate(id, {}, { rerender:true });
}
function dcRemoveTag(id, tag){
  const c = state.dynCards.find(x=>x.id===id);
  if(!c) return;
  c.tags = (c.tags||[]).filter(t=>t!==tag);
  dcUpdate(id, {}, { rerender:true });
}
function dcTagInputKey(e, id){
  if(e.key === 'Enter' || e.key === ','){
    e.preventDefault();
    dcAddTag(id, e.target.value);
    e.target.value = '';
  }
}

/* ---------- Toolbar / filters ---------- */
function dcSetSearch(v){
  state.dynCardsUi ||= {};
  state.dynCardsUi.search = (v||'').toLowerCase();
  save();
  renderDynCards({ skipInputs:true });
}
function dcSetFilter(key, value){
  state.dynCardsUi ||= {};
  state.dynCardsUi[key] = value;
  save();
  renderDynCards();
}
function dcToggleCollapseAll(){
  dcCollapseAllState = !dcCollapseAllState;
  (state.dynCards||[]).forEach(c => c.minimized = dcCollapseAllState);
  save(); renderDynCards();
  const btn = document.getElementById('dcCollapseAllBtn');
  if(btn) btn.textContent = dcCollapseAllState ? '⊞ Expandir todos' : '⊟ Recolher todos';
}

/* ---------- Drag/drop reorder ---------- */
function dcOnDragStart(e, id){
  dcDragId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dc-dragging');
}
function dcOnDragEnd(e){
  e.currentTarget.classList.remove('dc-dragging');
  document.querySelectorAll('.dc-card').forEach(c => c.classList.remove('dc-drag-over'));
  dcDragId = null;
}
function dcOnDragOver(e, id){
  if(!dcDragId || dcDragId === id) return;
  e.preventDefault();
  e.currentTarget.classList.add('dc-drag-over');
}
function dcOnDragLeave(e){
  e.currentTarget.classList.remove('dc-drag-over');
}
function dcOnDrop(e, id){
  e.preventDefault();
  e.currentTarget.classList.remove('dc-drag-over');
  if(!dcDragId || dcDragId === id) return;
  const list = [...state.dynCards].sort((a,b)=>(a.order||0)-(b.order||0));
  const fromIdx = list.findIndex(c=>c.id===dcDragId);
  const toIdx = list.findIndex(c=>c.id===id);
  if(fromIdx<0||toIdx<0) return;
  const [moved] = list.splice(fromIdx,1);
  list.splice(toIdx,0,moved);
  list.forEach((c,i)=>c.order = i);
  state.dynCardsUi.sort = 'manual';
  save();
  renderDynCards();
}

/* ---------- Rendering ---------- */
function dcGetFiltered(){
  const ui = state.dynCardsUi || {};
  let list = [...(state.dynCards||[])];
  if(ui.search){
    const q = ui.search;
    list = list.filter(c =>
      (c.title||'').toLowerCase().includes(q) ||
      (c.subtitle||'').toLowerCase().includes(q) ||
      (c.desc||'').toLowerCase().includes(q) ||
      (c.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  if(ui.filterStatus && ui.filterStatus !== 'todos'){
    list = list.filter(c => (c.status||'andamento') === ui.filterStatus);
  }
  const sort = ui.sort || 'manual';
  if(sort === 'priority'){
    list.sort((a,b) => (DC_PRIORITY[b.priority||'media'].weight) - (DC_PRIORITY[a.priority||'media'].weight));
  } else if(sort === 'date'){
    list.sort((a,b) => (a.date||'').localeCompare(b.date||''));
  } else if(sort === 'created'){
    list.sort((a,b) => (b.created||'').localeCompare(a.created||''));
  } else if(sort === 'title'){
    list.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  } else {
    list.sort((a,b) => (a.order||0) - (b.order||0));
  }
  return list;
}

function renderDynCards(opts={}){
  const grid = document.getElementById('dcGrid');
  const stats = document.getElementById('dcStats');
  if(!grid) return;

  // sync inputs from state (avoid stomping during typing on search)
  if(!opts.skipInputs){
    const ui = state.dynCardsUi || {};
    const s = document.getElementById('dcSearch');
    if(s && s.value !== (ui.search||'')) s.value = ui.search || '';
    const fs = document.getElementById('dcFilterStatus');
    if(fs) fs.value = ui.filterStatus || 'todos';
    const so = document.getElementById('dcSort');
    if(so) so.value = ui.sort || 'manual';
  }

  const all = state.dynCards || [];
  const filtered = dcGetFiltered();

  if(stats){
    const counts = { andamento:0, pendente:0, concluido:0, urgente:0 };
    all.forEach(c => { counts[c.status||'andamento']++; });
    stats.innerHTML = `
      <div class="dc-stat"><span class="dc-stat-num">${all.length}</span><span class="dc-stat-lbl">Total</span></div>
      <div class="dc-stat" style="--st:#39d4ff"><span class="dc-stat-num">${counts.andamento}</span><span class="dc-stat-lbl">⚙ Andamento</span></div>
      <div class="dc-stat" style="--st:#ffb86b"><span class="dc-stat-num">${counts.pendente}</span><span class="dc-stat-lbl">⏳ Pendentes</span></div>
      <div class="dc-stat" style="--st:#5cffb1"><span class="dc-stat-num">${counts.concluido}</span><span class="dc-stat-lbl">✓ Concluídos</span></div>
      <div class="dc-stat" style="--st:#ff7a9a"><span class="dc-stat-num">${counts.urgente}</span><span class="dc-stat-lbl">! Urgentes</span></div>
    `;
  }

  if(!filtered.length){
    grid.innerHTML = `<div class="dc-empty">
      <div style="font-size:46px;opacity:0.4">🗃️</div>
      <div style="margin-top:10px;font-weight:700;color:var(--text-dim)">${all.length ? 'Nada encontrado neste filtro.' : 'Nenhum cartão ainda.'}</div>
      <div style="font-size:12px;color:var(--text-mute);margin-top:6px">${all.length ? 'Ajuste a busca ou filtros acima.' : 'Clique em <strong>+ Adicionar Cartão</strong> para começar.'}</div>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(c => dcCardHtml(c)).join('');
}

function dcCardHtml(c){
  const st = DC_STATUS[c.status||'andamento'] || DC_STATUS.andamento;
  const pr = DC_PRIORITY[c.priority||'media'] || DC_PRIORITY.media;
  const color = c.color || DC_COLORS[0];
  const locked = !!c.locked;
  const ro = locked ? 'readonly' : '';
  const roDisabled = locked ? 'disabled' : '';
  const minimized = !!c.minimized;
  const dateLabel = c.date ? formatDate(c.date) : '—';

  const tagChips = (c.tags||[]).map(t=>`
    <span class="dc-tag">#${escapeHtml(t)}${locked?'':`<span class="x" onclick="dcRemoveTag('${c.id}','${t}')">×</span>`}</span>
  `).join('');

  const colorDots = DC_COLORS.map(col=>`
    <div class="dc-color-dot ${col===color?'selected':''}" style="background:${col}" onclick="${locked?'':`dcUpdate('${c.id}',{color:'${col}'},{rerender:true})`}"></div>
  `).join('');

  return `
    <article class="dc-card ${minimized?'is-min':''} ${locked?'is-locked':''}" data-id="${c.id}"
             style="--card-accent:${color}"
             draggable="${locked?'false':'true'}"
             ondragstart="dcOnDragStart(event,'${c.id}')"
             ondragend="dcOnDragEnd(event)"
             ondragover="dcOnDragOver(event,'${c.id}')"
             ondragleave="dcOnDragLeave(event)"
             ondrop="dcOnDrop(event,'${c.id}')">
      <div class="dc-glow"></div>
      <header class="dc-head">
        <span class="dc-drag-handle" title="Arrastar">⋮⋮</span>
        <span class="dc-status-pill" style="--st:${st.color}">${st.icon} ${st.label}</span>
        <span class="dc-priority-pill" style="--pr:${pr.color}" title="Prioridade ${pr.label}">${'●'.repeat(pr.weight)}${'○'.repeat(4-pr.weight)}</span>
        <div class="dc-head-actions">
          <button class="dc-act" title="${locked?'Desbloquear edição':'Bloquear (modo leitura)'}" onclick="dcToggleLock('${c.id}')">${locked?'🔒':'✏️'}</button>
          <button class="dc-act" title="Salvar" onclick="dcForceSave('${c.id}')">💾</button>
          <button class="dc-act" title="Duplicar" onclick="dcDuplicate('${c.id}')">📑</button>
          <button class="dc-act" title="${minimized?'Expandir':'Minimizar'}" onclick="dcToggleMinimize('${c.id}')">${minimized?'▾':'▴'}</button>
          <button class="dc-act dc-act-danger" title="Excluir" onclick="dcDelete('${c.id}')">✕</button>
        </div>
      </header>

      <input type="text" class="dc-title-input" value="${escapeAttr(c.title||'')}" ${ro}
             placeholder="Título do cartão..." oninput="dcUpdate('${c.id}',{title:this.value})" />
      <input type="text" class="dc-subtitle-input" value="${escapeAttr(c.subtitle||'')}" ${ro}
             placeholder="Subtítulo · categoria · contexto..." oninput="dcUpdate('${c.id}',{subtitle:this.value})" />

      <div class="dc-body">
        <textarea class="dc-desc" ${ro} placeholder="Descrição detalhada..." oninput="dcUpdate('${c.id}',{desc:this.value})">${escapeHtml(c.desc||'')}</textarea>

        <div class="dc-fields">
          <label class="dc-field">
            <span class="dc-field-lbl">Status</span>
            <select class="dc-field-input" ${roDisabled} onchange="dcUpdate('${c.id}',{status:this.value},{rerender:true})">
              ${Object.entries(DC_STATUS).map(([k,v])=>`<option value="${k}" ${c.status===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </label>
          <label class="dc-field">
            <span class="dc-field-lbl">Prioridade</span>
            <select class="dc-field-input" ${roDisabled} onchange="dcUpdate('${c.id}',{priority:this.value},{rerender:true})">
              ${Object.entries(DC_PRIORITY).map(([k,v])=>`<option value="${k}" ${c.priority===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </label>
          <label class="dc-field">
            <span class="dc-field-lbl">Data</span>
            <input type="date" class="dc-field-input" ${ro} value="${c.date||''}" onchange="dcUpdate('${c.id}',{date:this.value})" />
          </label>
        </div>

        <div class="dc-tags-row">
          <span class="dc-field-lbl">Tags</span>
          ${tagChips}
          ${locked?'':`<input type="text" class="dc-tag-input" placeholder="+ tag (Enter)" onkeydown="dcTagInputKey(event,'${c.id}')" />`}
        </div>

        <div class="dc-color-row">
          <span class="dc-field-lbl">Cor de destaque</span>
          <div class="dc-color-picker">${colorDots}</div>
        </div>
      </div>

      <footer class="dc-foot">
        <span>📅 ${dateLabel}</span>
        <span class="dc-saved-flash">✓ salvo</span>
        <span style="margin-left:auto;opacity:0.6">${new Date(c.updated).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
      </footer>
    </article>
  `;
}
