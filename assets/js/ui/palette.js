/* =========================================================
   COMMAND PALETTE · Cmd+K / Ctrl+K
   - Modal flutuante centralizado
   - Busca unified: pages, notas, tarefas, eventos, triggers, sites populares, actions
   - Arrow keys navega, Enter executa, Esc fecha
   ========================================================= */

const PALETTE_PAGES = [
  { page:'cortex',       icon:'🧠', label:'CORTEX' },
  { page:'calendar',     icon:'📅', label:'Calendário' },
  { page:'tasks',        icon:'✅', label:'Tarefas' },
  { page:'kanban',       icon:'🗂️', label:'Kanban' },
  { page:'projects',     icon:'🚀', label:'Projetos' },
  { page:'triggers',     icon:'⚡', label:'Triggers' },
  { page:'habits',       icon:'✨', label:'Hábitos' },
  { page:'trackers',     icon:'📊', label:'Trackers' },
  { page:'dashboard',    icon:'💰', label:'Dashboard' },
  { page:'mentalidade',  icon:'🧘', label:'Mentalidade' },
  { page:'notes',        icon:'📝', label:'Notas' },
  { page:'drafts',       icon:'✏️', label:'Rascunhos' },
  { page:'info',         icon:'🪪', label:'Informações' },
];

const PALETTE_ACTIONS = [
  { icon:'⚙️', label:'Abrir Configurações',     run:()=>openSettings() },
  { icon:'⌨️', label:'Atalhos de teclado',       run:()=>openShortcutsHelp() },
  { icon:'🔄', label:'Recolher/expandir sidebar', run:()=>toggleSidebarCollapsed() },
  { icon:'🗑️', label:'Limpar conversa CORTEX',   run:()=>clearCortexChat() },
  { icon:'🌗', label:'Trocar tema (dark/light)',  run:()=>{ const t = state.settings?.theme==='light'?'dark':'light'; setSetting('theme',t); } },
  { icon:'🎴', label:'Alternar layout Dashboard', run:()=>toggleDashboardLayout() },
  { icon:'+ ', label:'Nova transação',           run:()=>openTxModal() },
  { icon:'+ ', label:'Novo evento',              run:()=>openEventModal() },
  { icon:'+ ', label:'Novo projeto',             run:()=>openProjectModal() },
  { icon:'+ ', label:'Novo hábito',              run:()=>openHabitItemModal() },
  { icon:'+ ', label:'Novo trigger',             run:()=>openTriggerModal() },
  { icon:'+ ', label:'Nova conta a pagar',       run:()=>openBillModal() },
  { icon:'+ ', label:'Novo rascunho',            run:()=>{ navigateToPage('drafts'); if(typeof newDraft==='function') newDraft(); } },
];

let _paletteSel = 0;
let _paletteItems = [];
let _paletteSearch = '';

function paletteIndex(){
  // Junta tudo num pool de itens pesquisáveis
  const items = [];
  PALETTE_PAGES.forEach(p => items.push({
    icon:p.icon, label:p.label, sub:'Página',
    keywords: ('page '+p.label).toLowerCase(),
    run: () => navigateToPage(p.page)
  }));
  PALETTE_ACTIONS.forEach(a => items.push({
    icon:a.icon, label:a.label, sub:'Ação',
    keywords: ('action '+a.label).toLowerCase(),
    run: a.run
  }));
  // Notas
  (state.notes||[]).forEach(n => items.push({
    icon:'📝', label:(n.text||'').slice(0,80), sub:'Nota',
    keywords: ('note '+(n.text||'')).toLowerCase(),
    run: () => navigateToPage('notes')
  }));
  // Tarefas
  (state.trackers?.todos||[]).filter(t => !t.done).forEach(t => items.push({
    icon:'✅', label:t.text||t.name||'', sub:'Tarefa',
    keywords: ('task todo '+(t.text||t.name||'')).toLowerCase(),
    run: () => navigateToPage('tasks')
  }));
  // Eventos próximos (30d)
  const today = todayStr();
  (state.events||[])
    .filter(e => e.date >= today)
    .slice(0,30)
    .forEach(e => items.push({
      icon:'📅', label:`${e.title} · ${e.date}${e.start?' '+e.start:''}`, sub:'Evento',
      keywords: ('event '+e.title+' '+e.date).toLowerCase(),
      run: () => { navigateToPage('calendar'); }
    }));
  // Triggers (sites salvos)
  (state.triggers||[]).forEach(t => items.push({
    icon: t.icon || '⚡', label:t.name, sub:t.url,
    keywords: ('trigger site '+t.name+' '+t.url).toLowerCase(),
    run: () => window.open(t.url, '_blank', 'noopener,noreferrer')
  }));
  // Projetos
  (state.projects||[]).forEach(p => items.push({
    icon:'🚀', label:p.name, sub:'Projeto · '+(p.status||''),
    keywords: ('project '+p.name).toLowerCase(),
    run: () => navigateToPage('projects')
  }));
  // Hábitos
  (state.habitsList||[]).filter(h => !h.archived).forEach(h => items.push({
    icon:h.emoji||'✨', label:h.name, sub:'Hábito',
    keywords: ('habit '+h.name+' '+(h.category||'')).toLowerCase(),
    run: () => navigateToPage('habits')
  }));
  // Rascunhos
  (state.drafts||[]).forEach(d => items.push({
    icon:'✏️', label:(d.title||(d.content||'').slice(0,60)||'sem título'), sub:'Rascunho',
    keywords: ('draft '+(d.title||'')+' '+(d.content||'')).toLowerCase(),
    run: () => navigateToPage('drafts')
  }));
  return items;
}

function paletteFilter(query, pool){
  const q = (query||'').trim().toLowerCase();
  if(!q) return pool.slice(0, 30);
  const tokens = q.split(/\s+/).filter(Boolean);
  // Score: cada token deve aparecer; bonus por match no label vs keywords
  return pool.map(it => {
    const lbl = (it.label||'').toLowerCase();
    let score = 0;
    for(const t of tokens){
      if(!it.keywords.includes(t)) return null;
      if(lbl.startsWith(t)) score += 10;
      else if(lbl.includes(t)) score += 4;
      else score += 1;
    }
    return { it, score };
  })
  .filter(x => x)
  .sort((a,b) => b.score - a.score)
  .slice(0, 50)
  .map(x => x.it);
}

function openPalette(){
  let m = document.getElementById('cortexPalette');
  if(!m){
    m = document.createElement('div');
    m.id = 'cortexPalette';
    m.className = 'palette-backdrop';
    m.innerHTML = `
      <div class="palette" role="dialog" aria-label="Command palette">
        <div class="palette-input-wrap">
          <span class="palette-icon">🔍</span>
          <input type="text" id="paletteInput" placeholder="Digite pra buscar tarefas, notas, eventos, ações…" autocomplete="off" spellcheck="false" />
          <kbd class="palette-esc">esc</kbd>
        </div>
        <div class="palette-list" id="paletteList"></div>
        <div class="palette-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> selecionar</span>
          <span><kbd>esc</kbd> fechar</span>
        </div>
      </div>`;
    m.onclick = (e) => { if(e.target === m) closePalette(); };
    document.body.appendChild(m);
    const inp = document.getElementById('paletteInput');
    inp.addEventListener('input', (e) => { _paletteSearch = e.target.value; _paletteSel = 0; renderPalette(); });
    inp.addEventListener('keydown', paletteKey);
  }
  _paletteSearch = '';
  _paletteSel = 0;
  document.getElementById('paletteInput').value = '';
  m.classList.add('is-open');
  renderPalette();
  setTimeout(()=>document.getElementById('paletteInput').focus(), 30);
}
function closePalette(){
  document.getElementById('cortexPalette')?.classList.remove('is-open');
}
function paletteKey(e){
  if(e.key === 'Escape'){ e.preventDefault(); closePalette(); return; }
  if(e.key === 'ArrowDown'){ e.preventDefault(); _paletteSel = Math.min(_paletteItems.length-1, _paletteSel+1); renderPalette(); return; }
  if(e.key === 'ArrowUp'){ e.preventDefault(); _paletteSel = Math.max(0, _paletteSel-1); renderPalette(); return; }
  if(e.key === 'Enter'){ e.preventDefault(); paletteRunSelected(); return; }
}
function paletteRunSelected(){
  const it = _paletteItems[_paletteSel];
  if(!it) return;
  closePalette();
  try { it.run(); } catch(e){ console.warn('palette run failed', e); }
}
function renderPalette(){
  const pool = paletteIndex();
  _paletteItems = paletteFilter(_paletteSearch, pool);
  const list = document.getElementById('paletteList');
  if(!list) return;
  if(!_paletteItems.length){
    list.innerHTML = `<div class="palette-empty">Nada encontrado</div>`;
    return;
  }
  list.innerHTML = _paletteItems.map((it, i) => `
    <div class="palette-item ${i===_paletteSel?'is-active':''}"
         data-i="${i}"
         onclick="_paletteSel=${i};paletteRunSelected()"
         onmouseenter="_paletteSel=${i};document.querySelectorAll('.palette-item').forEach((el,idx)=>el.classList.toggle('is-active',idx===${i}))">
      <span class="pi-icon">${escapeHtml(it.icon||'•')}</span>
      <div class="pi-body">
        <div class="pi-label">${escapeHtml(it.label||'')}</div>
        ${it.sub ? `<div class="pi-sub">${escapeHtml(it.sub)}</div>` : ''}
      </div>
    </div>
  `).join('');
  // scroll into view do selecionado
  const sel = list.querySelector('.palette-item.is-active');
  if(sel) sel.scrollIntoView({ block:'nearest' });
}

/* Atalho global Cmd+K / Ctrl+K */
document.addEventListener('keydown', (e) => {
  if((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
    e.preventDefault();
    const m = document.getElementById('cortexPalette');
    if(m && m.classList.contains('is-open')) closePalette();
    else openPalette();
  }
}, true);

window.openPalette = openPalette;
window.closePalette = closePalette;
