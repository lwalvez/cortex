/* =========================================================
   NOTES · MINDSET · MANTRAS (mesmo motor)
   ========================================================= */
const NOTE_COLORS = ['yellow','green','blue','purple','pink','orange'];
const NOTE_KINDS = {
  notes:   { grid:'notesGrid',   defaultColor:'purple', emptyMsg:'Nenhuma nota ainda. Crie a primeira!',     newTitle:'Nova nota' },
  mindset: { grid:'mindsetGrid', defaultColor:'blue',   emptyMsg:'Nenhum mindset ainda. Crie o primeiro!',   newTitle:'Novo mindset' },
  mantras: { grid:'mantrasGrid', defaultColor:'pink',   emptyMsg:'Nenhum mantra ainda. Crie o primeiro!',    newTitle:'Novo mantra' }
};
function defaultMindset(){ return []; }
function defaultMantras(){ return []; }
function addNote(kind='notes'){
  const cfg = NOTE_KINDS[kind];
  state[kind].unshift({id:uid(),title:cfg.newTitle,content:'',color:cfg.defaultColor,pinned:false,updated:Date.now()});
  save(); renderNotes(kind);
}
function updateNote(kind, id, patch){
  const n = state[kind].find(x=>x.id===id);
  if(!n) return;
  Object.assign(n,patch,{updated:Date.now()});
  save();
}
function togglePin(kind, id){
  const n = state[kind].find(x=>x.id===id);
  if(!n) return;
  n.pinned = !n.pinned; save(); renderNotes(kind);
}
function deleteNote(kind, id){
  instantDelete({
    from: state[kind],
    predicate: n => n.id === id,
    label: 'Item excluído',
    rerender: () => renderNotes(kind)
  });
}
function changeColor(kind, id, color){
  updateNote(kind, id, {color}); renderNotes(kind);
}
function renderNotes(kind='notes'){
  const cfg = NOTE_KINDS[kind];
  if(!cfg) return;
  const grid = document.getElementById(cfg.grid);
  if(!grid) return;
  const sorted = [...state[kind]].sort((a,b)=>(b.pinned-a.pinned) || (b.updated-a.updated));
  if(!sorted.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;background:var(--surface);border:1px dashed var(--border);border-radius:14px">${cfg.emptyMsg}</div>`;
    return;
  }
  grid.innerHTML = sorted.map(n=>`
    <div class="note ${n.color} ${n.pinned?'pinned':''}">
      <div class="note-header">
        <input class="note-title" value="${escapeAttr(n.title)}" oninput="updateNote('${kind}','${n.id}',{title:this.value})" />
        <div class="note-actions">
          <button class="note-btn" title="${n.pinned?'Desafixar':'Fixar'}" onclick="togglePin('${kind}','${n.id}')">${n.pinned?'📌':'📍'}</button>
          <button class="note-btn" title="Excluir" onclick="deleteNote('${kind}','${n.id}')">✕</button>
        </div>
      </div>
      <textarea class="note-content" placeholder="Escreva aqui..." oninput="updateNote('${kind}','${n.id}',{content:this.value})">${escapeHtml(n.content)}</textarea>
      <div class="color-picker">
        ${NOTE_COLORS.map(c=>`<div class="color-dot ${c} ${n.color===c?'selected':''}" onclick="changeColor('${kind}','${n.id}','${c}')"></div>`).join('')}
      </div>
      <div class="note-footer">
        <span>${new Date(n.updated).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  `).join('');
}

/* =========================================================
   TOGGLES (Kanban unificado + Mentalidade unificada)
   ========================================================= */
let currentKanbanKind = 'pessoal';
function setKanbanKind(k){
  currentKanbanKind = k;
  const p = document.getElementById('kanbanPessoalBoard');
  const pr = document.getElementById('kanbanProfissionalBoard');
  if(p) p.style.display = (k==='pessoal') ? 'flex' : 'none';
  if(pr) pr.style.display = (k==='profissional') ? 'flex' : 'none';
  document.querySelectorAll('.kanban-toggle').forEach(b=>{
    b.classList.toggle('active', b.dataset.kind === k);
  });
  const t = document.getElementById('kanbanPageTitle');
  const s = document.getElementById('kanbanPageSub');
  if(t) t.textContent = k==='pessoal' ? 'Kanban Pessoal 🗂️' : 'Kanban Profissional 💼';
  if(s) s.textContent = k==='pessoal' ? 'Organize tarefas da sua vida pessoal' : 'Acompanhe projetos e entregas do trabalho';
}

let currentMentKind = 'mindset';
function setMentKind(k){
  currentMentKind = k;
  const a = document.getElementById('mindsetGrid');
  const b = document.getElementById('mantrasGrid');
  if(a) a.style.display = (k==='mindset') ? 'grid' : 'none';
  if(b) b.style.display = (k==='mantras') ? 'grid' : 'none';
  document.querySelectorAll('.ment-toggle').forEach(el=>{
    el.classList.toggle('active', el.dataset.kind === k);
  });
  const t = document.getElementById('mentTitle');
  const s = document.getElementById('mentSub');
  const btn = document.getElementById('mentAddBtn');
  if(k==='mindset'){
    if(t) t.textContent = 'Mentalidade 🧘';
    if(s) s.textContent = 'Mindset · princípios, crenças e lembretes mentais';
    if(btn) btn.textContent = '+ Novo Mindset';
  } else {
    if(t) t.textContent = 'Mentalidade 🧘';
    if(s) s.textContent = 'Mantras · afirmações e mantras para repetir';
    if(btn) btn.textContent = '+ Novo Mantra';
  }
}

/* =========================================================
   RASCUNHOS · notepad pessoal proativo
   ========================================================= */
let currentDraftId = null;
let draftsSearch = '';
let draftsSaveTimer = null;

function defaultDrafts(){ return []; }
function newDraft(){
  const d = {
    id:uid(), title:'', content:'', pinned:false,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  state.drafts ||= [];
  state.drafts.unshift(d);
  currentDraftId = d.id;
  save();
  renderDrafts();
  setTimeout(()=>{
    const t = document.querySelector('.editor-title');
    if(t){ t.focus(); }
  }, 60);
}
function selectDraft(id){
  currentDraftId = id;
  renderDrafts();
  setTimeout(()=>{
    const ed = document.querySelector('.editor-content');
    if(ed) ed.focus();
  }, 30);
}
function updateDraft(id, patch){
  const d = state.drafts.find(x=>x.id===id);
  if(!d) return;
  Object.assign(d, patch, { updated: new Date().toISOString() });
  // debounce do save
  clearTimeout(draftsSaveTimer);
  draftsSaveTimer = setTimeout(()=>{
    save();
    const sv = document.querySelector('.editor-saved');
    if(sv){
      sv.classList.add('show');
      setTimeout(()=>sv.classList.remove('show'), 1100);
    }
  }, 350);
  // atualizar cartão na lista sem re-renderizar o editor
  refreshDraftListItem(id);
  // atualizar footer (palavras/chars)
  refreshDraftFooter(id);
}
function refreshDraftListItem(id){
  const d = state.drafts.find(x=>x.id===id);
  const card = document.querySelector(`.draft-card[data-id="${id}"]`);
  if(!d || !card) return;
  const t = card.querySelector('.draft-card-title');
  if(t) t.textContent = d.title || 'Sem título';
  const p = card.querySelector('.draft-card-preview');
  if(p) p.textContent = (d.content||'').slice(0,140) || 'Vazio';
}
function refreshDraftFooter(id){
  const d = state.drafts.find(x=>x.id===id);
  if(!d) return;
  const wc = (d.content||'').trim().split(/\s+/).filter(Boolean).length;
  const chars = (d.content||'').length;
  const wcEl = document.querySelector('.editor-stats .ec-words');
  const chEl = document.querySelector('.editor-stats .ec-chars');
  if(wcEl) wcEl.textContent = wc + ' palavras';
  if(chEl) chEl.textContent = chars + ' caracteres';
}
function togglePinDraft(id){
  const d = state.drafts.find(x=>x.id===id);
  if(!d) return;
  d.pinned = !d.pinned;
  save();
  renderDrafts();
}
function deleteDraft(id){
  const wasCurrent = (currentDraftId === id);
  if(wasCurrent) currentDraftId = null;
  instantDelete({
    from: state.drafts,
    predicate: d => d.id === id,
    label: 'Rascunho excluído',
    rerender: renderDrafts
  });
}
function setDraftsSearch(q){
  draftsSearch = (q||'').toLowerCase().trim();
  renderDraftsList();
}
function exportDrafts(){
  const txt = (state.drafts||[]).map(d=>{
    return `# ${d.title || 'Sem título'}\n` +
      `_${new Date(d.updated).toLocaleString('pt-BR')}_\n\n` +
      (d.content || '') + '\n\n---\n\n';
  }).join('');
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `rascunhos-${todayStr()}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function renderDrafts(){
  renderDraftsList();
  renderDraftsEditor();
}
function renderDraftsList(){
  const el = document.getElementById('draftsList');
  if(!el) return;
  let list = state.drafts || [];
  if(draftsSearch){
    list = list.filter(d=>
      (d.title||'').toLowerCase().includes(draftsSearch) ||
      (d.content||'').toLowerCase().includes(draftsSearch)
    );
  }
  list = [...list].sort((a,b)=>
    (b.pinned-a.pinned) || (b.updated||'').localeCompare(a.updated||'')
  );
  if(!list.length){
    el.innerHTML = `<div class="draft-empty-list">${draftsSearch?'Nada encontrado.':'Nenhum rascunho ainda.<br>Clique em <strong>+ Novo rascunho</strong>!'}</div>`;
    return;
  }
  el.innerHTML = list.map(d=>{
    const active = (d.id === currentDraftId);
    const date = new Date(d.updated).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    const wc = (d.content||'').trim().split(/\s+/).filter(Boolean).length;
    return `
      <div class="draft-card ${active?'active':''}" data-id="${d.id}" onclick="selectDraft('${d.id}')">
        <button class="draft-card-copy draft-copy-btn" onclick="event.stopPropagation();copyDraft('${d.id}',this)" title="Copiar"><span class="dc-ico-default">📋</span><span class="dc-ico-done">✓</span></button>
        <div class="draft-card-head">
          ${d.pinned?'<span class="draft-pin">📌</span>':''}
          <span class="draft-card-title">${escapeHtml(d.title||'Sem título')}</span>
        </div>
        <div class="draft-card-preview">${escapeHtml((d.content||'').slice(0,140) || 'Vazio')}</div>
        <div class="draft-card-meta"><span>${date}</span><span>${wc} palavras</span></div>
      </div>
    `;
  }).join('');
}
function renderDraftsEditor(){
  const el = document.getElementById('draftsEditor');
  if(!el) return;
  const d = currentDraftId ? state.drafts.find(x=>x.id===currentDraftId) : null;
  if(!d){
    el.innerHTML = `
      <div class="drafts-editor-empty">
        <div>
          <div class="ico">✏️</div>
          <div style="font-size:14px;color:var(--text-dim);margin-bottom:8px;font-weight:600">Nenhum rascunho selecionado</div>
          <div style="font-size:12px">Clique em um rascunho à esquerda ou crie um novo.</div>
          <button class="btn btn-primary" onclick="newDraft()" style="margin-top:18px">+ Criar novo rascunho</button>
        </div>
      </div>
    `;
    return;
  }
  const wc = (d.content||'').trim().split(/\s+/).filter(Boolean).length;
  const chars = (d.content||'').length;
  el.innerHTML = `
    <div class="drafts-editor-active">
      <div class="editor-toolbar">
        <input type="text" class="editor-title" value="${escapeAttr(d.title||'')}" placeholder="Título do rascunho..." oninput="updateDraft('${d.id}',{title:this.value})" />
        <span class="editor-saved">✓ salvo</span>
        <button class="btn-icon draft-copy-btn" onclick="copyDraft('${d.id}',this)" title="Copiar conteúdo"><span class="dc-ico-default">📋</span><span class="dc-ico-done">✓</span></button>
        <button class="btn-icon" onclick="togglePinDraft('${d.id}')" title="${d.pinned?'Desafixar':'Fixar no topo'}">${d.pinned?'📌':'📍'}</button>
        <button class="btn-icon" onclick="deleteDraft('${d.id}')" style="color:#ff7a9a" title="Excluir">🗑️</button>
      </div>
      <textarea class="editor-content" placeholder="Comece a escrever..." oninput="updateDraft('${d.id}',{content:this.value})">${escapeHtml(d.content||'')}</textarea>
      <div class="editor-foot">
        <div class="editor-stats"><span class="ec-words">${wc} palavras</span><span class="ec-chars">${chars} caracteres</span></div>
        <span>Criado em ${new Date(d.created).toLocaleDateString('pt-BR')} · Atualizado ${new Date(d.updated).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  `;
}

function copyDraft(id, btn){
  const d = state.drafts.find(x=>x.id===id);
  if(!d) return;
  const text = (d.content||'').trim() || (d.title||'').trim();
  if(!text){
    if(typeof cortexToast === 'function') cortexToast({msg:'Rascunho vazio',type:'warn',duration:1800});
    return;
  }
  const flash = (el) => {
    if(!el) return;
    el.classList.add('is-copied');
    setTimeout(()=>el.classList.remove('is-copied'), 1200);
  };
  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(_){}
    document.body.removeChild(ta);
  };
  const done = () => {
    flash(btn);
    if(typeof cortexToast === 'function') cortexToast({msg:'✓ Rascunho copiado',type:'success',duration:1600});
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>{ fallbackCopy(); done(); });
  } else {
    fallbackCopy(); done();
  }
}

// Atalho global: Ctrl+Alt+N cria novo rascunho
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.altKey && (e.key === 'n' || e.key === 'N')){
    e.preventDefault();
    // navegar para drafts se não estiver lá
    const active = document.querySelector('.page.active');
    if(!active || active.dataset.page !== 'drafts'){
      document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page==='drafts'));
      document.querySelectorAll('.page').forEach(s=>s.classList.toggle('active', s.dataset.page==='drafts'));
    }
    newDraft();
  }
});

